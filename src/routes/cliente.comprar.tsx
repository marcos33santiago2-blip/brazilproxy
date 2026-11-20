import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QrCode, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PixDialog } from "@/components/brand/PixDialog";
import { Segmented } from "@/components/dashboard/ProxyTable";
import { useClientStore } from "@/lib/client-store";
import { useCurrency } from "@/lib/currency";
import { COUNTRIES, PROXY_TYPES, getCountry, getProxyType, orderTotal, quote, type ProxyTypeId } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cliente/comprar")({ component: BuyPage });

function BuyPage() {
  const { balance, profile, setPixOpen, syncFromServer } = useClientStore();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [typeId, setTypeId] = useState<ProxyTypeId>("isp");
  const [country, setCountry] = useState("BR");
  const [qty, setQty] = useState(10);
  const [protocol, setProtocol] = useState<"HTTP" | "SOCKS5">("HTTP");
  const [period, setPeriod] = useState<"30" | "90">("30");
  const [pix, setPix] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const type = getProxyType(typeId);
  const months = period === "90" ? 3 : 1;
  const q = quote(typeId, country, qty);
  const total = orderTotal(typeId, country, qty, period);
  const c = getCountry(country);

  const purchase = async () => {
    if (provisioning) return;
    if (!profile.id) {
      toast.error("Entre na sua conta para comprar.");
      return;
    }
    if (balance < total) {
      toast.error("Saldo insuficiente", {
        description: "Adicione saldo para concluir a compra.",
        action: { label: "Adicionar saldo", onClick: () => setPixOpen(true) },
      });
      return;
    }
    if (!supabase) {
      toast.error("Supabase não está configurado neste ambiente.");
      return;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    setProvisioning(true);
    try {
      const response = await fetch("/api/proxy/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: profile.id,
          serviceId: typeId,
          planId: period,
          quantity: qty,
          country,
          priceBrl: total,
          protocol,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string; proxy?: { connection?: string } } | null;
      if (!response.ok || !payload?.success) {
        const message = payload?.error || "Não foi possível provisionar o proxy.";
        if (response.status === 400 && message.toLowerCase().includes("saldo")) {
          toast.error("Saldo insuficiente", {
            description: "Adicione saldo para concluir a compra.",
            action: { label: "Adicionar saldo", onClick: () => setPixOpen(true) },
          });
        } else {
          toast.error(message);
        }
        return;
      }
      syncFromServer();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["proxies"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Proxy provisionado.", {
        description: payload.proxy?.connection ? `Credenciais: ${payload.proxy.connection}` : "Ele já está em Meus Proxies.",
      });
      await navigate({ to: "/cliente/proxies" });
    } catch (error) {
      console.warn("[brazilproxy] Falha ao comprar proxy.", error);
      toast.error("Não foi possível provisionar o proxy.");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <>
      <PageHeader title="Comprar Proxies / Adicionar Saldo" description="Pague com saldo da conta ou direto via Pix. Entrega automática." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="1. Escolha o produto">
          <div className="space-y-6 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {PROXY_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTypeId(t.id);
                    setQty(t.defaultQty);
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    typeId === t.id ? "border-primary bg-primary-soft ring-1 ring-primary" : "hover:border-primary/40",
                  )}
                >
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {format(t.basePrice)}/{t.unit === "GB" ? "GB" : "IP·mês"}
                  </div>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">País</div>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((x) => <SelectItem key={x.code} value={x.code}>{x.flag} {x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Protocolo</div>
                <Segmented value={protocol} onChange={setProtocol} options={[["HTTP", "HTTP/HTTPS"], ["SOCKS5", "SOCKS5"]]} />
              </div>
              {type.unit === "IP" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Período</div>
                  <Segmented value={period} onChange={setPeriod} options={[["30", "30 dias"], ["90", "90 dias −10%"]]} />
                </div>
              )}
            </div>
            <div>
              <div className="mb-3 flex justify-between text-sm">
                <span className="font-semibold">Quantidade</span>
                <span className="font-mono font-semibold">
                  {qty} {type.unit === "GB" ? "GB" : "IPs"}
                </span>
              </div>
              <Slider value={[qty]} min={type.min} max={type.unit === "GB" ? 200 : type.id === "ipv6" ? 2000 : 250} step={type.step} onValueChange={([v]) => setQty(v)} />
            </div>
          </div>
        </Panel>

        <Panel title="2. Resumo e pagamento" className="h-fit xl:sticky xl:top-24">
          <div className="space-y-3 p-5 text-sm">
            <Line k="Produto" v={type.name} />
            <Line k="Local" v={`${c.flag} ${c.name}`} />
            <Line k="Protocolo" v={protocol === "HTTP" ? "HTTP/HTTPS" : "SOCKS5"} />
            <Line k="Subtotal" v={format(q.subtotal * (type.unit === "IP" ? months : 1))} mono />
            {q.discount > 0 && <Line k={`Desconto volume ${Math.round(q.discountRate * 100)}%`} v={`−${format(q.discount * (type.unit === "IP" ? months : 1))}`} mono accent />}
            <div className="flex items-end justify-between border-t pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-3xl font-extrabold">{format(total)}</span>
            </div>
            <div className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
              Seu saldo: <span className="font-mono font-semibold text-foreground">{format(balance)}</span>
              {balance < total && <span className="text-amber-foreground"> · faltam {format(total - balance)}</span>}
            </div>
            <Button variant="brand" size="xl" className="w-full" disabled={provisioning} onClick={() => void purchase()}>
              <Wallet /> {provisioning ? "A provisionar proxy..." : "Pagar com saldo"}
            </Button>
            <Button variant="outline" size="xl" className="w-full" onClick={() => setPix(true)}>
              <QrCode /> Pagar direto via Pix
            </Button>
          </div>
        </Panel>
      </div>
      <PixDialog
        open={pix}
        onOpenChange={setPix}
        amount={total}
        description={`${qty} ${type.unit === "GB" ? "GB" : "IPs"} ${type.name} · ${c.name}`}
        onPaid={() => {
          toast.message("Pagamento Pix ainda não credita o saldo.", {
            description: "Provisione o proxy com Pagar com saldo depois que o saldo estiver na conta.",
          });
        }}
      />
    </>
  );
}

function Line({ k, v, mono, accent }: { k: string; v: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className={cn("flex justify-between", accent && "text-amber-foreground")}>
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-medium", mono && "font-mono")}>{v}</span>
    </div>
  );
}
