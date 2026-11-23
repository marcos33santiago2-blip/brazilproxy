import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getCountry,
  getProxyType,
  isProxyTypeId,
  orderTotal,
  type ProxyTypeId,
} from "@/lib/pricing";
import {
  claimPurchase,
  completePurchase,
  debitPurchase,
  LedgerError,
  recordUpstreamOrder,
  refundPurchase,
  type LedgerSnapshot,
  type ProxyInsert,
  type StoredProxy,
} from "@/server/purchase-ledger";
import { supabaseAdmin } from "@/server/supabase-admin";

export type PurchaseBody = {
  userId: string;
  serviceId: string;
  planId: string;
  quantity: number;
  country: string;
  priceBrl: number;
  protocol?: "HTTP" | "SOCKS5";
};

export type ProvisionedProxy = {
  id: string;
  orderId: string;
  serviceId: string;
  country: string;
  host: string;
  port: number;
  username: string;
  password: string;
  status: "active";
  expiresAt: string;
  connection: string;
};

type Connection = { host: string; port: number; username: string; password: string };

export type PurchaseAction =
  "return_paid" | "reject_failed" | "resume_upstream" | "wait" | "provision";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,128}$/;

export function isMockMode(): boolean {
  return process.env.PROXY_CHEAP_MOCK_MODE === "true";
}

/** A repeated purchase key is accepted only when it matches this shape. Empty means the server mints one. */
export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  return IDEMPOTENCY_KEY.test(value) ? value : null;
}

/**
 * Refund only when Proxy-Cheap never issued an order id.
 * An issued id means the upstream order exists, so the local debit stays until that order is fulfilled.
 */
export function shouldRefundAfterUpstreamFailure(orderId: string | null | undefined): boolean {
  return !orderId?.trim();
}

/** Decides the next step from the ledger so a retry cannot place a second upstream order. */
export function purchaseAction(input: {
  status: "pending" | "paid" | "failed";
  upstreamOrderId: string | null;
  claimed: boolean;
}): PurchaseAction {
  if (input.status === "paid") return "return_paid";
  if (input.status === "failed") return "reject_failed";
  if (input.upstreamOrderId?.trim()) return "resume_upstream";
  if (!input.claimed) return "wait";
  return "provision";
}

export function parsePurchaseBody(value: unknown): PurchaseBody | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const userId = readString(row, "userId");
  const serviceId = readString(row, "serviceId");
  const planId = readString(row, "planId");
  const country = readString(row, "country")?.toUpperCase() ?? "";
  const quantity = readNumber(row, "quantity");
  const priceBrl = readNumber(row, "priceBrl");
  const protocolRaw = readString(row, "protocol")?.toUpperCase();
  const protocol =
    protocolRaw === "SOCKS5" ? "SOCKS5" : protocolRaw === "HTTP" ? "HTTP" : undefined;
  if (!userId || !serviceId || !planId || !country || quantity === null || priceBrl === null)
    return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return null;
  if (!Number.isFinite(priceBrl) || priceBrl <= 0) return null;
  return { userId, serviceId, planId, quantity, country, priceBrl: round2(priceBrl), protocol };
}

/** Rejects a client price that does not match the catalog, so the request cannot underpay. */
export function catalogPrice(body: PurchaseBody): number | null {
  if (!isProxyTypeId(body.serviceId)) return null;
  const period = body.planId === "90" ? "90" : body.planId === "30" ? "30" : null;
  if (!period) return null;
  const type = getProxyType(body.serviceId);
  if (body.quantity < type.min || body.quantity > type.max) return null;
  return orderTotal(body.serviceId, body.country, body.quantity, period);
}

export function expiryFromPlan(planId: string, now = Date.now()): string {
  const days = planId === "90" ? 90 : 30;
  return new Date(now + days * 86_400_000).toISOString();
}

export function buildMockConnections(quantity: number, unit: "GB" | "IP"): Connection[] {
  const count = unit === "GB" ? 1 : quantity;
  return Array.from({ length: count }, (_, index) => ({
    host: index === 0 ? "187.45.210.88" : `187.45.${(210 + index) % 250}.${(88 + index) % 250}`,
    port: 8080,
    username: `brpx_${randomToken(8)}`,
    password: `pass_${randomToken(10)}`,
  }));
}

