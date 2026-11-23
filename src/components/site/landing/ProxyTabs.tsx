import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixDialog } from "@/components/brand/PixDialog";
import { PixReleaseBanner } from "@/components/site/landing/PixReleaseBanner";
import { FEATURED_PRODUCTS } from "@/components/site/landing/featured-products";
import { useCurrency } from "@/lib/currency";
import { getProxyType, quote } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function ProxyTabs() {
  const { format } = useCurrency();
  const [pix, setPix] = useState<{ amount: number; desc: string } | null>(null);

  return (
    <section id="produtos" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold text-primary">Produtos</div>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">O IP certo para a sua operação</h2>
          <p className="mt-3 text-muted-foreground">
            ISP estático de operadora brasileira para o que não pode ser bloqueado. Datacenter IPv4 quando o objetivo é volume e preço.
          </p>
        </div>
        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          {FEATURED_PRODUCTS.map((product) => {
            const type = getProxyType(product.id);
            const starter = quote(product.id, "BR", type.defaultQty);
            return (
              <article
                key={product.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft",
                  product.primary && "ring-2 ring-primary",
                )}
              >
                <div className="flex flex-1 flex-col p-8 sm:p-10">
                  <span
                    className={cn(
                      "w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                      product.primary ? "bg-amber text-night" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {product.badge}
                  </span>
                  <h3 className="mt-4 text-2xl font-bold">{product.title}</h3>
                  <p className="mt-2 text-base font-medium">{product.headline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                  <p className={cn("mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed", product.primary ? "bg-primary-soft text-foreground" : "border bg-surface text-muted-foreground")}>
                    {product.note}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {product.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft">
                          <Check className="size-3 text-primary" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t bg-gradient-night p-8 text-night-foreground sm:p-10">
                  <div className="text-sm text-night-muted">A partir de</div>
                  <div className="font-display text-4xl font-extrabold">
                    {format(type.basePrice)}
                    <span className="text-base font-medium text-night-muted">/IP·mês</span>
                  </div>
                  <PixReleaseBanner className="mt-5" compact />
                  <Button
                    variant="brand"
                    size="lg"
                    className="mt-4 w-full"
                    onClick={() =>
                      setPix({
                        amount: starter.total,
                        desc: `${type.defaultQty} IPs ${product.title} · Brasil`,
                      })
                    }
                  >
                    <Zap /> Comprar {type.defaultQty} IPs por {format(starter.total)}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <PixDialog open={!!pix} onOpenChange={(open) => !open && setPix(null)} amount={pix?.amount} description={pix?.desc} />
    </section>
  );
}
