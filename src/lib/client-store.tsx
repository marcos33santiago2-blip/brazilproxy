import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useActiveProxies } from "@/hooks/use-proxies";
import { useProfile } from "@/hooks/use-profile";
import { useTransactions } from "@/hooks/use-transactions";
import type { LedgerEntry, Proxy } from "@/lib/mock-data";
import type { Profile } from "@/types/database";

type ClientStore = {
  profile: Profile;
  balance: number;
  addBalance: (n: number) => void;
  spend: (n: number) => boolean;
  proxies: Proxy[];
  setProxies: (fn: (p: Proxy[]) => Proxy[]) => void;
  transactions: LedgerEntry[];
  pixOpen: boolean;
  setPixOpen: (o: boolean) => void;
};

const Ctx = createContext<ClientStore | null>(null);

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const { data: remoteProxies } = useActiveProxies();
  const { data: remoteTransactions } = useTransactions();

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
