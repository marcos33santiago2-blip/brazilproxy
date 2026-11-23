import { MercadoPagoConfig, MercadoPagoError, Payment } from "mercadopago";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/server/supabase-admin";

type PaymentResponse = Awaited<ReturnType<Payment["get"]>>;

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 20_000;

export type PixCharge = {
  paymentId: string;
  status: string;
  amount: number;
  qrCode: string;
  qrCodeBase64: string;
};

export type CardCharge = {
  paymentId: string;
  status: string;
  amount: number;
  statusDetail: string | null;
};

type SessionUser = { id: string; email: string };

export function mercadoPagoConfigured(): boolean {
  return mercadoPagoAccessToken() !== null;
}

export async function handlePixCharge(request: Request): Promise<Response> {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson(request);
  const amount = readAmount(body);
  const description = readDescription(body) ?? "Recarga de saldo BrazilProxy";
  if (amount === null)
    return json({ success: false, error: "Informe um valor entre R$ 10 e R$ 20.000." }, 400);
  if (!user.email)
    return json({ success: false, error: "Sua conta precisa de um e-mail para gerar o Pix." }, 400);

  try {
    await assertServiceKey();
    const charge = await createPixCharge({
      userId: user.id,
      email: user.email,
      amount,
      description,
      notificationUrl: notificationUrl(request),
    });
    return json({ success: true, ...charge });
  } catch (error) {
    return paymentFailure(error);
  }
}

export async function handleCardCharge(request: Request): Promise<Response> {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson(request);
  const amount = readAmount(body);
  const token = readString(body, "token");
  const paymentMethodId = readString(body, "paymentMethodId")?.toLowerCase() ?? "";
  const description = readDescription(body) ?? "Recarga de saldo BrazilProxy";
  const cpf = digits(readString(body, "cpf") ?? "");
  const installments = readInstallments(body);
  const issuerId = readString(body, "issuerId");
  if (amount === null)
    return json({ success: false, error: "Informe um valor entre R$ 10 e R$ 20.000." }, 400);
  if (!token || token.length < 8 || token.length > 256)
    return json({ success: false, error: "Não foi possível tokenizar o cartão." }, 400);
  if (!/^[a-z0-9_]{2,30}$/.test(paymentMethodId))
    return json({ success: false, error: "Bandeira do cartão não reconhecida." }, 400);
  if (cpf.length !== 11) return json({ success: false, error: "Informe o CPF do titular." }, 400);
  if (!user.email)
    return json(
      { success: false, error: "Sua conta precisa de um e-mail para pagar com cartão." },
      400,
    );
  if (hasRawCard(body))
    return json(
      { success: false, error: "Os dados do cartão devem ser tokenizados no navegador." },
      400,
    );

  try {
    await assertServiceKey();
    const charge = await createCardCharge({
      userId: user.id,
      email: user.email,
      amount,
      description,
      token,
      paymentMethodId,
      installments,
      issuerId,
      cpf,
      notificationUrl: notificationUrl(request),
    });
    return json({ success: true, ...charge });
  } catch (error) {
    return paymentFailure(error);
  }
}

export async function handlePaymentStatus(request: Request): Promise<Response> {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const paymentId = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!/^\d{1,30}$/.test(paymentId))
    return json({ success: false, error: "Pagamento inválido." }, 400);
  const admin = supabaseAdmin();
  if (!admin)
    return json({ success: false, error: "Supabase administrativo não está configurado." }, 500);
  const owned = await admin
    .from("transactions")
    .select("user_id")
    .eq("external_id", externalId(paymentId))
    .maybeSingle();
  if (owned.error)
    return json({ success: false, error: "Não foi possível consultar o pagamento." }, 500);
  const ownerId = readString((owned.data ?? null) as Record<string, unknown> | null, "user_id");
  if (ownerId !== user.id) return json({ success: false, error: "Pagamento não encontrado." }, 404);
  try {
    const settled = await settleMercadoPagoPayment(paymentId);
    return json({ success: true, status: settled.status, credited: settled.credited });
  } catch (error) {
    return paymentFailure(error);
  }
}

