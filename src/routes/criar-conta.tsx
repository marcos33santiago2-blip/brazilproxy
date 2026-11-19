import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/criar-conta")({
  head: () => ({
    meta: [
      { title: `Criar conta — ${BRAND.name}` },
      { name: "description", content: `Crie sua conta ${BRAND.name} e acesse proxies, saldo e revenda.` },
      { property: "og:title", content: `Criar conta — ${BRAND.name}` },
      { property: "og:description", content: "Cadastro em segundos para comprar proxies e revender." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CriarContaPage,
});

function CriarContaPage() {
  return <AuthScreen mode="cadastro" />;
}
