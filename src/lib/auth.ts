import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

export type AuthResult =
  | { ok: true; role: UserRole }
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; message: string };

/** Signed-in home. Client, reseller and admin share the client panel until the other areas have routes. */
export function panelForRole(role: UserRole): "/cliente" {
  switch (role) {
    case "client":
    case "reseller":
    case "admin":
      return "/cliente";
  }
}

export function authErrorMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (text.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (text.includes("user already registered") || text.includes("already been registered")) return "Já existe uma conta com esse e-mail.";
  if (text.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (text.includes("rate limit") || text.includes("too many")) return "Muitas tentativas. Espere um pouco e tente de novo.";
  return "Não foi possível concluir. Tente novamente.";
}

function readRole(row: unknown): UserRole | null {
  if (typeof row !== "object" || row === null) return null;
  const role = (row as Record<string, unknown>)["role"];
  if (role === "client" || role === "reseller" || role === "admin") return role;
  return null;
}

function metaString(user: User, key: string): string | null {
  const meta = user.user_metadata;
  if (typeof meta !== "object" || meta === null) return null;
  const raw = (meta as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function fullNameOf(user: User, fallback: string): string {
  return metaString(user, "full_name") || metaString(user, "name") || fallback.trim() || user.email || "Cliente";
}

function emailOf(user: User): string {
  return user.email || metaString(user, "email") || "";
}

/** Creates the profile row when auth succeeded and the table has no row yet. */
export async function ensureProfile(user: User, fullName: string): Promise<UserRole> {
  if (!supabase) return "client";
  const name = fullName.trim() || fullNameOf(user, emailOf(user));
  const email = emailOf(user);

  const existing = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!existing.error) {
    const role = readRole(existing.data);
    if (role) return role;
  }

  const inserted = await supabase.from("profiles").insert({
    id: user.id,
    full_name: name,
    email,
    role: "client",
    balance: 0,
  });
  if (inserted.error && inserted.error.code !== "23505") {
    console.warn("[brazilproxy] Não foi possível criar o perfil.", inserted.error.message);
  }
  return "client";
}

/** Google (and e-mail confirmation) must return to the origin that is actually open, including its port. */
export function authReturnUrl(): string {
  return `${window.location.origin}${panelForRole("client")}`;
}

export function signedOutUrl(): string {
  return `${window.location.origin}/entrar`;
}

export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "O Supabase não está configurado neste ambiente." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authReturnUrl() },
  });
  if (error) return { ok: false, message: authErrorMessage(error.message) };
  return { ok: true };
}

/** Inserts public.profiles on the first sign-in, including Google, using the provider name and email. */
export async function syncProfileFromSession(): Promise<void> {
  if (!supabase || import.meta.env.SSR) return;
  const { data, error } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (error || !user) return;
  await ensureProfile(user, fullNameOf(user, emailOf(user)));
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "O Supabase não está configurado neste ambiente." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { ok: false, message: authErrorMessage(error?.message ?? "") };
  const role = await ensureProfile(data.user, fullNameOf(data.user, email));
  return { ok: true, role };
}

export async function signUpWithPassword(input: { email: string; password: string; fullName: string }): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "O Supabase não está configurado neste ambiente." };
  const email = input.email.trim();
  const fullName = input.fullName.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: authReturnUrl(),
    },
  });
  if (error || !data.user) return { ok: false, message: authErrorMessage(error?.message ?? "") };
  if (data.user.identities?.length === 0) return { ok: false, message: "Já existe uma conta com esse e-mail." };
  if (!data.session) return { ok: true, needsEmailConfirmation: true };
  const role = await ensureProfile(data.user, fullName);
  return { ok: true, role };
}

export async function clearSession(queryClient: QueryClient): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn("[brazilproxy] Não foi possível encerrar a sessão.", error.message);
  }
  await queryClient.removeQueries({ queryKey: ["profile"] });
  await queryClient.removeQueries({ queryKey: ["proxies"] });
  await queryClient.removeQueries({ queryKey: ["transactions"] });
  if (typeof window !== "undefined") window.location.assign(signedOutUrl());
}
