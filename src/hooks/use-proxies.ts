import { useQuery } from "@tanstack/react-query";
import { mapProxyRecord, parseProxyRecord } from "@/lib/map-proxy";
import type { Proxy } from "@/lib/mock-data";
import { currentSessionUser, selectOwnRows } from "@/lib/supabase";

const FULL_COLUMNS =
  "id, user_id, host, port, username, password, gb_limit, gb_used, status, protocol, proxy_type, country, city, expires_at";
const CORE_COLUMNS = "id, user_id, host, port, username, password, gb_limit, gb_used, status";

export async function fetchActiveProxies(): Promise<Proxy[]> {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) return [];

  let result = await selectOwnRows("proxies", FULL_COLUMNS, sessionUser.id);
  if (result.errorMessage) result = await selectOwnRows("proxies", CORE_COLUMNS, sessionUser.id);
  if (result.errorMessage) {
    console.warn("[brazilproxy] proxies:", result.errorMessage);
    return [];
  }

  const mapped: Proxy[] = [];
  for (const row of result.rows) {
    const parsed = parseProxyRecord(row);
    if (parsed) mapped.push(mapProxyRecord(parsed));
  }
  return mapped;
}

export function useActiveProxies() {
  return useQuery({
    queryKey: ["proxies"],
    queryFn: fetchActiveProxies,
    refetchOnWindowFocus: false,
  });
}
