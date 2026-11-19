import { createContext, useContext, useState, type ReactNode } from "react";

export type CurrencyCode = "BRL" | "USD";

/** Demo exchange rate BRL -> USD. Replace with a live rate when integrating. */
export const USD_RATE = 5.4;

type Ctx = { currency: CurrencyCode; setCurrency: (c: CurrencyCode) => void; format: (brl: number) => string };

const CurrencyContext = createContext<Ctx | null>(null);

export function formatMoney(brl: number, currency: CurrencyCode = "BRL") {
  const value = currency === "BRL" ? brl : brl / USD_RATE;
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("BRL");
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format: (n) => formatMoney(n, currency) }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export const brl = (n: number) => formatMoney(n, "BRL");
