import { useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw, RotateCw, Search, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/brand/CopyButton";
import { StatusBadge } from "@/components/brand/StatusDot";
import { useClientStore } from "@/lib/client-store";
import { randomIp } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ProxyTable({ limit, compact }: { limit?: number; compact?: boolean }) {
  const { proxies, setProxies, spend, setPixOpen } = useClientStore();
  const [q, setQ] = useState("");
  const [proto, setProto] = useState<"todos" | "HTTP" | "SOCKS5">("todos");
  const [status, setStatus] = useState<"todos" | "online" | "instavel" | "offline">("todos");
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, string>>({});

  const rows = proxies
    .filter((p) => (proto === "todos" ? true : p.protocol === proto))
    .filter((p) => (status === "todos" ? true : p.status === status))
    .filter((p) => `${p.ip} ${p.city} ${p.country} ${p.user} ${p.type}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, limit);

  const run = (id: string, action: string, ms: number, fn: () => void) => {
    setBusy((b) => ({ ...b, [id]: action }));
    setTimeout(() => {
      fn();
      setBusy((b) => {
        const n = { ...b };
        delete n[id];
        return n;
      });
    }, ms);
  };

  return (
    <TooltipProvider delayDuration={200}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por IP, cidade, usuário…" className="h-9 pl-9" />
          </div>
          <Segmented value={proto} onChange={setProto} options={[["todos", "Todos"], ["HTTP", "HTTP"], ["SOCKS5", "SOCKS5"]]} />
          <Segmented value={status} onChange={setStatus} options={[["todos", "Status"], ["online", "Online"], ["instavel", "Instável"], ["offline", "Offline"]]} />
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="pl-5">IP : Porta</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Senha</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className="group">
                <TableCell className="pl-5">
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-[13px] font-medium">
                      {p.ip}:<span className="text-primary">{p.port}</span>
                    </code>
                    <CopyButton value={`${p.ip}:${p.port}:${p.user}:${p.pass}`} label="Proxy" className="opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">{p.type}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-[13px]">{p.user}</code>
                    <CopyButton value={p.user} label="Usuário" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <code className="w-28 font-mono text-[13px]">{shown[p.id] ? p.pass : "••••••••••••"}</code>
                    <button
                      aria-label={shown[p.id] ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShown((s) => ({ ...s, [p.id]: !s[p.id] }))}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {shown[p.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                    <CopyButton value={p.pass} label="Senha" />
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold", p.protocol === "SOCKS5" ? "bg-cyan-soft text-cyan" : "bg-primary-soft text-primary")}>
                    {p.protocol}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {p.flag} {p.city}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm">{p.expires}</div>
                  <div className={cn("text-[11px]", p.daysLeft <= 3 ? "font-semibold text-amber-foreground" : "text-muted-foreground")}>
                    {p.daysLeft} dia{p.daysLeft > 1 ? "s" : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="pr-5">
                  <div className="flex justify-end gap-1">
                    <ActionBtn
                      label="Testar conexão"
                      busy={busy[p.id] === "test"}
                      icon={Wifi}
                      onClick={() =>
                        run(p.id, "test", 900, () => {
                          if (p.status === "offline") toast.error(`${p.ip} não respondeu (timeout)`);
                          else toast.success(`${p.ip} online · ${12 + (p.port % 40)} ms · ${p.city}`);
                        })
                      }
                    />
                    <ActionBtn
                      label="Trocar IP"
                      busy={busy[p.id] === "swap"}
                      icon={RefreshCw}
                      onClick={() =>
                        run(p.id, "swap", 1300, () => {
                          const ip = randomIp();
                          setProxies((all) => all.map((x) => (x.id === p.id ? { ...x, ip, status: "online" } : x)));
                          toast.success(`IP trocado para ${ip}`);
                        })
                      }
                    />
                    <ActionBtn
                      label="Renovar 30 dias"
                      busy={busy[p.id] === "renew"}
                      icon={RotateCw}
                      onClick={() =>
                        run(p.id, "renew", 700, () => {
                          if (!spend(14.9)) {
                            toast.error("Saldo insuficiente para renovar", { action: { label: "Recarregar", onClick: () => setPixOpen(true) } });
                            return;
                          }
                          setProxies((all) => all.map((x) => (x.id === p.id ? { ...x, daysLeft: x.daysLeft + 30 } : x)));
                          toast.success(`Proxy ${p.ip} renovado por +30 dias (R$ 14,90)`);
                        })
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum proxy encontrado com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

function ActionBtn({ label, icon: Icon, onClick, busy }: { label: string; icon: typeof Wifi; onClick: () => void; busy?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClick} disabled={busy} aria-label={label}>
          {busy ? <Loader2 className="animate-spin" /> : <Icon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all", value === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
