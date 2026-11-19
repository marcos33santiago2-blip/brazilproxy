import { Bot, Chrome, Code2, Fingerprint, Globe, Layers, Shield, Terminal, Workflow } from "lucide-react";

const TOOLS = [
  { name: "AdsPower", icon: Fingerprint },
  { name: "Dolphin Anty", icon: Shield },
  { name: "Incogniton", icon: Layers },
  { name: "Multilogin", icon: Globe },
  { name: "GoLogin", icon: Chrome },
  { name: "Python / Requests", icon: Code2 },
  { name: "Puppeteer", icon: Bot },
  { name: "Playwright", icon: Terminal },
  { name: "n8n / Make", icon: Workflow },
];

export function CompatStrip() {
  return (
    <section className="border-y bg-surface py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Compatível com os principais navegadores antidetect e ferramentas
        </p>
        <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-3">
            {[...TOOLS, ...TOOLS].map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-foreground/80 shadow-soft">
                <t.icon className="size-4 text-primary" /> {t.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
