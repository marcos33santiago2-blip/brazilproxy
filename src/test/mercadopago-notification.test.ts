import { describe, expect, it } from "vitest";
import { resolveMercadoPagoNotificationUrl } from "@/server/mercadopago";

const PRODUCTION = "https://brazilproxy.vercel.app/api/webhook/mercadopago";

describe("Mercado Pago notification URL", () => {
  it("uses the production webhook when the request origin is local", () => {
    expect(resolveMercadoPagoNotificationUrl({ requestOrigin: "http://localhost:8080" })).toBe(
      PRODUCTION,
    );
    expect(resolveMercadoPagoNotificationUrl({ requestOrigin: "http://127.0.0.1:8080" })).toBe(
      PRODUCTION,
    );
    expect(resolveMercadoPagoNotificationUrl({ requestOrigin: "http://192.168.0.12:8080" })).toBe(
      PRODUCTION,
    );
    expect(resolveMercadoPagoNotificationUrl({ appUrl: "https://localhost:8080" })).toBe(
      PRODUCTION,
    );
  });

  it("keeps a public https URL and ignores a local APP_URL", () => {
    expect(resolveMercadoPagoNotificationUrl({ appUrl: "https://brazilproxy.com.br" })).toBe(
      "https://brazilproxy.com.br/api/webhook/mercadopago",
    );
    expect(
      resolveMercadoPagoNotificationUrl({
        appUrl: "http://localhost:8080",
        vercelUrl: "brazilproxy.vercel.app",
      }),
    ).toBe(PRODUCTION);
  });
});