export async function handlePurchaseRequest(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return json({ success: false, error: "Sessão expirada. Entre novamente." }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, error: "Pedido inválido." }, 400);
  }
  const body = parsePurchaseBody(payload);
  if (!body) return json({ success: false, error: "Pedido inválido." }, 400);

  const headerKey = request.headers.get("idempotency-key");
  const idempotencyRaw = headerKey?.trim()
    ? headerKey
    : readString(asRecord(payload), "idempotencyKey");
  const suppliedKey = normalizeIdempotencyKey(idempotencyRaw);
  if (idempotencyRaw?.trim() && !suppliedKey)
    return json({ success: false, error: "Chave de idempotência inválida." }, 400);
  const externalId = suppliedKey ?? crypto.randomUUID();

  const expected = catalogPrice(body);
  if (expected === null || Math.abs(expected - body.priceBrl) > 0.009) {
    return json({ success: false, error: "Valor do pedido não confere." }, 400);
  }

  const userClient = userSupabase(token);
  if (!userClient) return json({ success: false, error: "Supabase não está configurado." }, 500);
  const admin = supabaseAdmin();
  if (!admin)
    return json({ success: false, error: "Supabase administrativo não está configurado." }, 500);

  const userResult = await userClient.auth.getUser(token);
  const user = userResult.data.user;
  if (userResult.error || !user)
    return json({ success: false, error: "Sessão expirada. Entre novamente." }, 401);
  if (user.id !== body.userId)
    return json({ success: false, error: "Utilizador não autorizado." }, 403);

  const serviceId = body.serviceId as ProxyTypeId;
  const type = getProxyType(serviceId);
  const countryName = getCountry(body.country).name;
  const description = `Compra ${type.name} · ${countryName}`;

  const debitInput = {
    userId: user.id,
    amount: body.priceBrl,
    externalId,
    description,
    serviceId: body.serviceId,
    planId: body.planId,
    quantity: body.quantity,
    country: body.country,
    protocol: body.protocol ?? "HTTP",
  };
  let debit: LedgerSnapshot;
  try {
    debit = await debitPurchase(admin, debitInput);
  } catch (error) {
    return ledgerFailure(error);
  }

  const initialAction = purchaseAction({
    status: debit.status,
    upstreamOrderId: debit.upstreamOrderId,
    claimed: false,
  });
  if (initialAction === "return_paid") return paidResponse(debit, body.serviceId, countryName);
  if (initialAction === "reject_failed") {
    return json(
      { success: false, error: "Esta tentativa de compra já falhou. Inicie uma nova compra." },
      409,
    );
  }

  let upstreamOrderId = debit.upstreamOrderId;
  let connections: Connection[] | null = null;

  if (initialAction !== "resume_upstream") {
    let claim;
    try {
      claim = await claimPurchase(admin, debit.orderId);
    } catch (error) {
      return ledgerFailure(error);
    }
    if (claim.reason === "failed") {
      return json(
        { success: false, error: "Esta tentativa de compra já falhou. Inicie uma nova compra." },
        409,
      );
    }
    if (claim.reason === "paid") {
      try {
        return paidResponse(await debitPurchase(admin, debitInput), body.serviceId, countryName);
      } catch (error) {
        return ledgerFailure(error);
      }
    }
    if (claim.upstreamOrderId) upstreamOrderId = claim.upstreamOrderId;
    const claimedAction = purchaseAction({
      status: "pending",
      upstreamOrderId,
      claimed: claim.claimed,
    });
    if (claimedAction === "wait") {
      return json({ success: false, error: "Esta compra já está em andamento." }, 409);
    }
    if (claimedAction === "provision") {
      try {
        if (isMockMode()) {
          const mock = await mockProvision(body.quantity, type.unit);
          upstreamOrderId = mock.orderId;
          connections = mock.connections;
        } else {
          upstreamOrderId = await executeLiveOrder(body);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Não foi possível provisionar o proxy.";
        try {
          await refundPurchase(admin, debit.orderId);
        } catch (refundError) {
          console.error(
            "[brazilproxy] Pedido upstream falhou e o estorno não foi concluído.",
            debit.orderId,
            refundError,
          );
          return json(
            {
              success: false,
              error: "O pedido falhou e o estorno do saldo não foi concluído. Contate o suporte.",
            },
            502,
          );
        }
        return json({ success: false, error: message }, 502);
      }

      if (!upstreamOrderId || shouldRefundAfterUpstreamFailure(upstreamOrderId)) {
        try {
          await refundPurchase(admin, debit.orderId);
        } catch (refundError) {
          console.error(
            "[brazilproxy] Pedido sem id e o estorno não foi concluído.",
            debit.orderId,
            refundError,
          );
          return json(
            {
              success: false,
              error: "O pedido falhou e o estorno do saldo não foi concluído. Contate o suporte.",
            },
            502,
          );
        }
        return json({ success: false, error: "A Proxy-Cheap não devolveu o id do pedido." }, 502);
      }

      try {
        await recordUpstreamOrder(admin, debit.orderId, upstreamOrderId);
      } catch (error) {
        if (
          error instanceof LedgerError &&
          (error.code === "order_failed" || error.code === "refund_blocked")
        ) {
          return ledgerFailure(error);
        }
        console.warn(
          "[brazilproxy] O id upstream ainda não foi gravado. A conclusão do pedido vai tentar de novo.",
          error,
        );
      }
    }
  }

  if (!connections) {
    if (!upstreamOrderId) {
      return json({ success: false, error: "Não foi possível localizar o pedido upstream." }, 502);
    }
    if (isMockMode()) {
      return json(
        {
          success: false,
          error:
            "O pedido já foi enviado e as credenciais ainda não foram gravadas. O saldo permanece debitado.",
        },
        502,
      );
    }
    try {
      connections = await fetchLiveProxies(upstreamOrderId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível ler as credenciais do proxy.";
      console.error(
        "[brazilproxy] Pedido upstream criado sem credenciais.",
        upstreamOrderId,
        message,
      );
      return json(
        {
          success: false,
          error: `${message} O saldo permanece debitado até as credenciais serem gravadas.`,
          upstreamOrderId,
        },
        502,
      );
    }
  }

  const expiresAt = expiryFromPlan(body.planId);
  const settledDescription = `${description} · pedido ${upstreamOrderId}`;
  try {
    const completed = await completePurchase(
      admin,
      debit.orderId,
      upstreamOrderId,
      proxyRows(body, connections, type.unit, type.short, countryName, expiresAt),
      settledDescription,
    );
    return paidResponse(completed, body.serviceId, countryName);
  } catch (error) {
    console.error(
      "[brazilproxy] Proxy comprado na origem, mas a gravação local falhou.",
      upstreamOrderId,
      error,
    );
    if (error instanceof LedgerError && error.status < 500) return ledgerFailure(error);
    return json(
      {
        success: false,
        error: `O pedido ${upstreamOrderId} foi criado na Proxy-Cheap e o saldo permanece debitado, mas as credenciais não foram gravadas.`,
        upstreamOrderId,
      },
      502,
    );
  }
}

async function mockProvision(
  quantity: number,
  unit: "GB" | "IP",
): Promise<{ orderId: string; connections: Connection[] }> {
  await delay(800);
  return { orderId: `mock_${Date.now()}`, connections: buildMockConnections(quantity, unit) };
}

async function executeLiveOrder(body: PurchaseBody): Promise<string> {
  const headers = upstreamHeaders();
  const orderResponse = await fetch(
    `https://api.proxy-cheap.com/v2/order/${encodeURIComponent(body.serviceId)}/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ planId: body.planId, quantity: body.quantity, country: body.country }),
    },
  );
  const orderPayload = await readJson(orderResponse);
  if (!orderResponse.ok)
    throw new Error(upstreamMessage(orderPayload) ?? "A Proxy-Cheap recusou o pedido.");
  const orderId = readOrderId(orderPayload);
  if (!orderId) throw new Error("A Proxy-Cheap não devolveu o id do pedido.");
  return orderId;
}

async function fetchLiveProxies(orderId: string): Promise<Connection[]> {
  const headers = upstreamHeaders();
  const detailResponse = await fetch(
    `https://api.proxy-cheap.com/orders/${encodeURIComponent(orderId)}/proxies`,
    { headers },
  );
  const detailPayload = await readJson(detailResponse);
  const connections = dedupeConnections(readConnections(detailPayload));
  if (!detailResponse.ok && connections.length === 0) {
    throw new Error(
      upstreamMessage(detailPayload) ??
        `Pedido ${orderId} criado, mas as credenciais não foram lidas.`,
    );
  }
  if (connections.length === 0)
    throw new Error(`Pedido ${orderId} não devolveu credenciais de conexão.`);
  return connections;
}

function upstreamHeaders(): Record<string, string> {
  const apiKey = process.env.PROXY_CHEAP_API_KEY?.trim() ?? "";
  const apiSecret = process.env.PROXY_CHEAP_API_SECRET?.trim() ?? "";
  if (!apiKey || !apiSecret) throw new Error("Proxy-Cheap não está configurado neste ambiente.");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Secret": apiSecret,
  };
}

