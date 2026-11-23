import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "./CopyButton";
import { brl } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const PRESETS = [50, 100, 250, 500, 1000];
const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY?.trim() ?? "";

type Method = "pix" | "card";
type Phase = "form" | "waiting" | "paid" | "failed";

type MercadoPagoCard = {
  createCardToken: (data: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id?: string }>;
  getPaymentMethods: (params: { bin: string }) => Promise<{ results?: { id?: string }[] }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoCard;
  }
}

export function PixDialog({
  open,
  onOpenChange,
  amount: fixedAmount,
  description,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount?: number | undefined;
  description?: string | undefined;
  onPaid?: (amount: number) => void;
}) {
  const [method, setMethod] = useState<Method>("pix");
  const [amount, setAmount] = useState(fixedAmount ?? 100);
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState("");
  const [cpf, setCpf] = useState("");
  const paidNotified = useRef(false);

  useEffect(() => {
    if (!open) return;
    setMethod("pix");
    setAmount(fixedAmount ?? 100);
    setPhase("form");
    setBusy(false);
    setError(null);
    setPaymentId(null);
    setQrCode("");
    setQrImage("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setHolder("");
    setCpf("");
    paidNotified.current = false;
    if (!supabase) {
      setSignedIn(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session?.access_token));
    });
  }, [open, fixedAmount]);

  useEffect(() => {
    if (!open || !paymentId || phase === "paid" || phase === "failed") return;
    let stopped = false;
    const poll = async () => {
      const status = await readStatus(paymentId);
      if (stopped || !status) return;
      if (status === "approved") {
        setPhase("paid");
        if (!paidNotified.current) {
          paidNotified.current = true;
          onPaid?.(amount);
        }
      } else if (status === "rejected" || status === "cancelled") {
        setPhase("failed");
        setError("O pagamento não foi aprovado.");
      }
    };
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [open, paymentId, phase, amount, onPaid]);

  const generatePix = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await postPayment("/api/payments/mercadopago/pix", { amount, description });
      const id = readString(payload, "paymentId");
      const code = readString(payload, "qrCode");
      if (!payload["success"] || !id || !code) {
        setError(readString(payload, "error") ?? "Não foi possível gerar o Pix.");
        return;
      }
      setPaymentId(id);
      setQrCode(code);
      setQrImage(readString(payload, "qrCodeBase64") ?? "");
      setPhase("waiting");
    } catch {
      setError("Não foi possível gerar o Pix.");
    } finally {
      setBusy(false);
    }
  };

  const payCard = async () => {
    const parsedExpiry = splitExpiry(expiry);
    const number = cardNumber.replace(/\D/g, "");
    const document = cpf.replace(/\D/g, "");
    if (
      number.length < 13 ||
      !parsedExpiry ||
      cvv.trim().length < 3 ||
      holder.trim().length < 3 ||
      document.length !== 11
    ) {
      setError("Preencha número, validade, CVV, nome e CPF do titular.");
      return;
    }
    if (!PUBLIC_KEY) {
      setError("A chave pública do Mercado Pago não está configurada.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mp = await loadMercadoPago(PUBLIC_KEY);
      const methods = await mp.getPaymentMethods({ bin: number.slice(0, 8) });
      const paymentMethodId = methods.results?.[0]?.id;
      if (!paymentMethodId) {
        setError("Não reconhecemos a bandeira deste cartão.");
        return;
      }
      const token = await mp.createCardToken({
        cardNumber: number,
        cardholderName: holder.trim(),
        cardExpirationMonth: parsedExpiry.month,
        cardExpirationYear: parsedExpiry.year,
        securityCode: cvv.trim(),
        identificationType: "CPF",
        identificationNumber: document,
      });
      if (!token.id) {
        setError("Não foi possível validar o cartão.");
        return;
      }
      const payload = await postPayment("/api/payments/mercadopago/card", {
        amount,
        description,
        token: token.id,
        paymentMethodId,
        installments: 1,
        cpf: document,
      });
      const id = readString(payload, "paymentId");
      const status = readString(payload, "status");
      if (!payload["success"] || !id) {
        setError(readString(payload, "error") ?? "O cartão não foi aprovado.");
        setPhase("failed");
        return;
      }
      setPaymentId(id);
      if (status === "approved") {
        setPhase("paid");
        if (!paidNotified.current) {
          paidNotified.current = true;
          onPaid?.(amount);
        }
        toast.success("Pagamento aprovado.");
      } else if (status === "rejected" || status === "cancelled") {
        setPhase("failed");
        setError("O cartão não foi aprovado.");
      } else {
        setPhase("waiting");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível pagar com cartão.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto border-night-border bg-gradient-night p-0 text-night-foreground shadow-elevated sm:w-full">
        <div className="space-y-5 px-5 py-6 pr-12 sm:px-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-bold text-night-foreground">
              {phase === "paid" ? "Pagamento confirmado" : "Finalizar pagamento"}
            </DialogTitle>
            <DialogDescription className="text-night-muted">
              {description ?? "Escolha Pix ou cartão. A liberação acontece depois da aprovação."}
            </DialogDescription>
          </DialogHeader>

          {phase !== "paid" && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-night-foreground/5 p-1">
              <MethodButton
                active={method === "pix"}
                onClick={() => setMethod("pix")}
                icon={<QrCode className="size-4" />}
                label="Pagar com Pix"
              />
              <MethodButton
                active={method === "card"}
                onClick={() => setMethod("card")}
                icon={<CreditCard className="size-4" />}
                label="Pagar com Cartão de Crédito"
              />
            </div>
          )}

          {signedIn === false && phase !== "paid" && (
            <div className="rounded-xl border border-night-border bg-night-foreground/5 p-4 text-sm">
              Entre na sua conta para concluir o pagamento.
              <Button variant="brand" className="mt-3 w-full" asChild>
                <Link to="/entrar">Entrar</Link>
              </Button>
            </div>
          )}

          {signedIn === null && phase !== "paid" && (
            <p className="text-sm text-night-muted">Verificando a sessão…</p>
          )}

          {signedIn === true && phase === "form" && (
            <>
              {fixedAmount === undefined ? (
                <AmountPicker amount={amount} onChange={setAmount} />
              ) : (
                <div className="rounded-xl border border-night-border bg-night-foreground/5 px-4 py-3">
                  <div className="text-xs text-night-muted">Total</div>
                  <div className="font-display text-3xl font-extrabold">{brl(amount)}</div>
                </div>
              )}

              {method === "pix" ? (
                <Button
                  variant="brand"
                  size="xl"
                  className="w-full"
                  disabled={busy || amount < 10}
                  onClick={() => void generatePix()}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <QrCode />}
                  Gerar Pix de {brl(amount)}
                </Button>
              ) : (
                <CardFields
                  cardNumber={cardNumber}
                  expiry={expiry}
                  cvv={cvv}
                  holder={holder}
                  cpf={cpf}
                  busy={busy}
                  amount={amount}
                  onCardNumber={setCardNumber}
                  onExpiry={setExpiry}
                  onCvv={setCvv}
                  onHolder={setHolder}
                  onCpf={setCpf}
                  onSubmit={() => void payCard()}
                />
              )}
            </>
          )}

          {phase === "waiting" && method === "pix" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-night-muted">Total a pagar</div>
                <div className="font-display text-3xl font-extrabold">{brl(amount)}</div>
              </div>
              {qrImage ? (
                <img
                  src={`data:image/png;base64,${qrImage}`}
                  alt="QR Code Pix"
                  className="mx-auto size-52 rounded-xl bg-white p-3"
                />
              ) : null}
              <div>
                <div className="mb-1.5 text-xs font-medium text-night-muted">Pix Copia e Cola</div>
                <div className="flex items-center gap-2 rounded-lg border border-night-border bg-night-foreground/5 p-2 pl-3">
                  <code className="flex-1 truncate font-mono text-xs">{qrCode}</code>
                  <CopyButton
                    value={qrCode}
                    label="Código Pix"
                    className="text-night-muted hover:text-night-foreground"
                  />
                </div>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-xs text-night-muted">
                <ShieldCheck className="size-3.5" /> Aguardando a confirmação do pagamento…
              </p>
            </div>
          )}

          {phase === "waiting" && method === "card" && (
            <p className="rounded-xl border border-night-border px-4 py-6 text-center text-sm text-night-muted">
              O cartão está em análise. Assim que o Mercado Pago aprovar, o saldo é creditado.
            </p>
          )}

          {phase === "paid" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-success-soft">
                <CheckCircle2 className="size-9 text-success" />
              </div>
              <div className="font-display text-xl font-bold">{brl(amount)} confirmados</div>
              <p className="mt-1 text-sm text-night-muted">
                O pagamento foi aprovado e o saldo já pode ser usado.
              </p>
              <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </div>
          )}

          {error && phase !== "paid" && (
            <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber-foreground">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight transition-all sm:text-sm",
        active
          ? "bg-card text-foreground shadow-soft"
          : "text-night-muted hover:text-night-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function AmountPicker({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (amount: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cn(
              "rounded-lg border py-2 text-sm font-semibold",
              amount === preset
                ? "border-cyan bg-cyan-soft text-cyan"
                : "border-night-border text-night-foreground hover:border-cyan/40",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <label className="block text-xs font-medium text-night-muted">
        Outro valor (R$)
        <Input
          type="number"
          min={10}
          value={amount}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className="mt-1.5 h-11 border-night-border bg-night-foreground/5 font-mono text-lg text-night-foreground"
        />
      </label>
    </div>
  );
}

