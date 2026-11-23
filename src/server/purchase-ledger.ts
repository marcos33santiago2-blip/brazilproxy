import type { SupabaseClient } from "@supabase/supabase-js";

export type LedgerStatus = "pending" | "paid" | "failed";

export type StoredProxy = {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  expiresAt: string | null;
};

export type LedgerSnapshot = {
  orderId: string;
  transactionId: string;
  balance: number;
  status: LedgerStatus;
  alreadyExists: boolean;
  upstreamOrderId: string | null;
  proxies: StoredProxy[];
};

export type ClaimResult = {
  claimed: boolean;
  reason: string;
  upstreamOrderId: string | null;
};

export class LedgerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "LedgerError";
    this.code = code;
    this.status = status;
  }
}

export type DebitPurchaseInput = {
  userId: string;
  amount: number;
  externalId: string;
  description: string;
  serviceId: string;
  planId: string;
  quantity: number;
  country: string;
  protocol: string;
};

export type ProxyInsert = {
  host: string;
  port: number;
  username: string;
  password: string;
  gb_limit: number;
  gb_used: number;
  status: string;
  protocol: string;
  proxy_type: string;
  country: string;
  expires_at: string;
};

type RpcError = { message?: string } | null;

export async function debitPurchase(
  admin: SupabaseClient,
  input: DebitPurchaseInput,
): Promise<LedgerSnapshot> {
  const { data, error } = await admin.rpc("debit_purchase_balance", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_external_id: input.externalId,
    p_description: input.description,
    p_service_id: input.serviceId,
    p_plan_id: input.planId,
    p_quantity: input.quantity,
    p_country: input.country,
    p_protocol: input.protocol,
  });
  if (error) throw mapRpcError(error);
  const snapshot = parseLedgerResult(data);
  if (!snapshot) throw new LedgerError("Não foi possível atualizar o saldo.", "ledger_failed", 500);
  return snapshot;
}

export async function claimPurchase(admin: SupabaseClient, orderId: string): Promise<ClaimResult> {
  const { data, error } = await admin.rpc("claim_purchase_fulfillment", { p_order_id: orderId });
  if (error) throw mapRpcError(error);
  const claim = parseClaimResult(data);
  if (!claim) throw new LedgerError("Não foi possível reservar o pedido.", "ledger_failed", 500);
  return claim;
}

export async function recordUpstreamOrder(
  admin: SupabaseClient,
  orderId: string,
  upstreamOrderId: string,
): Promise<void> {
  const { error } = await admin.rpc("record_upstream_order", {
    p_order_id: orderId,
    p_upstream_order_id: upstreamOrderId,
  });
  if (error) throw mapRpcError(error);
}

export async function completePurchase(
  admin: SupabaseClient,
  orderId: string,
  upstreamOrderId: string,
  proxies: ProxyInsert[],
  description: string,
): Promise<LedgerSnapshot> {
  const { data, error } = await admin.rpc("complete_purchase", {
    p_order_id: orderId,
    p_upstream_order_id: upstreamOrderId,
    p_proxies: proxies,
    p_description: description,
  });
  if (error) throw mapRpcError(error);
  const snapshot = parseLedgerResult(data);
  if (!snapshot) throw new LedgerError("Não foi possível gravar o proxy.", "ledger_failed", 500);
  return snapshot;
}

export async function refundPurchase(admin: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await admin.rpc("refund_purchase", { p_order_id: orderId });
  if (error) throw mapRpcError(error);
}

export function parseLedgerResult(value: unknown): LedgerSnapshot | null {
  if (!isRecord(value)) return null;
  const orderId = readString(value, "order_id");
  const transactionId = readString(value, "transaction_id");
  const balance = readNumber(value, "balance");
  const status = readStatus(value["status"]);
  if (!orderId || !transactionId || balance === null || !status) return null;
  const upstream = readString(value, "upstream_order_id");
  return {
    orderId,
    transactionId,
    balance,
    status,
    alreadyExists: value["already_exists"] === true,
    upstreamOrderId: upstream,
    proxies: readProxies(value["proxies"]),
  };
}

export function parseClaimResult(value: unknown): ClaimResult | null {
  if (!isRecord(value) || typeof value["claimed"] !== "boolean") return null;
  const reason = readString(value, "reason") ?? "";
  return {
    claimed: value["claimed"] === true,
    reason,
    upstreamOrderId: readString(value, "upstream_order_id"),
  };
}

export function mapRpcError(error: RpcError): LedgerError {
  const message = error?.message ?? "";
  if (message.includes("Could not find the function") || message.includes("schema cache")) {
    return new LedgerError(
      "As funções de saldo ainda não foram criadas no Supabase.",
      "ledger_missing",
      500,
    );
  }
  if (message.includes("insufficient_balance"))
    return new LedgerError("Saldo insuficiente", "insufficient_balance", 400);
  if (message.includes("profile_not_found"))
    return new LedgerError("Perfil não encontrado.", "profile_not_found", 400);
  if (
    message.includes("invalid_amount") ||
    message.includes("invalid_request") ||
    message.includes("invalid_proxy") ||
    message.includes("proxies_required")
  ) {
    return new LedgerError("Pedido inválido.", "invalid_request", 400);
  }
  if (message.includes("idempotency_conflict")) {
    return new LedgerError("Esta chave de idempotência já foi usada.", "idempotency_conflict", 409);
  }
  if (message.includes("order_failed"))
    return new LedgerError("Esta compra já foi estornada.", "order_failed", 409);
  if (message.includes("refund_blocked") || message.includes("upstream_conflict")) {
    return new LedgerError(
      "O pedido upstream já existe e o saldo não foi estornado.",
      "refund_blocked",
      409,
    );
  }
  if (message.includes("order_not_found"))
    return new LedgerError("Pedido não encontrado.", "order_not_found", 404);
  return new LedgerError("Não foi possível atualizar o saldo.", "ledger_failed", 500);
}

function readProxies(value: unknown): StoredProxy[] {
  if (!Array.isArray(value)) return [];
  return value.map(readStoredProxy).filter((item): item is StoredProxy => item !== null);
}

function readStoredProxy(value: unknown): StoredProxy | null {
  if (!isRecord(value)) return null;
  const host = readString(value, "host");
  const port = readNumber(value, "port");
  const username = readString(value, "username");
  const password = readString(value, "password");
  if (!host || port === null || !username || !password) return null;
  return {
    id: readString(value, "id") ?? "",
    host,
    port,
    username,
    password,
    expiresAt: readString(value, "expires_at"),
  };
}

function readStatus(value: unknown): LedgerStatus | null {
  if (value === "pending" || value === "paid" || value === "failed") return value;
  return null;
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