function proxyRows(
  body: PurchaseBody,
  connections: Connection[],
  unit: "GB" | "IP",
  proxyType: string,
  countryName: string,
  expiresAt: string,
): ProxyInsert[] {
  return connections.map((connection) => ({
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    gb_limit: unit === "GB" ? body.quantity : 0,
    gb_used: 0,
    status: "active",
    protocol: body.protocol ?? "HTTP",
    proxy_type: proxyType,
    country: countryName,
    expires_at: expiresAt,
  }));
}

function paidResponse(snapshot: LedgerSnapshot, serviceId: string, countryName: string): Response {
  const first = snapshot.proxies[0];
  if (!first || !snapshot.upstreamOrderId) {
    return json({ success: false, error: "Pedido pago sem credenciais gravadas." }, 500);
  }
  const proxy = toProvisioned(first, snapshot.upstreamOrderId, serviceId, countryName);
  return json({ success: true, proxy });
}

function ledgerFailure(error: unknown): Response {
  if (error instanceof LedgerError)
    return json({ success: false, error: error.message }, error.status);
  console.error("[brazilproxy] Falha ao movimentar o saldo.", error);
  return json({ success: false, error: "Não foi possível atualizar o saldo." }, 500);
}

/** Verifies the caller. Balance writes do not use this client. */
function userSupabase(accessToken: string): SupabaseClient | null {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !anonKey || url === "https://your-project.supabase.co" || anonKey === "your-anon-key")
    return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function toProvisioned(
  row: StoredProxy,
  orderId: string,
  serviceId: string,
  country: string,
): ProvisionedProxy {
  return {
    id: row.id,
    orderId,
    serviceId,
    country,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    status: "active",
    expiresAt: row.expiresAt ?? "",
    connection: `${row.host}:${row.port}:${row.username}:${row.password}`,
  };
}

