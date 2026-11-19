import { useState } from "react";
import { Check, Gauge, Globe2, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PixDialog } from "@/components/brand/PixDialog";
import { useCurrency } from "@/lib/currency";
import { getProxyType, quote, type ProxyTypeId } from "@/lib/pricing";

const CATEGORIES: {
  id: ProxyTypeId;
  label: string;
  headline: string;
  desc: string;
  specs: { icon: typeof Gauge; label: string; value: string }[];
  uses: string[];
}[] = [
  {
    id: "residencial",
    label: "Residencial",
    headline: "IPs reais de usuários domésticos, com rotação automática",
    desc: "Pool com mais de 30 milhões de IPs residenciais éticos. Rotação por requisição ou sessões fixas de até 60 minutos.",
    specs: [
      { icon: Globe2, label: "Pool", value: "30M+ IPs · 190 países" },
      { icon: Gauge, label: "Velocidade", value: "até 100 Mbps" },
      { icon: RefreshCw, label: "Rotação", value: "Por requisição / sessão" },
      { icon: ShieldCheck, label: "Sucesso", value: "99,2% de requisições" },
    ],
    uses: ["Web scraping em escala", "Verificação de anúncios", "Pesquisa de preços (SEO / e-commerce)", "Coleta de dados de marketplaces"],
  },
  {
    id: "movel",
    label: "Móvel 4G/5G",
    headline: "IPs de operadoras móveis brasileiras e internacionais",
    desc: "Conexões via Vivo, Claro e TIM. Altíssima confiança — o tipo de IP mais difícil de ser bloqueado por plataformas.",
    specs: [
      { icon: Globe2, label: "Operadoras", value: "Vivo · Claro · TIM + 60 países" },
      { icon: Gauge, label: "Velocidade", value: "até 50 Mbps" },
      { icon: RefreshCw, label: "Troca de IP", value: "Via link / API a cada 2 min" },
      { icon: ShieldCheck, label: "Trust score", value: "Máximo" },
    ],
    uses: ["Contas de redes sociais", "Contingência para Facebook / TikTok Ads", "Apps mobile", "Criação de contas em massa"],
  },
  {
    id: "isp",
    label: "ISP Dedicado",
    headline: "IP fixo de provedor, exclusivo e com velocidade de datacenter",
    desc: "O melhor dos dois mundos: reconhecido como residencial, mas hospedado em datacenter com uptime de 99,9%.",
    specs: [
      { icon: Globe2, label: "Exclusividade", value: "1 IP = 1 cliente" },
      { icon: Gauge, label: "Velocidade", value: "até 1 Gbps" },
      { icon: RefreshCw, label: "Troca", value: "Grátis 1x a cada 7 dias" },
      { icon: ShieldCheck, label: "Uptime", value: "99,9% SLA" },
    ],
    uses: ["Perfis em AdsPower / Dolphin", "Gerenciar contas de anúncio", "E-commerce e marketplaces", "Acesso a bancos e gateways"],
  },
  {
    id: "ipv4",
    label: "IPv4",
    headline: "Datacenter IPv4 dedicado de alta performance",
    desc: "Latência mínima e banda ilimitada para automações intensas, bots e testes de carga.",
    specs: [
      { icon: Globe2, label: "Sub-redes", value: "Múltiplas /24 por país" },
      { icon: Gauge, label: "Velocidade", value: "até 1 Gbps" },
      { icon: RefreshCw, label: "Banda", value: "Ilimitada" },
      { icon: ShieldCheck, label: "Latência", value: "< 30 ms (BR)" },
    ],
    uses: ["Bots e automações", "Monitoramento de sites", "Testes de carga", "SEO tracking"],
  },
  {
    id: "ipv6",
    label: "IPv6",
    headline: "Escala massiva de IPs a centavos",
    desc: "Milhares de IPs IPv6 exclusivos por um preço imbatível, para sites e serviços compatíveis.",
    specs: [
      { icon: Globe2, label: "Bloco", value: "/64 dedicado" },
      { icon: Gauge, label: "Velocidade", value: "até 1 Gbps" },
      { icon: RefreshCw, label: "Rotação", value: "Por requisição" },
      { icon: ShieldCheck, label: "Compatível", value: "Google, Instagram, YouTube" },
    ],
    uses: ["Scraping de Google e YouTube", "Criação de contas em massa", "Testes A/B de geolocalização", "Automação de alto volume"],
  },
];

export function ProxyTabs() {
  const { format } = useCurrency();
  const [pix, setPix] = useState<{ amount: number; desc: string } | null>(null);
  return (
    <section id="produtos" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold text-primary">Produtos</div>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Um tipo de proxy para cada operação</h2>
          <p className="mt-3 text-muted-foreground">Todos com autenticação por usuário/senha ou whitelist de IP, SOCKS5 e HTTPS.</p>
        </div>
        <Tabs defaultValue="residencial" className="mt-10">
          <TabsList className="mx-auto flex h-auto w-full max-w-3xl flex-wrap justify-center gap-1 rounded-xl bg-muted p-1">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="flex-1 rounded-lg px-4 py-2 font-semibold data-[state=active]:shadow-soft">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((c) => {
            const t = getProxyType(c.id);
            const starter = quote(c.id, "BR", t.defaultQty);
            return (
              <TabsContent key={c.id} value={c.id} className="mt-8 animate-fade-up">
                <div className="grid overflow-hidden rounded-2xl border bg-card shadow-soft lg:grid-cols-[1.3fr_1fr]">
                  <div className="p-8 sm:p-10">
                    <h3 className="text-2xl font-bold">{c.headline}</h3>
                    <p className="mt-3 text-muted-foreground">{c.desc}</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      {c.specs.map((s) => (
                        <div key={s.label} className="flex gap-3 rounded-xl border bg-surface p-4">
                          <s.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                          <div>
                            <div className="text-xs text-muted-foreground">{s.label}</div>
                            <div className="text-sm font-semibold">{s.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col bg-gradient-night p-8 text-night-foreground sm:p-10">
                    <div className="text-xs font-semibold uppercase tracking-widest text-cyan">Casos de uso ideais</div>
                    <ul className="mt-4 space-y-3">
                      {c.uses.map((u) => (
                        <li key={u} className="flex items-center gap-2.5 text-sm">
                          <span className="grid size-5 place-items-center rounded-full bg-cyan-soft">
                            <Check className="size-3 text-cyan" />
                          </span>
                          {u}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">
                      <div className="text-sm text-night-muted">A partir de</div>
                      <div className="font-display text-4xl font-extrabold">
                        {format(t.basePrice)}
                        <span className="text-base font-medium text-night-muted">/{t.unit === "GB" ? "GB" : "IP·mês"}</span>
                      </div>
                      <Button
                        variant="brand"
                        size="lg"
                        className="mt-5 w-full"
                        onClick={() => setPix({ amount: starter.total, desc: `${t.defaultQty} ${t.unit === "GB" ? "GB" : "IPs"} ${t.name} · Brasil` })}
                      >
                        <Zap /> Comprar {t.defaultQty} {t.unit === "GB" ? "GB" : "IPs"} por {format(starter.total)}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
      <PixDialog open={!!pix} onOpenChange={(o) => !o && setPix(null)} amount={pix?.amount} description={pix?.desc} />
    </section>
  );
}
