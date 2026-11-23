import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/payments/mercadopago/card")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCardCharge } = await import("@/server/mercadopago");
        return handleCardCharge(request);
      },
    },
  },
});