function CardFields({
  cardNumber,
  expiry,
  cvv,
  holder,
  cpf,
  busy,
  amount,
  onCardNumber,
  onExpiry,
  onCvv,
  onHolder,
  onCpf,
  onSubmit,
}: {
  cardNumber: string;
  expiry: string;
  cvv: string;
  holder: string;
  cpf: string;
  busy: boolean;
  amount: number;
  onCardNumber: (value: string) => void;
  onExpiry: (value: string) => void;
  onCvv: (value: string) => void;
  onHolder: (value: string) => void;
  onCpf: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Número do cartão">
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          value={formatCard(cardNumber)}
          onChange={(event) => onCardNumber(event.target.value)}
          className={fieldClass}
          placeholder="0000 0000 0000 0000"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Validade">
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={(event) => onExpiry(formatExpiry(event.target.value))}
            className={fieldClass}
            placeholder="MM/AA"
          />
        </Field>
        <Field label="CVV">
          <Input
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvv}
            onChange={(event) => onCvv(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className={fieldClass}
            placeholder="123"
          />
        </Field>
      </div>
      <Field label="Nome do titular">
        <Input
          autoComplete="cc-name"
          value={holder}
          onChange={(event) => onHolder(event.target.value)}
          className={fieldClass}
          placeholder="Como está no cartão"
        />
      </Field>
      <Field label="CPF do titular">
        <Input
          inputMode="numeric"
          value={formatCpf(cpf)}
          onChange={(event) => onCpf(event.target.value)}
          className={fieldClass}
          placeholder="000.000.000-00"
        />
      </Field>
      <Button
        type="submit"
        variant="brand"
        size="xl"
        className="w-full"
        disabled={busy || amount < 10}
      >
        {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}
        Pagar {brl(amount)} no cartão
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-night-muted">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const fieldClass =
  "h-11 border-night-border bg-night-foreground/5 text-night-foreground placeholder:text-night-muted";

async function postPayment(
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error("Entre na sua conta para pagar.");
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Entre na sua conta para pagar.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return payload ?? { success: false, error: "Não foi possível concluir o pagamento." };
}

async function readStatus(paymentId: string): Promise<string | null> {
  if (!supabase) return null;
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return null;
  const response = await fetch(
    `/api/payments/mercadopago/status?id=${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return readString(payload, "status");
}

async function loadMercadoPago(publicKey: string): Promise<MercadoPagoCard> {
  if (!window.MercadoPago) {
    await new Promise<void>((resolve, reject) => {
      const found = document.querySelector<HTMLScriptElement>("script[data-mp-sdk='true']");
      if (found) {
        found.addEventListener("load", () => resolve(), { once: true });
        found.addEventListener(
          "error",
          () => reject(new Error("Não foi possível carregar o Mercado Pago.")),
          { once: true },
        );
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.dataset["mpSdk"] = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar o Mercado Pago."));
      document.head.appendChild(script);
    });
  }
  if (!window.MercadoPago) throw new Error("Não foi possível carregar o Mercado Pago.");
  return new window.MercadoPago(publicKey, { locale: "pt-BR" });
}

function splitExpiry(value: string): { month: string; year: string } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  const monthText = match?.[1];
  const yearText = match?.[2];
  if (!monthText || !yearText) return null;
  const month = Number(monthText);
  if (month < 1 || month > 12) return null;
  return { month: monthText, year: `20${yearText}` };
}

function formatCard(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function readString(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
