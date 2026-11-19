import { Link } from "@tanstack/react-router";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-8 place-items-center rounded-lg bg-gradient-brand shadow-glow", className)}>
      <svg viewBox="0 0 24 24" className="size-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h4l3-7 4 14 3-7h2" />
      </svg>
    </span>
  );
}

export function Logo({ tone = "light", className }: { tone?: "light" | "night"; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-lg font-extrabold", tone === "night" ? "text-night-foreground" : "text-foreground")}>
        {BRAND.name}
      </span>
    </Link>
  );
}
