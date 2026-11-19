import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, Network, Plus, Wallet } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { AreaTrend } from "@/components/dashboard/Charts";
import { ProxyTable } from "@/components/dashboard/ProxyTable";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/client-store";
import { useCurrency } from "@/lib/currency";
import { USAGE_30D } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cliente/")({ component: Overview });

function Overview() {
  const { balance, proxies, transactions, setPixOpen, profile } = useClientStore();
  const { format } = useCurrency();
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const online = proxies.filter((p) => p.status === "online").length;
  const expiring = proxies.filter((p) => p.daysLeft <= 5).length;
  const totalGb = USAGE_30D.reduce((s, d) => s + d.gb, 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName} 👋`}
        description="Aqui está um resumo da sua operação nos últimos 30 dias."
        actions={
          <>
            <Button variant="outline" onClick={() => setPixOpen(true)}>
              <Wallet /> Adicionar saldo
            </Button>
            <Button variant="brand" asChild>
              <Link to="/cliente/comprar">
                <Plus /> Comprar proxies
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo disponível" value={format(balance)} icon={Wallet} hint="Recarga instantânea via Pix" />
        <StatCard label="Proxies ativos" value={`${online}/${proxies.length}`} icon={Network} tone="cyan" hint="online agora" />
        <StatCard label="Tráfego (30 dias)" value={`${totalGb.toFixed(1)} GB`} icon={Activity} tone="success" trend={12} hint="vs. mês anterior" />
        <StatCard label="Expirando em 5 dias" value={expiring} icon={CalendarClock} tone="amber" hint="renove para não perder o IP" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Consumo de tráfego" description="GB trafegados por dia">
          <div className="p-4">
            <AreaTrend data={USAGE_30D} x="day" series={[{ key: "gb", label: "GB", color: "var(--primary)" }]} format={(v) => `${v}`} />
          </div>
        </Panel>
        <Panel
          title="Últimas transações"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setPixOpen(true)}>
              Recarregar
            </Button>
          }
        >
          <ul className="divide-y">
            {transactions.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("grid size-8 place-items-center rounded-lg", t.type === "credito" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                  {t.type === "credito" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.desc}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {t.id} · {t.date}
                  </div>
                </div>
                <span className={cn("font-mono text-sm font-semibold", t.amount > 0 && "text-success")}>
                  {t.amount > 0 ? "+" : "−"}
                  {format(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        className="mt-6"
        title="Proxies recentes"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cliente/proxies">
              Ver todos <ArrowRight />
            </Link>
          </Button>
        }
      >
        <ProxyTable limit={5} compact />
      </Panel>
    </>
  );
}
