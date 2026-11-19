import { describe, expect, it } from "vitest";
import { RESELLER_LEVELS, wholesalePrice, getProxyType, resellerProfit, CHILD_PANEL_FEE } from "@/lib/pricing";

describe("Revenda", () => {
  it("nenhum nível de revendedor passa de 60% de desconto", () => {
    expect(Math.max(...RESELLER_LEVELS.map((l) => l.discount))).toBe(0.6);
  });

  it("nível Ouro paga 40% do preço de varejo (60% de desconto)", () => {
    const retail = getProxyType("residencial").basePrice;
    expect(wholesalePrice("residencial", "ouro")).toBeCloseTo(retail * 0.4, 2);
  });

  it("lucro do Painel Filho desconta a mensalidade do painel", () => {
    const a = resellerProfit({ typeId: "ipv4", level: "prata", qty: 100, sellPrice: 7.9, childPanel: false });
    const b = resellerProfit({ typeId: "ipv4", level: "prata", qty: 100, sellPrice: 7.9, childPanel: true });
    expect(a.profit - b.profit).toBeCloseTo(CHILD_PANEL_FEE, 2);
  });
});
