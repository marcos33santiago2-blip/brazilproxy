import type { LedgerEntry, Proxy, ProxyStatus } from "@/lib/mock-data";
import type {
  Profile,
  ProxyRecord,
  Transaction,
  TransactionStatus,
  UserRole,
} from "@/types/database";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isRole(value: string): value is UserRole {
  return value === "client" || value === "reseller" || value === "admin";
}

export function parseProfile(row: unknown): Profile | null {
  if (!isRecord(row)) return null;
  const id = readString(row, "id");
  const fullName = readString(row, "full_name");
  const email = readString(row, "email");
  const role = readString(row, "role");
  const balance = readNumber(row, "balance");
  if (!id || fullName === null || !email || !role || balance === null || !isRole(role)) return null;
  return { id, full_name: fullName, email, role, balance };
}

function readProtocol(row: Record<string, unknown>): "HTTP" | "SOCKS5" | null {
  const value = readString(row, "protocol")?.toUpperCase();
  if (value === "HTTP" || value === "SOCKS5") return value;
  return null;
}

export function parseProxyRecord(row: unknown): ProxyRecord | null {
  if (!isRecord(row)) return null;
  const id = readString(row, "id");
  const userId = readString(row, "user_id");
  const host = readString(row, "host");
  const port = readNumber(row, "port");
  const username = readString(row, "username");
  const password = readString(row, "password");
  const status = readString(row, "status");
  if (!id || !userId || !host || port === null || username === null || password === null || !status)
    return null;
  return {
    id,
    user_id: userId,
    host,
    port,
    username,
    password,
    gb_limit: readNumber(row, "gb_limit") ?? 0,
    gb_used: readNumber(row, "gb_used") ?? 0,
    status,
    protocol: readProtocol(row),
    proxy_type: readString(row, "proxy_type"),
    country: readString(row, "country"),
    city: readString(row, "city"),
    expires_at: readString(row, "expires_at"),
  };
}

const FLAGS: Record<string, string> = {
  br: "🇧🇷",
  brasil: "🇧🇷",
  brazil: "🇧🇷",
  us: "🇺🇸",
  eua: "🇺🇸",
  "estados unidos": "🇺🇸",
  "united states": "🇺🇸",
  de: "🇩🇪",
  alemanha: "🇩🇪",
  germany: "🇩🇪",
  uk: "🇬🇧",
  gb: "🇬🇧",
  "reino unido": "🇬🇧",
  pt: "🇵🇹",
  portugal: "🇵🇹",
};

function flagFor(country: string): string {
  return FLAGS[country.trim().toLowerCase()] ?? "🌐";
}

function mapStatus(status: string): ProxyStatus {
  const value = status.trim().toLowerCase();
  if (value === "online" || value === "active" || value === "ativo") return "online";
  if (value === "instavel" || value === "unstable" || value === "degraded") return "instavel";
  if (
    value === "offline" ||
    value === "expired" ||
    value === "expirado" ||
    value === "suspended" ||
    value === "suspenso"
  ) {
    return "offline";
  }
  return "online";
}

/** Adapts a database row to the shape `ProxyTable` already renders. */
export function mapProxyRecord(row: ProxyRecord): Proxy {
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const validExpires = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
  const daysLeft = validExpires
    ? Math.max(0, Math.ceil((validExpires.getTime() - Date.now()) / 86_400_000))
    : 0;
  const country = row.country?.trim() || "Brasil";
  return {
    id: row.id,
    ip: row.host,
    port: row.port,
    user: row.username,
    pass: row.password,
    protocol: row.protocol ?? "HTTP",
    type: row.proxy_type?.trim() || "Residencial",
    country,
    flag: flagFor(country),
    city: row.city?.trim() || country,
    expires: validExpires ? validExpires.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—",
    daysLeft,
    status: mapStatus(row.status),
    gbUsed: row.gb_used,
    expiresAt: row.expires_at,
  };
}

/** True when `expires_at` falls inside the next `days`, including today. Missing dates do not count. */
export function isExpiringWithin(expiresAt: string | null | undefined, days: number, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return false;
  const delta = at - now;
  return delta >= 0 && delta <= days * 86_400_000;
}

function parseStatus(value: string | null): TransactionStatus {
  const status = value?.trim().toLowerCase() ?? "";
  if (status === "paid" || status === "pago" || status === "completed" || status === "approved")
    return "paid";
  if (status === "failed" || status === "falhou" || status === "canceled" || status === "cancelled")
    return "failed";
  return "pending";
}

export function parseTransaction(row: unknown): Transaction | null {
  if (!isRecord(row)) return null;
  const id = readString(row, "id");
  const userId = readString(row, "user_id");
  const amount = readNumber(row, "amount");
  const paymentMethod = readString(row, "payment_method");
  if (!id || !userId || amount === null || !paymentMethod) return null;
  return {
    id,
    user_id: userId,
    amount,
    payment_method: paymentMethod,
    status: parseStatus(readString(row, "status")),
    description: readString(row, "description"),
    created_at: readString(row, "created_at"),
  };
}

const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  balance: "saldo",
  card: "cartão",
};

export function mapTransaction(row: Transaction): LedgerEntry {
  const created = row.created_at ? new Date(row.created_at) : null;
  const valid = created && !Number.isNaN(created.getTime()) ? created : null;
  const method = METHOD_LABELS[row.payment_method.trim().toLowerCase()] ?? row.payment_method;
  return {
    id: row.id,
    date: valid
      ? valid.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    desc: row.description?.trim() || `Movimentação via ${method}`,
    amount: row.amount,
    type: row.amount >= 0 ? "credito" : "debito",
  };
}
