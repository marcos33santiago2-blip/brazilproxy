import { describe, expect, it } from "vitest";
import { orderTotal } from "@/lib/pricing";
import { mapRpcError, parseLedgerResult } from "@/server/purchase-ledger";
import {
  buildMockConnections,
  catalogPrice,
  expiryFromPlan,
  normalizeIdempotencyKey,
  parsePurchaseBody,
  purchaseAction,
  shouldRefundAfterUpstreamFailure,
} from "@/server/purchase-proxy";

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

  it("accepts an idempotency key and rejects a short or spaced one", () => {
    expect(normalizeIdempotencyKey("  order_12345678  ")).toBe("order_12345678");
    expect(normalizeIdempotencyKey("")).toBeNull();
    expect(normalizeIdempotencyKey("short")).toBeNull();
    expect(normalizeIdempotencyKey("has space!!")).toBeNull();
  });

  it("refunds only when the upstream order was never issued", () => {
    expect(shouldRefundAfterUpstreamFailure(null)).toBe(true);
    expect(shouldRefundAfterUpstreamFailure("  ")).toBe(true);
    expect(shouldRefundAfterUpstreamFailure("pc_100")).toBe(false);
  });

  it("does not provision again after the upstream order id is known", () => {
    expect(purchaseAction({ status: "paid", upstreamOrderId: "pc_1", claimed: false })).toBe(
      "return_paid",
    );
    expect(purchaseAction({ status: "failed", upstreamOrderId: null, claimed: true })).toBe(
      "reject_failed",
    );
    expect(purchaseAction({ status: "pending", upstreamOrderId: "pc_1", claimed: true })).toBe(
      "resume_upstream",
    );
    expect(purchaseAction({ status: "pending", upstreamOrderId: null, claimed: false })).toBe(
      "wait",
    );
    expect(purchaseAction({ status: "pending", upstreamOrderId: null, claimed: true })).toBe(
      "provision",
    );
  });
});

describe("purchase ledger", () => {
  it("reads a paid snapshot and a balance stored as text", () => {
    const snapshot = parseLedgerResult({
      order_id: "order-1",
      transaction_id: "tx-1",
      balance: "12.50",
      status: "paid",
      already_exists: true,
      upstream_order_id: "pc_9",
      proxies: [
        {
          id: "px-1",
          host: "1.2.3.4",
          port: "8080",
          username: "u",
          password: "p",
          expires_at: "2026-12-20T12:00:00.000Z",
        },
      ],
    });
    expect(snapshot).toMatchObject({
      orderId: "order-1",
      balance: 12.5,
      status: "paid",
      alreadyExists: true,
      upstreamOrderId: "pc_9",
    });
    expect(snapshot?.proxies[0]).toMatchObject({ port: 8080, host: "1.2.3.4" });
  });

  it("maps an insufficient balance error to a client-visible 400", () => {
    const error = mapRpcError({ message: "insufficient_balance" });
    expect(error.status).toBe(400);
    expect(error.message.toLowerCase()).toContain("saldo");
  });
});