export async function handleMercadoPagoWebhook(request: Request): Promise<Response> {
  if (request.method === "GET") return json({ ok: true });
  const paymentId = await webhookPaymentId(request);
  if (!paymentId) return json({ ok: true });
  try {
    await settleMercadoPagoPayment(paymentId);
    return json({ ok: true });
  } catch (error) {
    console.error("[brazilproxy] Webhook do Mercado Pago não concluiu a baixa.", paymentId, error);
    return json({ ok: false }, 500);
  }
}

export async function createPixCharge(input: {
  userId: string;
  email: string;
  amount: number;
  description: string;
  notificationUrl: string | null;
}): Promise<PixCharge> {
  const payment = await mercadoPagoPayment();
  const created = await payment.create({
    body: {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.email },
      external_reference: input.userId,
      metadata: { user_id: input.userId },
      ...notificationField(input.notificationUrl),
    },
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  });
  const paymentId = readPaymentId(created);
  const qr = readPixData(created);
  if (!paymentId || !qr.qrCode) throw new Error("O Mercado Pago não devolveu o Pix.");
  await registerPending({
    userId: input.userId,
    paymentId,
    amount: input.amount,
    description: input.description,
    paymentMethod: "pix",
  });
  return {
    paymentId,
    status: created.status ?? "pending",
    amount: input.amount,
    qrCode: qr.qrCode,
    qrCodeBase64: qr.qrCodeBase64,
  };
}

export async function createCardCharge(input: {
  userId: string;
  email: string;
  amount: number;
  description: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId: string | null;
  cpf: string;
  notificationUrl: string | null;
}): Promise<CardCharge> {
  const payment = await mercadoPagoPayment();
  const created = await payment.create({
    body: {
      transaction_amount: input.amount,
      token: input.token,
      description: input.description,
      installments: input.installments,
      payment_method_id: input.paymentMethodId,
      ...(input.issuerId ? { issuer_id: Number(input.issuerId) } : {}),
      payer: {
        email: input.email,
        identification: { type: "CPF", number: input.cpf },
      },
      external_reference: input.userId,
      metadata: { user_id: input.userId },
      ...notificationField(input.notificationUrl),
    },
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  });
  const paymentId = readPaymentId(created);
  if (!paymentId) throw new Error("O Mercado Pago não devolveu o pagamento.");
  await registerPending({
    userId: input.userId,
    paymentId,
    amount: input.amount,
    description: input.description,
    paymentMethod: "card",
  });
  const settled = await settleMercadoPagoPayment(paymentId);
  return {
    paymentId,
    status: settled.status,
    amount: input.amount,
    statusDetail: created.status_detail ?? null,
  };
}

export async function settleMercadoPagoPayment(
  paymentId: string,
): Promise<{ status: string; credited: boolean }> {
  const payment = await mercadoPagoPayment();
  const remote = await payment.get({ id: paymentId });
  const external = externalId(paymentId);
  const admin = requireAdmin();
  const existing = await admin
    .from("transactions")
    .select("user_id, amount, status")
    .eq("external_id", external)
    .maybeSingle();
  if (existing.error) throw new Error("Não foi possível ler o pagamento local.");
  if (!existing.data) {
    if (metadataUser(remote)) throw new Error("Cobrança ainda não registrada.");
    return { status: remote.status ?? "unknown", credited: false };
  }

  const row = existing.data as Record<string, unknown>;
  const storedAmount = readNumber(row, "amount");
  const storedUser = readString(row, "user_id");
  const remoteAmount =
    typeof remote.transaction_amount === "number" ? remote.transaction_amount : null;
  const remoteUser = metadataUser(remote);
  if (
    storedAmount === null ||
    remoteAmount === null ||
    Math.abs(storedAmount - remoteAmount) > 0.009
  ) {
    throw new Error("O valor aprovado não confere com a cobrança.");
  }
  if (remoteUser && storedUser && remoteUser !== storedUser) {
    throw new Error("O pagamento não pertence a esta cobrança.");
  }

  const next = settlementStatus(remote.status);
  if (!next) return { status: remote.status ?? "pending", credited: false };
  const { error } = await admin.rpc("settle_payment", { p_external_id: external, p_status: next });
  if (error) throw new Error(error.message || "Não foi possível dar baixa no pagamento.");
  return { status: remote.status ?? next, credited: next === "paid" };
}

