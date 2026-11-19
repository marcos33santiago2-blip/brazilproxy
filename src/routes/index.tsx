import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Globe2, Timer, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { QuickCalculator } from "@/components/site/landing/QuickCalculator";
import { CompatStrip } from "@/components/site/landing/CompatStrip";
import { ProxyTabs } from "@/components/site/landing/ProxyTabs";
import { EnterpriseSection } from "@/components/site/landing/EnterpriseSection";
import { PriceGrid } from "@/components/site/landing/PriceGrid";
import { FaqSection } from "@/components/site/landing/FaqSection";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Proxies privados SOCKS5 e HTTPS no Brasil e no mundo` },
      { name: "description", content: "Proxies residenciais, ISP estático, móveis 4G/5G e datacenter IPv4/IPv6. Ativação instantânea via Pix e suporte 24/7 em português." },
      { property: "og:title", content: `${BRAND.name} — Proxies privados de alta velocidade` },
      { property: "og:description", content: "Para contingência, tráfego pago, automação e scraping. Ativação em segundos via Pix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-night text-night-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid-night" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-night-border bg-night-foreground/5 px-3 py-1 text-xs font-medium text-night-muted">
              <span className="size-1.5 rounded-full bg-success animate-pulse-dot" />
              12.480 proxies ativos agora · 99,9% uptime
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Proxies privados de alta velocidade <span className="text-gradient-brand">SOCKS5 e HTTPS</span> no Brasil e no mundo
            </h1>
            <p className="mt-6 max-w-xl text-lg text-night-muted">
              Infraestrutura confiável para contingência, tráfego pago, automação e scraping. Pague com Pix e receba seus IPs em segundos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="brand" size="xl" asChild>
                <Link to="/criar-conta">
                  Criar conta grátis <ArrowRight />
                </Link>
              </Button>
              <Button variant="night" size="xl" asChild>
                <Link to="/revenda">Quero revender</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              {[
                { icon: Globe2, v: "190+", l: "países" },
                { icon: Timer, v: "< 30s", l: "ativação via Pix" },
                { icon: Users, v: "8.200+", l: "clientes ativos" },
              ].map((s) => (
                <div key={s.l}>
                  <s.icon className="size-4 text-cyan" />
                  <div className="mt-2 font-display text-2xl font-bold">{s.v}</div>
                  <div className="text-xs text-night-muted">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <QuickCalculator />
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-night-muted">
              {["Sem fidelidade", "Troca de IP grátis", "Nota fiscal"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-cyan" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <CompatStrip />
      <ProxyTabs />
      <EnterpriseSection />
      <PriceGrid />
      <FaqSection />
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-brand p-10 text-primary-foreground shadow-glow sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-night opacity-40" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Tenha sua própria marca de proxies</h2>
              <p className="mt-2 max-w-xl opacity-90">Painel Filho white-label com seu domínio, sua logo e seus preços. A entrega é nossa.</p>
            </div>
            <Button size="xl" variant="secondary" asChild>
              <Link to="/revenda">
                Conhecer a revenda <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
