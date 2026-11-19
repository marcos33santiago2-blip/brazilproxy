import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://your-project.supabase.co";
const PLACEHOLDER_KEY = "your-anon-key";

function configuredCredentials(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey || url === PLACEHOLDER_URL || anonKey === PLACEHOLDER_KEY) return null;
  return { url, anonKey };
}

const credentials = configuredCredentials();

if (!credentials && import.meta.env.MODE !== "test") {
  console.warn(
    "[brazilproxy] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente. Painéis usam dados de demonstração.",
  );
}

export const supabase: SupabaseClient | null = credentials
  ? createClient(credentials.url, credentials.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Browser session only. SSR and a missing client resolve to null so the demo data stays stable. */
export async function currentSessionUser(): Promise<SessionUser | null> {
  if (!supabase || import.meta.env.SSR) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (error || !user) return null;
    let fullName: string | null = null;
    if (isRecord(user.user_metadata)) {
      const raw = user.user_metadata["full_name"];
      if (typeof raw === "string" && raw.trim()) fullName = raw.trim();
    }
    return { id: user.id, email: user.email ?? "", fullName };
  } catch (err) {
    console.warn("[brazilproxy] Não foi possível ler a sessão.", err);
    return null;
  }
}

export async function selectOwnRows(
  table: "proxies" | "transactions",
  columns: string,
  userId: string,
): Promise<{ rows: unknown[]; errorMessage: string | null }> {
  if (!supabase) return { rows: [], errorMessage: "Supabase não configurado" };
  const { data, error } = await supabase.from(table).select(columns).eq("user_id", userId);
  if (error) return { rows: [], errorMessage: error.message };
  return { rows: Array.isArray(data) ? data : [], errorMessage: null };
}
