import { describe, expect, it } from "vitest";
import { orderTotal } from "@/lib/pricing";
import { buildMockConnections, catalogPrice, expiryFromPlan, parsePurchaseBody } from "@/server/purchase-proxy";

const body = {
  userId: "user-1",
  serviceId: "isp",
  planId: "30",
  quantity: 10,
  country: "BR",
  priceBrl: orderTotal("isp", "BR", 10, "30"),
};

describe("purchase request", () => {
  it("accepts the catalog price and rejects a lower one", () => {
    const parsed = parsePurchaseBody(body);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(catalogPrice(parsed)).toBeCloseTo(body.priceBrl, 2);
    expect(catalogPrice({ ...parsed, priceBrl: 1 })).toBeCloseTo(body.priceBrl, 2);
    expect(Math.abs((catalogPrice(parsed) ?? 0) - 1) > 0.009).toBe(true);
  });

  it("builds one realistic mock credential per IP and a single gateway for GB", () => {
    const ips = buildMockConnections(3, "IP");
    expect(ips[0]).toMatchObject({ host: "187.45.210.88", port: 8080 });
    expect(ips).toHaveLength(3);
    expect(ips[0]?.username.startsWith("brpx_")).toBe(true);
    expect(ips[0]?.password.startsWith("pass_")).toBe(true);
    expect(new Set(ips.map((item) => item.username)).size).toBe(3);
    expect(buildMockConnections(25, "GB")).toHaveLength(1);
  });

  it("expires a 30 day plan in 30 days and a 90 day plan in 90 days", () => {
    const now = Date.parse("2026-11-20T12:00:00.000Z");
    expect(expiryFromPlan("30", now)).toBe("2026-12-20T12:00:00.000Z");
    expect(expiryFromPlan("90", now)).toBe("2027-02-18T12:00:00.000Z");
  });
});
