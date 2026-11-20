import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, Network, Plus, Wallet } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { ProxyTable } from "@/components/dashboard/ProxyTable";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/client-store";
import { useCurrency } from "@/lib/currency";
import { isExpiringWithin } from "@/lib/map-proxy";
import { cn } from "@/lib/utils";

function formatGb(value: number) {
  if (value <= 0) return "0 GB";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("pt-BR")} GB`;
}

export const Route = createFileRoute("/cliente/")({ component: Overview });

function Overview() {
  const { balance, proxies, transactions, setPixOpen, profile, ready } = useClientStore();
  const { format } = useCurrency();
  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? "";
  const online = proxies.filter((p) => p.status === "online").length;
  const expiring = proxies.filter((p) => isExpiringWithin(p.expiresAt, 5)).length;
  const totalGb = proxies.reduce((sum, proxy) => sum + (proxy.gbUsed ?? 0), 0);
  const recent = transactions.slice(0, 6);

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Olá"}
        description="Aqui está um resumo da sua conta."
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
        <StatCard
          label="Saldo disponível"
          value={ready ? format(balance) : "—"}
          icon={Wallet}
          hint={ready ? "Recarga instantânea via Pix" : "Carregando saldo"}
        />
        <StatCard
          label="Proxies ativos"
          value={ready ? `${online}/${proxies.length}` : "—"}
          icon={Network}
          tone="cyan"
          hint={ready ? (proxies.length === 0 ? "Nenhum proxy ativo" : "online agora") : "Carregando proxies"}
        />
        <StatCard
          label="Tráfego (30 dias)"
          value={ready ? formatGb(totalGb) : "—"}
          icon={Activity}
          tone="success"
          hint={ready ? (totalGb <= 0 ? "Nenhum tráfego registrado" : "consumo acumulado") : "Carregando tráfego"}
        />
        <StatCard
          label="Expirando em 5 dias"
          value={ready ? expiring : "—"}
          icon={CalendarClock}
          tone="amber"
          hint={ready ? (expiring === 0 ? "Nenhum proxy perto do vencimento" : "renove para não perder o IP") : "Carregando vencimentos"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Consumo de tráfego" description="Últimos 30 dias">
          {!ready ? (
            <EmptyPanel title="Carregando consumo…" />
          ) : totalGb <= 0 ? (
            <EmptyPanel title="Nenhum tráfego registrado nos últimos 30 dias" />
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="font-display text-4xl font-extrabold">{formatGb(totalGb)}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Consumo acumulado dos seus proxies. Ainda não há histórico diário para montar a série dos últimos 30 dias.
              </p>
            </div>
          )}
        </Panel>
        <Panel
          title="Últimas transações"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setPixOpen(true)}>
              Recarregar
            </Button>
          }
        >
          {!ready ? (
            <EmptyPanel title="Carregando transações…" />
          ) : recent.length === 0 ? (
            <EmptyPanel
              title="Nenhuma transação encontrada"
              description="Recargas e compras da sua conta aparecem aqui."
              action={
                <Button variant="outline" size="sm" onClick={() => setPixOpen(true)}>
                  Adicionar saldo
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
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
          )}
        </Panel>
      </div>

      <Panel
        className="mt-6"
        title="Proxies recentes"
        actions={
          ready && proxies.length > 0 ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cliente/proxies">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          ) : null
        }
      >
        {!ready ? (
          <EmptyPanel title="Carregando proxies…" />
        ) : proxies.length === 0 ? (
          <EmptyPanel
            title="Você ainda não possui proxies ativos"
            action={
              <Button variant="brand" size="sm" asChild>
                <Link to="/cliente/comprar">Comprar agora</Link>
              </Button>
            }
          />
        ) : (
          <ProxyTable limit={5} compact />
        )}
      </Panel>
    </>
  );
}

function EmptyPanel({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
