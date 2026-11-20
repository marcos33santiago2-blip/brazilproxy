import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/proxy/purchase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePurchaseRequest } = await import("@/server/purchase-proxy");
        return handlePurchaseRequest(request);
      },
    },
  },
});
