import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase, Globe, LayoutDashboard, Shield, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { to: "/", label: "Site", icon: Globe, match: (p: string) => p === "/" || p === "/entrar" || p === "/criar-conta" },
  { to: "/revenda", label: "Revenda", icon: Store, match: (p: string) => p.startsWith("/revenda") },
  { to: "/cliente", label: "Cliente", icon: LayoutDashboard, match: (p: string) => p.startsWith("/cliente") },
  { to: "/revendedor", label: "Revendedor", icon: Briefcase, match: (p: string) => p.startsWith("/revendedor") },
  { to: "/admin", label: "Admin", icon: Shield, match: (p: string) => p.startsWith("/admin") },
] as const;

/** Floating demo switcher to jump between the five views of the platform. */
export function ViewSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Alternar visão"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-night-border bg-night/95 p-1 shadow-elevated backdrop-blur"
    >
      <span className="hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-night-muted lg:block">Visão</span>
      {VIEWS.map((v) => {
        const active = v.match(pathname);
        return (
          <Link
            key={v.to}
            to={v.to}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              active ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-night-muted hover:bg-night-foreground/10 hover:text-night-foreground",
            )}
          >
            <v.icon className="size-3.5" />
            <span className="hidden sm:inline">{v.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
