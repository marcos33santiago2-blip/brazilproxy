import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Payment cue for the homepage. The exact line is the conversion message. */
export function PixReleaseBanner({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-xl bg-gradient-brand px-4 py-3 text-primary-foreground shadow-glow", className)}>
      <div className="flex items-center gap-2 text-sm font-bold leading-snug">
        <Zap className="size-4 shrink-0" />
        <span>Pague com Pix ou Cartão • Liberação instantânea em segundos</span>
      </div>
      {!compact && <p className="mt-1 pl-6 text-xs text-primary-foreground/90">O pagamento é confirmado e o proxy é liberado na hora.</p>}
    </div>
  );
}
