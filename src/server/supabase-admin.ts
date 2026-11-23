import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://your-project.supabase.co";
const PLACEHOLDER_KEY = "your-service-role-key";

/**
 * Service-role client. Server only: the key bypasses RLS and must never be read in browser code.
 * Balance debits, refunds, orders and proxy inserts go through this client.
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("O cliente administrativo do Supabase só pode ser usado no servidor.");
  }

  ensureLocalServerEnv();
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("VITE_SUPABASE_URL");
  const serviceKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || url === PLACEHOLDER_URL || serviceKey === PLACEHOLDER_KEY) return null;
  assertServiceRoleKey(url, serviceKey);

  return createClient(url, serviceKey, {
    global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function assertServiceRoleKey(url: string, serviceKey: string): void {
  const claims = jwtPayload(serviceKey);
  if (!claims || claims.role !== "service_role") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não é a chave service_role. A chave anônima não pode ser usada no backend.",
    );
  }
  const host = new URL(url).hostname;
  if (claims.ref && !host.startsWith(`${claims.ref}.`)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY pertence a outro projeto Supabase.");
  }
}

function jwtPayload(token: string): { role: string | null; ref: string | null } | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const padded = part
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const value = JSON.parse(json) as { role?: unknown; ref?: unknown };
    return {
      role: typeof value.role === "string" ? value.role : null,
      ref: typeof value.ref === "string" ? value.ref : null,
    };
  } catch {
    return null;
  }
}

function readServerEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

/** Vite only copies VITE_ variables into the dev process. Server secrets stay in .env until loaded here. */
function ensureLocalServerEnv(): void {
  if (readServerEnv("SUPABASE_SERVICE_ROLE_KEY")) return;
  const loadEnvFile = (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void })
    .loadEnvFile;
  if (typeof loadEnvFile !== "function") return;
  try {
    loadEnvFile();
  } catch {
    // Hosted environments inject the variables and do not include a .env file.
  }
}
