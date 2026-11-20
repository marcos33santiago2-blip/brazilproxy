import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type NavItem = { to: LinkProps["to"]; label: string; icon: LucideIcon; exact?: boolean; badge?: string };

function SidebarContent({ area, nav, footer, onNavigate }: { area: string; nav: NavItem[]; footer?: ReactNode; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark />
        <div className="leading-tight">
          <div className="font-display font-extrabold">{BRAND.name}</div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-night-muted">{area}</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <Link
            key={String(item.to)}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.exact }}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-night-muted transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
            activeProps={{ className: "!bg-sidebar-accent !text-sidebar-foreground shadow-[inset_2px_0_0_var(--cyan)]" }}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && <span className="rounded-full bg-amber px-1.5 text-[10px] font-bold text-night">{item.badge}</span>}
          </Link>
        ))}
      </nav>
      {footer && <div className="border-t border-sidebar-border p-4">{footer}</div>}
      <div className="border-t border-sidebar-border p-3">
        <SignOutButton />
      </div>
    </div>
  );
}

function SignOutButton() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-night-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
      onClick={() => {
        void clearSession(queryClient).then(() => navigate({ to: "/entrar" }));
      }}
    >
      <LogOut className="size-4" /> Sair
    </button>
  );
}

export function DashboardShell({
  area,
  nav,
  user,
  topRight,
  sidebarFooter,
  children,
}: {
  area: string;
  nav: NavItem[];
  user: { name: string; email: string };
  topRight?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent area={area} nav={nav} footer={sidebarFooter} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-none p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent area={area} nav={nav} footer={sidebarFooter} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu />
          </Button>
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar IP, pedido, cliente…"
              className="h-9 w-full rounded-lg border bg-surface pl-9 pr-12 text-sm outline-none transition-all focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-ring/30"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-card px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {topRight}
            <button className="relative grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Notificações">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">{initials}</span>
              <div className="hidden leading-tight xl:block">
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "cyan" | "amber" | "success";
  trend?: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft transition-all hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg",
            tone === "primary" && "bg-primary-soft text-primary",
            tone === "cyan" && "bg-cyan-soft text-cyan",
            tone === "amber" && "bg-amber-soft text-amber-foreground",
            tone === "success" && "bg-success-soft text-success",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {trend !== undefined && (
          <span className={cn("rounded px-1.5 py-0.5 font-semibold", trend >= 0 ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive")}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-soft", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-bold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
