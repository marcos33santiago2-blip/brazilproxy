import { useState } from "react";
import { BadgePercent, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixDialog } from "@/components/brand/PixDialog";
import { COUNTRIES, PROXY_TYPES, getProxyType, quote, type ProxyTypeId } from "@/lib/pricing";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function QuickCalculator() {
  const { format } = useCurrency();
  const [typeId, setTypeId] = useState<ProxyTypeId>("isp");
  const [country, setCountry] = useState("BR");
  const [qty, setQty] = useState(getProxyType("isp").defaultQty);
  const [protocol, setProtocol] = useState<"HTTP" | "SOCKS5">("SOCKS5");
  const [pix, setPix] = useState(false);
  const type = getProxyType(typeId);
  const q = quote(typeId, country, qty);
  const countryObj = COUNTRIES.find((c) => c.code === country)!;

  return (
    <div className="relative rounded-2xl border border-night-border bg-card p-5 text-card-foreground shadow-elevated sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-lg font-bold">Compra rápida</div>
        <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
          <span className="size-1.5 rounded-full bg-success animate-pulse-dot" /> Ativação instantânea
        </span>
      </div>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de proxy</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PROXY_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTypeId(t.id);
              setQty(t.defaultQty);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
              typeId === t.id ? "border-primary bg-primary-soft text-primary ring-1 ring-primary" : "hover:border-primary/40 hover:bg-surface",
            )}
          >
            {t.short}
            <span className="block text-[11px] font-normal text-muted-foreground">
              {format(t.basePrice)}/{t.unit === "GB" ? "GB" : "IP·mês"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">País</label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protocolo</label>
          <div className="flex h-10 rounded-lg bg-muted p-1">
            {(["SOCKS5", "HTTP"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                className={cn("flex-1 rounded-md text-xs font-semibold transition-all", protocol === p ? "bg-card shadow-soft" : "text-muted-foreground")}
              >
                {p === "HTTP" ? "HTTPS" : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quantidade ({type.unit === "GB" ? "GB" : "IPs"})
          </label>
          <Input
            type="number"
            value={qty}
            min={type.min}
            max={type.max}
            onChange={(e) => setQty(Math.min(type.max, Math.max(type.min, Number(e.target.value) || type.min)))}
            className="h-8 w-24 text-right font-mono"
          />
        </div>
        <Slider value={[qty]} min={type.min} max={Math.min(type.max, type.unit === "GB" ? 200 : type.id === "ipv6" ? 2000 : 250)} step={type.step} onValueChange={([v]) => setQty(v)} />
        <div className="mt-2 flex gap-1.5">
          {[10, 50, 100, 500].map((t) => (
            <span key={t} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", qty >= t ? "bg-amber-soft text-amber-foreground" : "bg-muted text-muted-foreground")}>
              {t}+ {t === 10 ? "−5%" : t === 50 ? "−10%" : t === 100 ? "−15%" : "−20%"}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-surface p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {qty} {type.unit === "GB" ? "GB" : "IPs"} × {format(q.unit)} · {countryObj.flag} {countryObj.name}
          </span>
          <span className="font-mono">{format(q.subtotal)}</span>
        </div>
        {q.discount > 0 && (
          <div className="mt-1 flex justify-between text-sm text-amber-foreground">
            <span className="flex items-center gap-1">
              <BadgePercent className="size-3.5" /> Desconto por volume ({Math.round(q.discountRate * 100)}%)
            </span>
            <span className="font-mono">−{format(q.discount)}</span>
          </div>
        )}
        <div className="mt-3 flex items-end justify-between border-t pt-3">
          <span className="text-sm font-medium">Total</span>
          <span className="font-display text-3xl font-extrabold tracking-tight">{format(q.total)}</span>
        </div>
      </div>

      <Button variant="brand" size="xl" className="mt-4 w-full" onClick={() => setPix(true)}>
        <Zap /> Comprar Agora via Pix
      </Button>
      <PixDialog
        open={pix}
        onOpenChange={setPix}
        amount={q.total}
        description={`${qty} ${type.unit === "GB" ? "GB" : "IPs"} ${type.name} · ${countryObj.name} · ${protocol === "HTTP" ? "HTTPS" : protocol}`}
      />
    </div>
  );
}
