import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Coins, Globe, Palette, Rocket, Server, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND } from "@/config/brand";
import { useCurrency } from "@/lib/currency";
import { CHILD_PANEL_FEE, PROXY_TYPES, RESELLER_LEVELS, getProxyType, resellerProfit, wholesalePrice, type ProxyTypeId, type ResellerLevelId } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/revenda")({
  head: () => ({
    meta: [
      { title: `Seja revendedor e tenha seu Painel Filho — ${BRAND.name}` },
      { name: "description", content: "Revenda proxies com até 60% de desconto ou tenha seu próprio painel white-label com seu domínio, logo e preços." },
      { property: "og:title", content: `Revenda & Painel Filho white-label — ${BRAND.name}` },
      { property: "og:description", content: "Monte sua operação de proxies com a nossa infraestrutura. Simule seu lucro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevendaPage,
});

function RevendaPage() {
  const [request, setRequest] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-night text-night-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid-night" />
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-20 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-night-border bg-night-foreground/5 px-3 py-1 text-xs font-medium text-amber">
            <Coins className="size-3.5" /> Programa de revenda {BRAND.name}
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-6xl">
            Sua própria operação de proxies, <span className="text-gradient-brand">sem montar infraestrutura</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-night-muted">
            Agências, infoprodutores e empreendedores vendem com a própria marca enquanto a {BRAND.name} entrega os IPs automaticamente por trás.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="brand" size="xl" onClick={() => setRequest(true)}>
              Ativar meu Painel Filho <ArrowRight />
            </Button>
            <Button variant="night" size="xl" asChild>
              <a href="#simulador">Simular meu lucro</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <div className="text-sm font-semibold text-primary">Modelos de revenda</div>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Escolha como você quer vender</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <ModelCard
              icon={Server}
              tag="Para quem já tem sistema"
              title="Revenda via API / Créditos"
              desc="Compre no atacado com até 60% de desconto e entregue os proxies no seu próprio sistema, bot ou loja."
              items={["Até 60% de desconto no atacado", "API REST completa + webhooks", "Saldo pré-pago via Pix", "Sem mensalidade", "Níveis Bronze, Prata e Ouro"]}
              price="Sem mensalidade"
              onClick={() => setRequest(true)}
            />
            <ModelCard
              featured
              icon={Palette}
              tag="Mais escolhido"
              title="Painel Filho White-Label"
              desc="Seu próprio site e painel com seu domínio, sua logo, suas cores e seus preços, integrado ao seu Pix/gateway."
              items={["Domínio próprio com SSL", "Logo, cores e textos personalizados", "Você define os preços e margens", "Recebe direto no seu Pix/gateway", "Entrega automática dos IPs", "Gestão de clientes e relatórios"]}
              price={`R$ ${CHILD_PANEL_FEE}/mês`}
              onClick={() => setRequest(true)}
            />
          </div>
        </div>
      </section>

      <ProfitSimulator onRequest={() => setRequest(true)} />

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Como funciona</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { icon: Rocket, t: "Solicite o painel", d: "Preencha o formulário e receba aprovação em até 24 h." },
              { icon: Globe, t: "Conecte seu domínio", d: "Aponte o DNS e personalize logo, cores e textos." },
              { icon: Wallet, t: "Defina seus preços", d: "Configure margens e conecte seu Pix ou gateway." },
              { icon: Coins, t: "Venda e lucre", d: "Seus clientes compram, nós entregamos. Você fica com a diferença." },
            ].map((s, i) => (
              <div key={s.t} className="relative rounded-2xl border bg-card p-6 shadow-soft">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <s.icon className="mt-3 size-6 text-primary" />
                <div className="mt-4 font-display font-bold">{s.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RequestDialog open={request} onOpenChange={setRequest} />
      <SiteFooter />
    </div>
  );
}

function ModelCard({
  icon: Icon,
  tag,
  title,
  desc,
  items,
  price,
  featured,
  onClick,
}: {
  icon: typeof Server;
  tag: string;
  title: string;
  desc: string;
  items: string[];
  price: string;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={cn("relative flex flex-col rounded-3xl border p-8 shadow-soft", featured ? "bg-gradient-night text-night-foreground border-night-border shadow-elevated" : "bg-card")}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-12 place-items-center rounded-xl", featured ? "bg-gradient-brand shadow-glow" : "bg-primary-soft")}>
          <Icon className={cn("size-6", featured ? "text-primary-foreground" : "text-primary")} />
        </span>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", featured ? "bg-amber text-night" : "bg-muted text-muted-foreground")}>{tag}</span>
      </div>
      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <p className={cn("mt-2", featured ? "text-night-muted" : "text-muted-foreground")}>{desc}</p>
      <ul className="mt-6 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            <Check className={cn("size-4", featured ? "text-cyan" : "text-primary")} /> {i}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between pt-8">
        <span className="font-display text-xl font-bold">{price}</span>
        <Button variant={featured ? "brand" : "outline"} onClick={onClick}>
          Começar agora
        </Button>
      </div>
    </div>
  );
}

function ProfitSimulator({ onRequest }: { onRequest: () => void }) {
  const { format } = useCurrency();
  const [typeId, setTypeId] = useState<ProxyTypeId>("isp");
  const [level, setLevel] = useState<ResellerLevelId>("prata");
  const [qty, setQty] = useState(300);
  const type = getProxyType(typeId);
  const [sellPrice, setSellPrice] = useState(type.basePrice);
  const [childPanel, setChildPanel] = useState(true);
  const r = resellerProfit({ typeId, level, qty, sellPrice, childPanel });
  const cost = wholesalePrice(typeId, level);

  return (
    <section id="simulador" className="scroll-mt-20 bg-surface py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-sm font-semibold text-primary">Simulador de lucro</div>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Quanto você pode ganhar por mês?</h2>
        </div>
        <div className="mt-12 grid overflow-hidden rounded-3xl border bg-card shadow-elevated lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-7 p-8 sm:p-10">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={typeId}
                  onValueChange={(v) => {
                    const t = getProxyType(v as ProxyTypeId);
                    setTypeId(t.id);
                    setSellPrice(t.basePrice);
                  }}
                >
                  <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROXY_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível de revendedor</Label>
                <div className="flex h-11 rounded-lg bg-muted p-1">
                  {RESELLER_LEVELS.map((l) => (
                    <button key={l.id} onClick={() => setLevel(l.id)} className={cn("flex-1 rounded-md text-xs font-semibold transition-all", level === l.id ? "bg-card shadow-soft" : "text-muted-foreground")}>
                      {l.name} <span className="text-amber-foreground">−{Math.round(l.discount * 100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="mb-3 flex justify-between">
                <Label>{type.unit === "GB" ? "GBs" : "IPs"} vendidos por mês</Label>
                <span className="font-mono text-sm font-semibold">{qty.toLocaleString("pt-BR")}</span>
              </div>
              <Slider value={[qty]} min={10} max={type.id === "ipv6" ? 20000 : 3000} step={10} onValueChange={([v]) => setQty(v)} />
            </div>
            <div>
              <div className="mb-3 flex justify-between">
                <Label>Seu preço de venda por {type.unit === "GB" ? "GB" : "IP"}</Label>
                <span className="font-mono text-sm font-semibold">{format(sellPrice)}</span>
              </div>
              <Slider value={[sellPrice]} min={cost} max={round(type.basePrice * 2)} step={0.1} onValueChange={([v]) => setSellPrice(round(v))} />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Seu custo: {format(cost)}</span>
                <span>Varejo {BRAND.name}: {format(type.basePrice)}</span>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-xl border bg-surface p-4">
              <span>
                <span className="block text-sm font-semibold">Incluir Painel Filho white-label</span>
                <span className="text-xs text-muted-foreground">Mensalidade de {format(CHILD_PANEL_FEE)}</span>
              </span>
              <Switch checked={childPanel} onCheckedChange={setChildPanel} />
            </label>
          </div>
          <div className="flex flex-col bg-gradient-night p-8 text-night-foreground sm:p-10">
            <div className="text-sm text-night-muted">Lucro líquido estimado / mês</div>
            <div className={cn("mt-2 font-display text-5xl font-extrabold", r.profit < 0 && "text-destructive")}>{format(r.profit)}</div>
            <div className="mt-1 text-sm text-cyan">Margem de {Math.round(r.margin * 100)}% · {format(r.profit * 12)}/ano</div>
            <dl className="mt-8 space-y-3 border-t border-night-border pt-6 text-sm">
              <Row k="Faturamento" v={format(r.revenue)} />
              <Row k="Custo no atacado" v={`−${format(r.cost)}`} />
              {childPanel && <Row k="Mensalidade Painel Filho" v={`−${format(r.fee)}`} />}
            </dl>
            <Button variant="brand" size="xl" className="mt-auto w-full" onClick={onRequest}>
              Quero começar a revender
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-night-muted">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}

function RequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Solicitar Painel Filho</DialogTitle>
          <DialogDescription>Nossa equipe analisa e aprova em até 24 horas úteis.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onOpenChange(false);
            toast.success("Solicitação enviada! Você receberá a aprovação por e-mail.");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Nome / Empresa</Label><Input required placeholder="Agência Exemplo" /></div>
            <div className="space-y-1.5"><Label>WhatsApp</Label><Input required placeholder="(11) 90000-0000" /></div>
          </div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required placeholder="contato@suamarca.com" /></div>
          <div className="space-y-1.5"><Label>Domínio desejado</Label><Input placeholder="proxy.suamarca.com.br" className="font-mono" /></div>
          <div className="space-y-1.5">
            <Label>Volume estimado por mês</Label>
            <Select defaultValue="1k">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1k">Até R$ 1.000</SelectItem>
                <SelectItem value="5k">R$ 1.000 – R$ 5.000</SelectItem>
                <SelectItem value="20k">R$ 5.000 – R$ 20.000</SelectItem>
                <SelectItem value="mais">Acima de R$ 20.000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="brand" size="xl" type="submit" className="w-full">Enviar solicitação</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
