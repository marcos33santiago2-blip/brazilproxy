import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, QrCode, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "./CopyButton";
import { brl } from "@/lib/currency";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Draws a deterministic QR-like matrix from a string (visual simulation only). */
function FakeQr({ value }: { value: string }) {
  const size = 29;
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const out: boolean[] = [];
    for (let i = 0; i < size * size; i++) {
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      out.push(((h >>> 0) & 7) < 3);
    }
    return out;
  }, [value]);
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy;
        const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return ring || core ? 1 : 0;
      }
    }
    return -1;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-full" shapeRendering="crispEdges">
      <rect width={size} height={size} className="fill-card" />
      {cells.map((on, i) => {
        const x = i % size, y = Math.floor(i / size);
        const f = finder(x, y);
        const fill = f === -1 ? on : f === 1;
        return fill ? <rect key={i} x={x} y={y} width={1} height={1} className="fill-foreground" /> : null;
      })}
    </svg>
  );
}

const PRESETS = [50, 100, 250, 500, 1000];

export function PixDialog({
  open,
  onOpenChange,
  amount: fixedAmount,
  description,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  amount?: number;
  description?: string;
  onPaid?: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(fixedAmount ?? 100);
  const [step, setStep] = useState<"valor" | "qr" | "pago">(fixedAmount ? "qr" : "valor");
  const [seconds, setSeconds] = useState(15 * 60);

  useEffect(() => {
    if (open) {
      setAmount(fixedAmount ?? 100);
      setStep(fixedAmount ? "qr" : "valor");
      setSeconds(15 * 60);
    }
  }, [open, fixedAmount]);

  useEffect(() => {
    if (!open || step !== "qr") return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open, step]);

  const code = useMemo(
    () =>
      `00020126580014br.gov.bcb.pix0136${BRAND.domain}-${Math.round(amount * 100)}5204000053039865406${amount.toFixed(2)}5802BR5911${BRAND.name.toUpperCase().slice(0, 11)}6009SAO PAULO62070503***6304A1F3`,
    [amount],
  );

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="bg-gradient-night px-6 pb-5 pt-6 text-night-foreground">
          <DialogHeader className="text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-cyan">
              <Zap className="size-3.5" /> Pagamento instantâneo
            </div>
            <DialogTitle className="text-2xl font-bold text-night-foreground">
              {step === "pago" ? "Pagamento confirmado" : "Pagar com Pix"}
            </DialogTitle>
            <DialogDescription className="text-night-muted">
              {description ?? "Saldo creditado automaticamente em poucos segundos."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {step === "valor" && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-semibold transition-all",
                      amount === p ? "border-primary bg-primary-soft text-primary" : "hover:border-primary/40",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Outro valor (R$)</label>
                <Input
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="h-11 font-mono text-lg"
                />
              </div>
              <Button variant="brand" size="xl" className="w-full" disabled={amount < 10} onClick={() => setStep("qr")}>
                <QrCode /> Gerar QR Code Pix de {brl(amount)}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Valor mínimo R$ 10,00</p>
            </>
          )}

          {step === "qr" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total a pagar</div>
                  <div className="font-display text-2xl font-bold">{brl(amount)}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 font-mono text-xs font-semibold text-amber-foreground">
                  <Clock className="size-3.5" /> {mm}:{ss}
                </div>
              </div>
              <div className="mx-auto size-52 rounded-xl border bg-card p-3 shadow-soft">
                <FakeQr value={code} />
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Pix Copia e Cola</div>
                <div className="flex items-center gap-2 rounded-lg border bg-surface p-2 pl-3">
                  <code className="flex-1 truncate font-mono text-xs">{code}</code>
                  <CopyButton value={code} label="Código Pix" />
                </div>
              </div>
              <Button
                variant="brand"
                size="xl"
                className="w-full"
                onClick={() => {
                  setStep("pago");
                  onPaid?.(amount);
                  toast.success(`Pix de ${brl(amount)} confirmado!`);
                }}
              >
                Simular pagamento confirmado
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Aguardando confirmação do banco…
              </p>
            </>
          )}

          {step === "pago" && (
            <div className="py-4 text-center animate-fade-up">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-success-soft">
                <CheckCircle2 className="size-9 text-success" />
              </div>
              <div className="font-display text-xl font-bold">{brl(amount)} recebidos</div>
              <p className="mt-1 text-sm text-muted-foreground">Seus proxies/saldo já estão disponíveis no painel.</p>
              <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
