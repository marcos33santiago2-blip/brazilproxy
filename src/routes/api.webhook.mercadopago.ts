import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhook/mercadopago")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleMercadoPagoWebhook } = await import("@/server/mercadopago");
        return handleMercadoPagoWebhook(request);
      },
      POST: async ({ request }) => {
        const { handleMercadoPagoWebhook } = await import("@/server/mercadopago");
        return handleMercadoPagoWebhook(request);
      },
    },
  },
});