function readConnections(payload: unknown): Connection[] {
  return readList(payload)
    .map(readConnection)
    .filter((item): item is Connection => item !== null);
}

function readConnection(value: unknown): Connection | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const nested =
    row["proxy"] && typeof row["proxy"] === "object"
      ? (row["proxy"] as Record<string, unknown>)
      : row;
  const host =
    readString(nested, "host") || readString(nested, "ip") || readString(nested, "hostname");
  const port = readNumber(nested, "port");
  const username = readString(nested, "username") || readString(nested, "user");
  const password = readString(nested, "password") || readString(nested, "pass");
  if (!host || port === null || !username || !password) return null;
  return { host, port, username, password };
}

function dedupeConnections(connections: Connection[]): Connection[] {
  const seen = new Set<string>();
  return connections.filter((item) => {
    const key = `${item.host}:${item.port}:${item.username}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  for (const key of ["proxies", "data", "items", "results"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
    if (row[key] && typeof row[key] === "object") {
      const nested = readList(row[key]);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function readOrderId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  for (const key of ["id", "orderId", "order_id"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  if (row["data"] && typeof row["data"] === "object") return readOrderId(row["data"]);
  if (row["order"] && typeof row["order"] === "object") return readOrderId(row["order"]);
  return null;
}

function upstreamMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const message = row["message"] ?? row["error"] ?? row["detail"];
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function randomToken(length: number): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
