import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceGrid } from "@/components/site/landing/PriceGrid";
import { ProxyTabs } from "@/components/site/landing/ProxyTabs";
import { QuickCalculator } from "@/components/site/landing/QuickCalculator";
import { CurrencyProvider } from "@/lib/currency";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

function renderHome(ui: ReactNode) {
  return render(<CurrencyProvider>{ui}</CurrencyProvider>);
}

describe("homepage products", () => {
  it("keeps the quick purchase focused on ISP and datacenter, with the Pix banner", () => {
    renderHome(<QuickCalculator />);

    expect(screen.getByRole("button", { name: /ISP Estático Residencial \(IP Fixo\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Datacenter IPv4/ })).toBeInTheDocument();
    expect(screen.getByText("IPs reais de Vivo, Claro e Tim")).toBeInTheDocument();
    expect(screen.getByText("Pague com Pix ou Cartão • Liberação instantânea em segundos")).toBeInTheDocument();
    expect(screen.getByText("O pagamento é confirmado e o proxy é liberado na hora.")).toBeInTheDocument();
    expect(screen.queryByText(/Datacenter IPv6|Móvel 4G|Residencial Rotativo/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Datacenter IPv4/ }));
    expect(screen.getByText(/Uso ideal: monitoramento, testes e automações de volume/)).toBeInTheDocument();
  });

  it("shows only the two flagship products in the showcase", () => {
    renderHome(<ProxyTabs />);

    expect(screen.getByRole("heading", { name: "ISP Estático Residencial (IP Fixo)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Datacenter IPv4" })).toBeInTheDocument();
    expect(screen.getAllByText(/Vivo, Claro e Tim/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pague com Pix ou Cartão • Liberação instantânea em segundos")).toHaveLength(2);
    expect(screen.queryByText(/Datacenter IPv6|Móvel 4G|Residencial Rotativo/)).not.toBeInTheDocument();
  });

  it("limits the price grid to the same two products", () => {
    renderHome(<PriceGrid />);

    expect(screen.getByRole("button", { name: "ISP Estático" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Datacenter IPv4" })).toBeInTheDocument();
    expect(screen.queryByText(/Datacenter IPv6|Móvel 4G|Residencial Rotativo/)).not.toBeInTheDocument();
    expect(screen.getByText("Pague com Pix ou Cartão • Liberação instantânea em segundos")).toBeInTheDocument();
  });
});
