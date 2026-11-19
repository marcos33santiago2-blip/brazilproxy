import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Smartphone, Server, Home, Building2, Network, Globe2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useCurrency } from "@/lib/currency";
import { COUNTRIES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const PRODUCTS = [
  { icon: Home, name: "Residencial Rotativo", desc: "Milhões de IPs reais com rotação" },
  { icon: Building2, name: "ISP Estático", desc: "IP fixo de provedor, ideal p/ contas" },
  { icon: Smartphone, name: "Móvel 4G/5G", desc: "IPs de operadoras, máxima confiança" },
  { icon: Server, name: "Datacenter IPv4", desc: "Velocidade bruta para automação" },
  { icon: Network, name: "Datacenter IPv6", desc: "Escala massiva a baixo custo" },
];

export function CurrencyToggle({ tone = "light" }: { tone?: "light" | "night" }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className={cn("flex rounded-lg p-0.5 text-xs font-semibold", tone === "night" ? "bg-night-foreground/10" : "bg-muted")}>
      {(["BRL", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-md px-2.5 py-1 transition-all",
            currency === c
              ? "bg-card text-foreground shadow-soft"
              : tone === "night"
                ? "text-night-muted hover:text-night-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {c === "BRL" ? "R$ BRL" : "$ USD"}
        </button>
      ))}
    </div>
  );
}

const navLink = "rounded-md px-3 py-2 text-sm font-medium text-night-muted transition-colors hover:text-night-foreground";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-night-border bg-night/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo tone="night" />
        <nav className="hidden items-center lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(navLink, "flex items-center gap-1 outline-none")}>
              Produtos <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2">
              {PRODUCTS.map((p) => (
                <DropdownMenuItem key={p.name} asChild className="cursor-pointer gap-3 rounded-lg p-2.5">
                  <Link to="/" hash="produtos">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                      <p.icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{p.desc}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(navLink, "flex items-center gap-1 outline-none")}>
              Locais <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe2 className="size-3.5" /> 190+ países disponíveis
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COUNTRIES.slice(0, 8).map((c) => (
                <DropdownMenuItem key={c.code} asChild className="cursor-pointer">
                  <Link to="/" hash="precos">
                    <span className="text-base">{c.flag}</span> {c.name}
                    <span className="ml-auto text-xs text-muted-foreground">{c.region}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/" hash="precos" className={navLink}>Preços</Link>
          <Link to="/revenda" className={navLink} activeProps={{ className: "text-night-foreground" }}>
            Revenda / Painel Filho
          </Link>
          <Link to="/" hash="faq" className={navLink}>FAQ</Link>
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <CurrencyToggle tone="night" />
          <Link to="/entrar" className={navLink}>Entrar</Link>
          <Button variant="brand" asChild>
            <Link to="/entrar" search={{ modo: "cadastro" }}>Criar Conta</Link>
          </Button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="night" size="icon" className="ml-auto lg:hidden" aria-label="Abrir menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-1 px-4" onClick={() => setOpen(false)}>
              <Link to="/" hash="produtos" className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">Produtos</Link>
              <Link to="/" hash="precos" className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">Locais & Preços</Link>
              <Link to="/revenda" className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">Revenda / Painel Filho</Link>
              <Link to="/" hash="faq" className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">FAQ</Link>
              <div className="my-3"><CurrencyToggle /></div>
              <Button variant="outline" asChild><Link to="/entrar">Entrar</Link></Button>
              <Button variant="brand" className="mt-2" asChild>
                <Link to="/entrar" search={{ modo: "cadastro" }}>Criar Conta</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
