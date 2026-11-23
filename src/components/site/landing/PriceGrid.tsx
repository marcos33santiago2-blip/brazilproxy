import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PixDialog } from "@/components/brand/PixDialog";
import { PixReleaseBanner } from "@/components/site/landing/PixReleaseBanner";
import { FEATURED_PRODUCTS, getFeaturedProduct } from "@/components/site/landing/featured-products";
import { useCurrency } from "@/lib/currency";
import { COUNTRIES, getProxyType, quote, unitPrice, type ProxyTypeId } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const FEATURED = ["BR", "US", "GB", "DE", "PT", "JP"];

export function PriceGrid() {
  const { format } = useCurrency();
  const [typeId, setTypeId] = useState<ProxyTypeId>("isp");
  const [pix, setPix] = useState<{ amount: number; desc: string } | null>(null);
  const product = getFeaturedProduct(typeId);
  const quantity = getProxyType(product.id).defaultQty;

  return (
    <section id="precos" className="scroll-mt-20 bg-surface py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-primary">Escolha do cliente</div>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Preços por país</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{product.note}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-soft">
            {FEATURED_PRODUCTS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTypeId(option.id)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-all", typeId === option.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {option.pill}
              </button>
            ))}
          </div>
        </div>
        <PixReleaseBanner className="mt-8" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTRIES.filter((c) => FEATURED.includes(c.code)).map((c, i) => {
            const price = unitPrice(product.id, c.code);
            const q = quote(product.id, c.code, quantity);
            return (
              <button
                key={c.code}
                onClick={() => setPix({ amount: q.total, desc: `${quantity} IPs ${product.title} · ${c.name}` })}
                className={cn(
                  "group relative rounded-2xl border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated",
                  i === 0 && "ring-2 ring-primary",
                )}
              >
                {i === 0 && (
                  <span className="absolute -top-2.5 right-5 rounded-full bg-amber px-2.5 py-0.5 text-[11px] font-bold text-night">Mais vendido</span>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.flag}</span>
                  <div>
                    <div className="font-display font-bold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{product.title}</div>
                  </div>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-xs text-muted-foreground">a partir de</span>
                </div>
                <div className="font-display text-3xl font-extrabold">
                  {format(price)}
                  <span className="text-sm font-medium text-muted-foreground">/IP·mês</span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {quantity} IPs · <span className="font-semibold text-foreground">{format(q.total)}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    Comprar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <PixDialog open={!!pix} onOpenChange={(o) => !o && setPix(null)} amount={pix?.amount} description={pix?.desc} />
    </section>
  );
}
