import { useQuery } from "@tanstack/react-query";
import { parseProfile } from "@/lib/map-proxy";
import { currentSessionUser, supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

const EMPTY_PROFILE: Profile = {
  id: "",
  full_name: "",
  email: "",
  role: "client",
  balance: 0,
};

export async function fetchProfile(): Promise<Profile> {
  const sessionUser = await currentSessionUser();
  if (!sessionUser || !supabase) return EMPTY_PROFILE;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, balance")
    .eq("id", sessionUser.id)
    .maybeSingle();

  if (!error) {
    const parsed = parseProfile(data);
    if (parsed) return parsed;
    if (data) console.warn("[brazilproxy] profiles: linha com formato inesperado.");
  } else {
    console.warn("[brazilproxy] profiles:", error.message);
  }

  return {
    id: sessionUser.id,
    full_name: sessionUser.fullName || sessionUser.email || "Cliente",
    email: sessionUser.email,
    role: "client",
    balance: 0,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    refetchOnWindowFocus: false,
  });
}
