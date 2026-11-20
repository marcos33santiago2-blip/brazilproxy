import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { panelForRole, signInWithGoogle, signInWithPassword, signUpWithPassword } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AuthScreen({ mode }: { mode: "entrar" | "cadastro" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("senha") ?? "");
    const fullName = String(form.get("nome") ?? "");
    setPending(true);
    try {
      const result =
        mode === "entrar"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword({ email, password, fullName });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if ("needsEmailConfirmation" in result) {
        toast.success("Conta criada. Confirme o e-mail para entrar.");
        return;
      }
      await queryClient.removeQueries({ queryKey: ["profile"] });
      await queryClient.removeQueries({ queryKey: ["proxies"] });
      await queryClient.removeQueries({ queryKey: ["transactions"] });
      toast.success(mode === "entrar" ? "Bem-vindo de volta!" : "Conta criada com sucesso!");
      await navigate({ to: panelForRole(result.role) });
    } catch (err) {
      console.warn("[brazilproxy] Falha na autenticação.", err);
      toast.error("Não foi possível concluir. Tente novamente.");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        toast.error(result.message);
        setPending(false);
      }
    } catch (err) {
      console.warn("[brazilproxy] Falha no login com Google.", err);
      toast.error("Não foi possível continuar com o Google.");
      setPending(false);
    }
  };

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
      <div className={cn("flex items-center justify-center bg-surface p-6", mode === "cadastro" && "pb-24")}>
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <div className="flex rounded-xl bg-muted p-1">
            <Link
              to="/entrar"
              className={cn("flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-all", mode === "entrar" ? "bg-card shadow-soft" : "text-muted-foreground")}
            >
              Entrar
            </Link>
            <Link
              to="/criar-conta"
              className={cn("flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-all", mode === "cadastro" ? "bg-card shadow-soft" : "text-muted-foreground")}
            >
              Criar conta
            </Link>
          </div>
          <div className="mt-6">
            <Button type="button" variant="outline" size="xl" className="w-full bg-card" disabled={pending} onClick={() => void onGoogle()}>
              <GoogleMark /> Continuar com Google
            </Button>
            <div className="relative my-5" role="separator" aria-label="ou">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-surface px-3 text-muted-foreground">ou</span>
              </div>
            </div>
            <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
              {mode === "cadastro" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" name="nome" required autoComplete="name" placeholder="Seu nome" className="h-11 bg-card" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@email.com" className="h-11 bg-card" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  required
                  {...(mode === "cadastro" ? { minLength: 6 } : {})}
                  autoComplete={mode === "cadastro" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  className="h-11 bg-card"
                />
              </div>
              <Button variant="brand" size="xl" type="submit" className="w-full" disabled={pending}>
                {pending ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar minha conta"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4A7.2 7.2 0 0 1 5 12c0-.8.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
    </svg>
  );
}
