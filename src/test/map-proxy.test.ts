import { describe, expect, it } from "vitest";
import {
  isExpiringWithin,
  mapProxyRecord,
  mapTransaction,
  parseProfile,
  parseProxyRecord,
  parseTransaction,
} from "@/lib/map-proxy";

describe("parseProfile", () => {
  it("accepts a profile row and a numeric balance stored as text", () => {
    expect(
      parseProfile({
        id: "u1",
        full_name: "Ana Lima",
        email: "ana@example.com",
        role: "reseller",
        balance: "15.50",
      }),
    ).toEqual({
      id: "u1",
      full_name: "Ana Lima",
      email: "ana@example.com",
      role: "reseller",
      balance: 15.5,
    });
  });

  it("rejects an unknown role", () => {
    expect(
      parseProfile({ id: "u1", full_name: "Ana", email: "a@b.c", role: "owner", balance: 1 }),
    ).toBeNull();
  });
});

describe("mapProxyRecord", () => {
  it("maps host to the IP shown in the table", () => {
    const parsed = parseProxyRecord({
      id: "p1",
      user_id: "u1",
      host: "189.1.2.3",
      port: "8080",
      username: "bp",
      password: "secret",
      gb_limit: "10",
      gb_used: 1,
      status: "active",
      country: "Brasil",
      city: "Recife",
      protocol: "socks5",
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const view = mapProxyRecord(parsed);
    expect(view).toMatchObject({
      ip: "189.1.2.3",
      port: 8080,
      user: "bp",
      pass: "secret",
      protocol: "SOCKS5",
      status: "online",
      flag: "🇧🇷",
      city: "Recife",
      daysLeft: 0,
      expires: "—",
      gbUsed: 1,
      expiresAt: null,
    });
  });
});

describe("isExpiringWithin", () => {
  const now = Date.parse("2026-11-20T12:00:00.000Z");

  it("ignores proxies without an expiry date", () => {
    expect(isExpiringWithin(null, 5, now)).toBe(false);
    expect(isExpiringWithin(undefined, 5, now)).toBe(false);
  });

  it("counts only dates inside the next five days", () => {
    expect(isExpiringWithin("2026-11-23T12:00:00.000Z", 5, now)).toBe(true);
    expect(isExpiringWithin("2026-11-26T12:00:00.000Z", 5, now)).toBe(false);
    expect(isExpiringWithin("2026-11-19T12:00:00.000Z", 5, now)).toBe(false);
  });
});

describe("mapTransaction", () => {
  it("keeps a negative amount as a debit", () => {
    const parsed = parseTransaction({
      id: "t1",
      user_id: "u1",
      amount: -20,
      payment_method: "balance",
      status: "paid",
      description: "10x ISP",
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(mapTransaction(parsed)).toMatchObject({
      amount: -20,
      type: "debito",
      desc: "10x ISP",
      date: "—",
    });
  });
});
