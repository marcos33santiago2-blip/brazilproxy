import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ?? "Copiar"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard can be blocked in iframes; still give feedback */
        }
        setCopied(true);
        toast.success(label ? `${label} copiado` : "Copiado para a área de transferência");
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary",
        copied && "text-success",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
