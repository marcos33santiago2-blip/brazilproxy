import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { BRAND } from "@/config/brand";

type Search = { modo?: "cadastro" };

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): Search => (s["modo"] === "cadastro" ? { modo: "cadastro" } : {}),
  beforeLoad: ({ search }) => {
    if (search.modo === "cadastro") throw redirect({ to: "/criar-conta" });
  },
  head: () => ({
    meta: [
      { title: `Entrar — ${BRAND.name}` },
      { name: "description", content: `Acesse sua conta ${BRAND.name}.` },
      { property: "og:title", content: `Entrar — ${BRAND.name}` },
      { property: "og:description", content: "Acesse seus proxies, saldo e painel de revenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  return <AuthScreen mode="entrar" />;
}
