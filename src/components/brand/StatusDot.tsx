import { cn } from "@/lib/utils";

const TONE = {
  online: "bg-success animate-pulse-dot",
  instavel: "bg-amber",
  offline: "bg-destructive",
} as const;

const LABEL = { online: "Online", instavel: "Instável", offline: "Offline" } as const;

export function StatusBadge({ status }: { status: keyof typeof TONE }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "online" && "bg-success-soft text-success",
        status === "instavel" && "bg-amber-soft text-amber-foreground",
        status === "offline" && "bg-destructive-soft text-destructive",
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE[status])} />
      {LABEL[status]}
    </span>
  );
}
