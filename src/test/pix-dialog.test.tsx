import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "session-token" } } }),
    },
  },
}));

import { PixDialog } from "@/components/brand/PixDialog";

describe("checkout dialog", () => {
  it("scrolls inside the viewport and offers Pix and credit card", async () => {
    render(<PixDialog open onOpenChange={() => undefined} />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("max-h-[90vh]");
    expect(dialog.className).toContain("overflow-y-auto");
    expect(screen.queryByRole("button", { name: /Simular pagamento/ })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Gerar Pix/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pagar com Cartão de Crédito" }));

    expect(screen.getByText("Número do cartão")).toBeInTheDocument();
    expect(screen.getByText("Validade")).toBeInTheDocument();
    expect(screen.getByText("CVV")).toBeInTheDocument();
    expect(screen.getByText("Nome do titular")).toBeInTheDocument();
    expect(screen.getByText("CPF do titular")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pagar .* no cartão/ })).toBeInTheDocument();
  });
});
