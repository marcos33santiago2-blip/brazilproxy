import { createContext, useContext, useState, type ReactNode } from "react";
import { PROXIES, TRANSACTIONS, type Proxy } from "./mock-data";

type ClientStore = {
  balance: number;
  addBalance: (n: number) => void;
  spend: (n: number) => boolean;
  proxies: Proxy[];
  setProxies: (fn: (p: Proxy[]) => Proxy[]) => void;
  transactions: typeof TRANSACTIONS;
  pixOpen: boolean;
  setPixOpen: (o: boolean) => void;
};

const Ctx = createContext<ClientStore | null>(null);

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(342.6);
  const [proxies, setProxies] = useState(PROXIES);
  const [transactions, setTransactions] = useState(TRANSACTIONS);
  const [pixOpen, setPixOpen] = useState(false);

  const addBalance = (n: number) => {
    setBalance((b) => Math.round((b + n) * 100) / 100);
    setTransactions((t) => [{ id: `#PX-${48212 + t.length}`, date: "agora", desc: "Recarga via Pix", amount: n, type: "credito" as const }, ...t]);
  };
  const spend = (n: number) => {
    if (n > balance) return false;
    setBalance((b) => Math.round((b - n) * 100) / 100);
    return true;
  };

  return (
    <Ctx.Provider value={{ balance, addBalance, spend, proxies, setProxies, transactions, pixOpen, setPixOpen }}>{children}</Ctx.Provider>
  );
}

export function useClientStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useClientStore must be used within ClientStoreProvider");
  return c;
}
