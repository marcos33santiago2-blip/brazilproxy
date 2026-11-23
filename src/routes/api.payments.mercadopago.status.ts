import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/payments/mercadopago/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handlePaymentStatus } = await import("@/server/mercadopago");
        return handlePaymentStatus(request);
      },
    },
  },
});
