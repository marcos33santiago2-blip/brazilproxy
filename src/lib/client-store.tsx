import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useActiveProxies } from "@/hooks/use-proxies";
import { useProfile } from "@/hooks/use-profile";
import { useTransactions } from "@/hooks/use-transactions";
import { syncProfileFromSession } from "@/lib/auth";
import type { LedgerEntry, Proxy } from "@/lib/mock-data";
import type { Profile } from "@/types/database";

const EMPTY_PROFILE: Profile = {
  id: "",
  full_name: "",
  email: "",
  role: "client",
  balance: 0,
};

type ClientStore = {
  profile: Profile;
  balance: number;
  addBalance: (n: number) => void;
  spend: (n: number) => boolean;
  proxies: Proxy[];
  setProxies: (fn: (p: Proxy[]) => Proxy[]) => void;
  transactions: LedgerEntry[];
  /** Drops local purchase overrides so the next read comes from Supabase. */
  syncFromServer: () => void;
  /** True after the browser has loaded the signed-in profile, proxies and transactions. */
  ready: boolean;
  pixOpen: boolean;
  setPixOpen: (o: boolean) => void;
};

const Ctx = createContext<ClientStore | null>(null);

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const profileQuery = useProfile();
  const profile = profileQuery.data ?? EMPTY_PROFILE;

  useEffect(() => {
    let cancelled = false;
    void syncProfileFromSession().then(() => {
      if (!cancelled) void queryClient.invalidateQueries({ queryKey: ["profile"] });
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);
  const proxyQuery = useActiveProxies();
  const txQuery = useTransactions();
  const remoteProxies = proxyQuery.data ?? [];
  const remoteTransactions = txQuery.data ?? [];
  const ready = profileQuery.isFetchedAfterMount && proxyQuery.isFetchedAfterMount && txQuery.isFetchedAfterMount;

  const [balanceOverride, setBalanceOverride] = useState<number | null>(null);
  const [proxyOverride, setProxyOverride] = useState<Proxy[] | null>(null);
  const [txOverride, setTxOverride] = useState<LedgerEntry[] | null>(null);
  const [pixOpen, setPixOpen] = useState(false);

  const balance = balanceOverride ?? profile.balance;
  const proxies = proxyOverride ?? remoteProxies;
  const transactions = txOverride ?? remoteTransactions;

  const balanceRef = useRef(balance);
  const proxiesRef = useRef(proxies);
  const transactionsRef = useRef(transactions);
  balanceRef.current = balance;
  proxiesRef.current = proxies;
  transactionsRef.current = transactions;

  const addBalance = (n: number) => {
    setBalanceOverride(Math.round((balanceRef.current + n) * 100) / 100);
    setTxOverride([
      {
        id: `#PX-${48212 + transactionsRef.current.length}`,
        date: "agora",
        desc: "Recarga via Pix",
        amount: n,
        type: "credito",
      },
      ...transactionsRef.current,
    ]);
  };

  const spend = (n: number) => {
    if (n > balanceRef.current) return false;
    setBalanceOverride(Math.round((balanceRef.current - n) * 100) / 100);
    return true;
  };

  const setProxies = (fn: (p: Proxy[]) => Proxy[]) => {
    setProxyOverride(fn(proxiesRef.current));
  };

  const syncFromServer = () => {
    setBalanceOverride(null);
    setProxyOverride(null);
    setTxOverride(null);
  };

  return (
    <Ctx.Provider
      value={{
        profile,
        balance,
        addBalance,
        spend,
        proxies,
        setProxies,
        transactions,
        syncFromServer,
        ready,
        pixOpen,
        setPixOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useClientStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useClientStore must be used within ClientStoreProvider");
  return c;
}
