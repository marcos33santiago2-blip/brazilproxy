import { useQuery } from "@tanstack/react-query";
import { mapTransaction, parseTransaction } from "@/lib/map-proxy";
import { TRANSACTIONS, type LedgerEntry } from "@/lib/mock-data";
import { currentSessionUser, selectOwnRows } from "@/lib/supabase";

const FULL_COLUMNS = "id, user_id, amount, payment_method, status, description, created_at";
const CORE_COLUMNS = "id, user_id, amount, payment_method, status";

export async function fetchTransactions(): Promise<LedgerEntry[]> {
  const sessionUser = await currentSessionUser();
  if (!sessionUser) return TRANSACTIONS;

  let result = await selectOwnRows("transactions", FULL_COLUMNS, sessionUser.id);
  if (result.errorMessage)
    result = await selectOwnRows("transactions", CORE_COLUMNS, sessionUser.id);
  if (result.errorMessage) {
    console.warn("[brazilproxy] transactions:", result.errorMessage);
    return TRANSACTIONS;
  }

  const mapped: LedgerEntry[] = [];
  for (const row of result.rows) {
    const parsed = parseTransaction(row);
    if (parsed) mapped.push(mapTransaction(parsed));
  }
  return mapped;
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    initialData: TRANSACTIONS,
    refetchOnWindowFocus: false,
  });
}
