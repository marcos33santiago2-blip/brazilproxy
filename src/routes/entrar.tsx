import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

type Search = { modo?: "entrar" | "cadastro" };

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    modo: s.modo === "cadastro" ? "cadastro" : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Entrar ou criar conta — ${BRAND.name}` },
      { name: "description", content: `Acesse sua conta ${BRAND.name} ou crie uma nova em segundos.` },
      { property: "og:title", content: `Entrar — ${BRAND.name}` },
      { property: "og:description", content: "Acesse seus proxies, saldo e painel de revenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const { modo } = Route.useSearch();
  const [mode, setMode] = useState<"entrar" | "cadastro">(modo ?? "entrar");
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-night p-12 text-night-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-grid-night" />
        <Logo tone="night" className="relative" />
        <div className="relative mt-auto">
          <h2 className="text-4xl font-extrabold leading-tight">Seus proxies, seu saldo e sua revenda em um só lugar.</h2>
          <div className="mt-8 rounded-xl border border-night-border bg-night-2/70 p-4 font-mono text-sm">
            <div className="text-night-muted">// proxy ativo</div>
            <div>189.44.12.201:8080:bp_user482:••••••••</div>
            <div className="mt-1 text-success">● online · São Paulo, BR · 18 ms</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface p-6 pb-24">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <div className="flex rounded-xl bg-muted p-1">
            {(["entrar", "cadastro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all", mode === m ? "bg-card shadow-soft" : "text-muted-foreground")}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success(mode === "entrar" ? "Bem-vindo de volta!" : "Conta criada com sucesso!");
              navigate({ to: "/cliente" });
            }}
          >
            {mode === "cadastro" && (
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" required placeholder="Seu nome" className="h-11 bg-card" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required placeholder="voce@email.com" className="h-11 bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required placeholder="••••••••" className="h-11 bg-card" />
            </div>
            <Button variant="brand" size="xl" type="submit" className="w-full">
              {mode === "entrar" ? "Entrar" : "Criar minha conta"}
            </Button>
          </form>
          <div className="mt-8">
            <div className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Ou acesse a demonstração como</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { to: "/cliente" as const, label: "Cliente", icon: LayoutDashboard },
                { to: "/revendedor" as const, label: "Revendedor", icon: Briefcase },
                { to: "/admin" as const, label: "Admin", icon: Shield },
              ].map((d) => (
                <Link key={d.to} to={d.to} className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-xs font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <d.icon className="size-4 text-primary" /> {d.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
