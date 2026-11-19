import { Clock, Code2, Headphones, Lock, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Code2, title: "API dedicada", desc: "REST completa para criar, rotacionar e listar proxies de forma programática." },
  { icon: RefreshCw, title: "Rotação programada", desc: "Troque IPs por intervalo, por requisição ou via webhook." },
  { icon: Server, title: "Uptime 99,9%", desc: "Infraestrutura redundante com SLA contratual e monitoramento 24h." },
  { icon: Headphones, title: "Suporte 24/7 em português", desc: "Gente de verdade no WhatsApp, Telegram e e-mail, sem robô." },
  { icon: Lock, title: "Conformidade LGPD", desc: "IPs obtidos de forma ética, contratos e DPA para sua empresa." },
  { icon: Clock, title: "Faturamento corporativo", desc: "Boleto, Pix, nota fiscal e limites de crédito para empresas." },
];

export function EnterpriseSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-night py-24 text-night-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-night" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <div className="text-sm font-semibold text-cyan">Soluções corporativas</div>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Alta escala para agências, empresas e times de dados</h2>
          <p className="mt-4 text-night-muted">
            Pools dedicados, IPs exclusivos por cliente, gerente de conta e integração direta com seu stack.
          </p>
          <div className="mt-8 rounded-xl border border-night-border bg-night-2/70 p-4 font-mono text-xs leading-relaxed">
            <div className="text-night-muted"># Rotacionar IP via API</div>
            <div>
              <span className="text-cyan">curl</span> -X POST https://api.brazilproxy.com.br/v1/proxies/px_1004/rotate \
            </div>
            <div className="pl-4">-H <span className="text-amber">"Authorization: Bearer bp_live_••••"</span></div>
            <div className="mt-2 text-success">{'{ "ip": "189.44.12.201", "status": "online" }'}</div>
          </div>
          <Button variant="brand" size="lg" className="mt-8">Falar com especialista</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-night-border bg-night-foreground/[0.03] p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-night-foreground/[0.06]">
              <span className="grid size-10 place-items-center rounded-lg bg-gradient-brand shadow-glow">
                <f.icon className="size-5 text-primary-foreground" />
              </span>
              <div className="mt-4 font-display font-bold">{f.title}</div>
              <p className="mt-1.5 text-sm text-night-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
