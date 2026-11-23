import type { ProxyTypeId } from "@/lib/pricing";

export type FeaturedProduct = {
  id: ProxyTypeId;
  title: string;
  pill: string;
  badge: string;
  headline: string;
  description: string;
  note: string;
  points: string[];
  primary: boolean;
};

/** Homepage catalog. The full price list stays available in the client panel. */
export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: "isp",
    title: "ISP Estático Residencial (IP Fixo)",
    pill: "ISP Estático",
    badge: "Principal",
    headline: "IP fixo de operadora brasileira, exclusivo da sua operação",
    description:
      "IPs de operadoras brasileiras reais — Vivo, Claro e Tim. O endereço se comporta como o de um assinante residencial, então você não sofre bloqueio em tráfego pago, redes sociais, automações e e-commerce.",
    note: "Feito para anúncios, contas e lojas que precisam de um IP estável e aceito pelas plataformas.",
    points: [
      "IPs reais de Vivo, Claro e Tim",
      "Sem bloqueio em tráfego pago",
      "Estável em redes sociais, automações e e-commerce",
      "IP fixo e exclusivo: 1 IP para 1 cliente",
    ],
    primary: true,
  },
  {
    id: "ipv4",
    title: "Datacenter IPv4",
    pill: "Datacenter IPv4",
    badge: "Econômico",
    headline: "IPv4 de datacenter para volume e velocidade",
    description: "Latência baixa e o menor preço por IP quando a tarefa não precisa parecer um acesso residencial.",
    note: "Uso ideal: monitoramento, testes e automações de volume. Para tráfego pago, redes sociais e e-commerce, use o ISP Estático.",
    points: ["Menor custo por IP", "Até 1 Gbps e banda larga", "Bom para bots, monitoramento e testes", "Menos indicado para anúncios e redes sociais"],
    primary: false,
  },
];

export function getFeaturedProduct(id: ProxyTypeId): FeaturedProduct {
  return FEATURED_PRODUCTS.find((product) => product.id === id) ?? FEATURED_PRODUCTS[0];
}
