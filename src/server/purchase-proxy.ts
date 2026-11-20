import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCountry, getProxyType, isProxyTypeId, orderTotal, type ProxyTypeId } from "@/lib/pricing";

const PROXY_COLUMNS =
  "id, user_id, host, port, username, password, gb_limit, gb_used, status, protocol, proxy_type, country, expires_at";

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

export function isMockMode(): boolean {
  return process.env.PROXY_CHEAP_MOCK_MODE === "true";
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
  const protocol = protocolRaw === "SOCKS5" ? "SOCKS5" : protocolRaw === "HTTP" ? "HTTP" : undefined;
  if (!userId || !serviceId || !planId || !country || quantity === null || priceBrl === null) return null;
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

  const expected = catalogPrice(body);
  if (expected === null || Math.abs(expected - body.priceBrl) > 0.009) {
    return json({ success: false, error: "Valor do pedido não confere." }, 400);
  }

  const supabase = userSupabase(token);
  if (!supabase) return json({ success: false, error: "Supabase não está configurado." }, 500);

  const userResult = await supabase.auth.getUser(token);
  const user = userResult.data.user;
  if (userResult.error || !user) return json({ success: false, error: "Sessão expirada. Entre novamente." }, 401);
  if (user.id !== body.userId) return json({ success: false, error: "Utilizador não autorizado." }, 403);

  const balanceResult = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
  if (balanceResult.error) return json({ success: false, error: "Não foi possível ler o saldo." }, 500);
  const balance = readNumber((balanceResult.data ?? {}) as Record<string, unknown>, "balance") ?? 0;
  if (balance < body.priceBrl) return json({ success: false, error: "Saldo insuficiente" }, 400);

  const serviceId = body.serviceId as ProxyTypeId;
  const type = getProxyType(serviceId);
  let provisioned: { orderId: string; connections: Connection[] };
  try {
    provisioned = isMockMode()
      ? await mockProvision(body.quantity, type.unit)
      : await liveProvision(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível provisionar o proxy.";
    return json({ success: false, error: message }, 502);
  }

  const nextBalance = round2(balance - body.priceBrl);
  const debit = await supabase
    .from("profiles")
    .update({ balance: nextBalance })
    .eq("id", user.id)
    .gte("balance", body.priceBrl)
    .select("balance");
  if (debit.error) return json({ success: false, error: "Não foi possível debitar o saldo." }, 500);
  if (!debit.data?.length) return json({ success: false, error: "Saldo insuficiente" }, 400);

  const expiresAt = expiryFromPlan(body.planId);
  const countryName = getCountry(body.country).name;
  const rows = provisioned.connections.map((connection) => ({
    user_id: user.id,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    gb_limit: type.unit === "GB" ? body.quantity : 0,
    gb_used: 0,
    status: "active",
    protocol: body.protocol ?? "HTTP",
    proxy_type: type.short,
    country: countryName,
    expires_at: expiresAt,
  }));

  const inserted = await supabase.from("proxies").insert(rows).select(PROXY_COLUMNS);
  if (inserted.error || !inserted.data?.length) {
    await supabase.from("profiles").update({ balance }).eq("id", user.id);
    return json({ success: false, error: inserted.error?.message ?? "Não foi possível gravar o proxy." }, 500);
  }

  const description = `Compra ${type.name} · ${countryName} · pedido ${provisioned.orderId}`;
  const transaction = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: round2(-body.priceBrl),
    payment_method: "balance",
    status: "paid",
    description,
  });
  if (transaction.error) {
    console.warn("[brazilproxy] Proxy entregue, mas a transação não foi gravada.", transaction.error.message);
  }

  const first = inserted.data[0] as Record<string, unknown>;
  const proxy = toProvisioned(first, provisioned.orderId, body.serviceId, countryName, expiresAt);
  return json({ success: true, proxy });
}

async function mockProvision(quantity: number, unit: "GB" | "IP"): Promise<{ orderId: string; connections: Connection[] }> {
  await delay(800);
  return { orderId: `mock_${Date.now()}`, connections: buildMockConnections(quantity, unit) };
}

async function liveProvision(body: PurchaseBody): Promise<{ orderId: string; connections: Connection[] }> {
  const apiKey = process.env.PROXY_CHEAP_API_KEY?.trim() ?? "";
  const apiSecret = process.env.PROXY_CHEAP_API_SECRET?.trim() ?? "";
  if (!apiKey || !apiSecret) throw new Error("Proxy-Cheap não está configurado neste ambiente.");

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Secret": apiSecret,
  };
  const orderResponse = await fetch(`https://api.proxy-cheap.com/v2/order/${encodeURIComponent(body.serviceId)}/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({ planId: body.planId, quantity: body.quantity, country: body.country }),
  });
  const orderPayload = await readJson(orderResponse);
  if (!orderResponse.ok) throw new Error(upstreamMessage(orderPayload) ?? "A Proxy-Cheap recusou o pedido.");
  const orderId = readOrderId(orderPayload);
  if (!orderId) throw new Error("A Proxy-Cheap não devolveu o id do pedido.");

  const detailResponse = await fetch(`https://api.proxy-cheap.com/orders/${encodeURIComponent(orderId)}/proxies`, { headers });
  const detailPayload = await readJson(detailResponse);
  const connections = [...readConnections(detailPayload), ...readConnections(orderPayload)];
  const unique = dedupeConnections(connections);
  if (!detailResponse.ok && unique.length === 0) {
    throw new Error(upstreamMessage(detailPayload) ?? `Pedido ${orderId} criado, mas as credenciais não foram lidas.`);
  }
  if (unique.length === 0) throw new Error(`Pedido ${orderId} não devolveu credenciais de conexão.`);
  return { orderId, connections: unique };
}

function userSupabase(accessToken: string): SupabaseClient | null {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey || url === "https://your-project.supabase.co" || anonKey === "your-anon-key") return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function toProvisioned(
  row: Record<string, unknown>,
  orderId: string,
  serviceId: string,
  country: string,
  expiresAt: string,
): ProvisionedProxy {
  const host = readString(row, "host") ?? "";
  const port = readNumber(row, "port") ?? 0;
  const username = readString(row, "username") ?? "";
  const password = readString(row, "password") ?? "";
  return {
    id: readString(row, "id") ?? "",
    orderId,
    serviceId,
    country,
    host,
    port,
    username,
    password,
    status: "active",
    expiresAt: readString(row, "expires_at") ?? expiresAt,
    connection: `${host}:${port}:${username}:${password}`,
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
  const nested = row["proxy"] && typeof row["proxy"] === "object" ? (row["proxy"] as Record<string, unknown>) : row;
  const host = readString(nested, "host") || readString(nested, "ip") || readString(nested, "hostname");
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
