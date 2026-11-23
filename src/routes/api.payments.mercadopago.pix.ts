import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/payments/mercadopago/pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePixCharge } = await import("@/server/mercadopago");
        return handlePixCharge(request);
      },
    },
  },
});
