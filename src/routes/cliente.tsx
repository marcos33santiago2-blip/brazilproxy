import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BookOpen, Code2, FileDown, Headphones, LayoutGrid, Network, Plus, Wallet } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { PixDialog } from "@/components/brand/PixDialog";
import { ClientStoreProvider, useClientStore } from "@/lib/client-store";
import { useCurrency } from "@/lib/currency";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: `Área do Cliente — ${BRAND.name}` },
      { name: "description", content: "Gerencie seus proxies, saldo, listas e integrações." },
      { property: "og:title", content: `Área do Cliente — ${BRAND.name}` },
      { property: "og:description", content: "Seus proxies ativos, recarga via Pix e API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClienteLayout,
});

const NAV: NavItem[] = [
  { to: "/cliente", label: "Visão Geral", icon: LayoutGrid, exact: true },
  { to: "/cliente/proxies", label: "Meus Proxies Ativos", icon: Network },
  { to: "/cliente/comprar", label: "Comprar / Adicionar Saldo", icon: Plus },
  { to: "/cliente/gerador", label: "Gerador de Listas", icon: FileDown },
  { to: "/cliente/api", label: "API & Integrações", icon: Code2 },
  { to: "/cliente/tutoriais", label: "Tutoriais Rápidos", icon: BookOpen },
  { to: "/cliente/suporte", label: "Suporte", icon: Headphones },
];

function ClienteLayout() {
  return (
    <ClientStoreProvider>
      <Shell />
    </ClientStoreProvider>
  );
}

function Shell() {
  const { balance, setPixOpen, pixOpen, addBalance, profile, proxies, ready } = useClientStore();
  const { format } = useCurrency();
  const activeProxies = proxies.filter((proxy) => proxy.status === "online").length;
  const nav = NAV.map((item) =>
    item.to === "/cliente/proxies" && ready && activeProxies > 0 ? { ...item, badge: String(activeProxies) } : item,
  );
  return (
    <DashboardShell
      area="Área do Cliente"
      nav={nav}
      user={{ name: profile.full_name, email: profile.email }}
      topRight={
        <button
          onClick={() => setPixOpen(true)}
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-soft transition-all hover:border-primary/40"
        >
          <Wallet className="size-4 text-primary" />
          <span className="font-mono font-semibold">{format(balance)}</span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">+ Pix</span>
        </button>
      }
      sidebarFooter={
        <div className="rounded-xl bg-gradient-brand p-4 text-primary-foreground">
          <div className="text-xs opacity-80">Saldo disponível</div>
          <div className="font-display text-xl font-extrabold">{format(balance)}</div>
          <button onClick={() => setPixOpen(true)} className="mt-3 w-full rounded-lg bg-night/25 py-1.5 text-xs font-semibold backdrop-blur hover:bg-night/40">
            Adicionar saldo via Pix
          </button>
        </div>
      }
    >
      <Outlet />
      <PixDialog open={pixOpen} onOpenChange={setPixOpen} onPaid={addBalance} />
    </DashboardShell>
  );
}