async function registerPending(input: {
  userId: string;
  paymentId: string;
  amount: number;
  description: string;
  paymentMethod: "pix" | "card";
}): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.rpc("register_pending_payment", {
    p_user_id: input.userId,
    p_external_id: externalId(input.paymentId),
    p_amount: input.amount,
    p_description: input.description,
    p_payment_method: input.paymentMethod,
  });
  if (error) {
    logExternalFailure("supabase", error);
    throw new Error(error.message || "Não foi possível registrar a cobrança.");
  }
}

async function mercadoPagoPayment(): Promise<Payment> {
  if (typeof window !== "undefined")
    throw new Error("O Mercado Pago só pode ser usado no servidor.");
  const token = mercadoPagoAccessToken();
  if (!token) throw new Error("Mercado Pago não está configurado neste ambiente.");
  return new Payment(new MercadoPagoConfig({ accessToken: token }));
}

function mercadoPagoAccessToken(): string | null {
  const token = readEnv("MP_ACCESS_TOKEN");
  if (!token || token === "your-access-token") return null;
  return token;
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

function requireAdmin(): SupabaseClient {
  const admin = supabaseAdmin();
  if (!admin) throw new Error("Supabase administrativo não está configurado.");
  return admin;
}

async function assertServiceKey(): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (!error) return;
  logExternalFailure("supabase", error);
  if (/invalid api key/i.test(error.message)) {
    throw new Error(
      "A chave administrativa do Supabase foi recusada. Em Project Settings → API, abra View legacy API keys e cole a service_role que começa com eyJ.",
    );
  }
  if (/permission denied for table/i.test(error.message)) {
    throw new Error(
      "A chave service_role está ativa, mas o banco ainda não liberou a tabela profiles. Rode scripts/supabase-balance-security.sql e scripts/supabase-mercadopago-credit.sql no SQL Editor.",
    );
  }
  throw new Error(error.message || "Não foi possível validar o Supabase administrativo.");
}

async function requireUser(request: Request): Promise<SessionUser | Response> {
  const token = bearerToken(request);
  if (!token) return json({ success: false, error: "Entre na sua conta para pagar." }, 401);
  const client = userSupabase(token);
  if (!client) return json({ success: false, error: "Supabase não está configurado." }, 500);
  const result = await client.auth.getUser(token);
  const user = result.data.user;
  if (result.error || !user)
    return json({ success: false, error: "Sessão expirada. Entre novamente." }, 401);
  return { id: user.id, email: user.email ?? "" };
}

function userSupabase(accessToken: string): SupabaseClient | null {
  const url = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
  const anonKey = readEnv("VITE_SUPABASE_ANON_KEY") || readEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey || url === "https://your-project.supabase.co" || anonKey === "your-anon-key")
    return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const PRODUCTION_NOTIFICATION_URL = "https://brazilproxy.vercel.app/api/webhook/mercadopago";

function notificationUrl(request: Request): string | null {
  return resolveMercadoPagoNotificationUrl({
    appUrl: readEnv("APP_URL"),
    vercelUrl: readEnv("VERCEL_URL"),
    requestOrigin: new URL(request.url).origin,
  });
}

