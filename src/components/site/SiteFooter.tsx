import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="bg-night pb-28 pt-16 text-night-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="night" />
          <p className="mt-4 max-w-xs text-sm">
            Infraestrutura de proxies privados para tráfego pago, contingência, automação e scraping. Suporte humanizado em português.
          </p>
          <div className="mt-4 font-mono text-xs">CNPJ {BRAND.cnpj}</div>
        </div>
        {[
          { title: "Produtos", links: ["Residencial", "ISP Estático", "Móvel 4G/5G", "Datacenter IPv4", "Datacenter IPv6"] },
          { title: "Empresa", links: ["Sobre", "Revenda", "Status", "Blog"] },
          { title: "Suporte", links: ["Central de ajuda", "Tutoriais", BRAND.supportEmail, `WhatsApp ${BRAND.whatsapp}`] },
        ].map((col) => (
          <div key={col.title}>
            <div className="mb-3 text-sm font-semibold text-night-foreground">{col.title}</div>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l}>
                  {l === "Revenda" ? (
                    <Link to="/revenda" className="hover:text-night-foreground">{l}</Link>
                  ) : (
                    <span className="cursor-default hover:text-night-foreground">{l}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap justify-between gap-4 border-t border-night-border px-4 pt-6 text-xs sm:px-6">
        <span>© 2026 {BRAND.name}. Todos os direitos reservados.</span>
        <span>Termos de uso · Política de privacidade (LGPD) · Uso aceitável</span>
      </div>
    </footer>
  );
}