/** Mercado Pago rejects localhost, private IPs and plain HTTP. Those charges omit the field or use the public HTTPS fallback. */
export function resolveMercadoPagoNotificationUrl(input: {
  appUrl?: string;
  vercelUrl?: string;
  requestOrigin?: string;
}): string | null {
  const vercelHost = (input.vercelUrl ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const candidates = [
    input.appUrl,
    vercelHost ? `https://${vercelHost}` : undefined,
    input.requestOrigin,
    PRODUCTION_NOTIFICATION_URL,
  ];
  for (const candidate of candidates) {
    const url = publicWebhookUrl(candidate);
    if (url) return url;
  }
  return null;
}

function notificationField(
  url: string | null,
): { notification_url: string } | Record<string, never> {
  return url ? { notification_url: url } : {};
}

function publicWebhookUrl(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!isPublicHostname(url.hostname)) return null;
  const path = url.pathname === "/" ? "/api/webhook/mercadopago" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${path}`;
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return false;
  return !isPrivateIpv4(host);
}

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const parts = [match[1], match[2], match[3], match[4]].map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part > 255)) return false;
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return a === 192 && b === 168;
}

function externalId(paymentId: string): string {
  return `mp:${paymentId}`;
}

function settlementStatus(status: string | undefined): "paid" | "failed" | null {
  if (status === "approved") return "paid";
  if (
    status === "rejected" ||
    status === "cancelled" ||
    status === "refunded" ||
    status === "charged_back"
  )
    return "failed";
  return null;
}

function metadataUser(payment: PaymentResponse): string | null {
  const metadata = payment.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)["user_id"];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readPaymentId(payment: PaymentResponse): string | null {
  const id = payment.id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

function readPixData(payment: PaymentResponse): { qrCode: string; qrCodeBase64: string } {
  const data = payment.point_of_interaction?.transaction_data;
  return {
    qrCode: data?.qr_code?.trim() ?? "",
    qrCodeBase64: data?.qr_code_base64?.trim() ?? "",
  };
}

async function webhookPaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("data.id") || url.searchParams.get("id");
  let fromBody: unknown = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = body["data"];
    if (data && typeof data === "object") fromBody = (data as Record<string, unknown>)["id"];
    if (!fromBody) fromBody = body["id"];
  } catch {
    fromBody = null;
  }
  const raw = String(fromQuery || fromBody || "").trim();
  return /^\d{1,30}$/.test(raw) ? raw : null;
}

function readAmount(body: Record<string, unknown> | null): number | null {
  const amount = readNumber(body, "amount");
  if (amount === null) return null;
  const rounded = Math.round(amount * 100) / 100;
  if (rounded < MIN_AMOUNT || rounded > MAX_AMOUNT) return null;
  return rounded;
}

function readInstallments(body: Record<string, unknown> | null): number {
  const value = readNumber(body, "installments");
  if (value === null || !Number.isInteger(value) || value < 1 || value > 12) return 1;
  return value;
}

function readDescription(body: Record<string, unknown> | null): string | null {
  const value = readString(body, "description");
  if (!value) return null;
  return value.slice(0, 180);
}

function hasRawCard(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  return ["cardNumber", "securityCode", "cvv", "cardholderName"].some(
    (key) => typeof body[key] === "string" && body[key],
  );
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readString(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(row: Record<string, unknown> | null, key: string): number | null {
  const value = row?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function paymentFailure(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Não foi possível concluir o pagamento.";
  if (error instanceof MercadoPagoError) logExternalFailure("mercadopago", error);
  else if (!(error instanceof Error) || !/chave administrativa do Supabase/i.test(message)) {
    logExternalFailure("payment", error);
  }
  const status = /não está configurado|Supabase administrativo|chave administrativa/i.test(message)
    ? 500
    : 502;
  return json({ success: false, error: message }, status);
}

function logExternalFailure(source: "supabase" | "mercadopago" | "payment", error: unknown): void {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const status = record["status"] ?? record["code"] ?? null;
  const message =
    typeof record["message"] === "string"
      ? record["message"]
      : error instanceof Error
        ? error.message
        : "Erro sem mensagem.";
  const hint = typeof record["hint"] === "string" ? record["hint"] : null;
  console.error("[brazilproxy] Falha ao criar pagamento.", { source, status, message, hint });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
