export type ProxyTypeId = "residencial" | "isp" | "movel" | "ipv4" | "ipv6";

export type ProxyType = {
  id: ProxyTypeId;
  name: string;
  short: string;
  unit: "GB" | "IP";
  /** Retail price in BRL per unit (per GB, or per IP per month). */
  basePrice: number;
  /** Cost paid to the upstream supplier, in BRL per unit. */
  upstreamCost: number;
  min: number;
  max: number;
  step: number;
  defaultQty: number;
};

export const PROXY_TYPES: ProxyType[] = [
  { id: "residencial", name: "Residencial Rotativo", short: "Residencial", unit: "GB", basePrice: 18.9, upstreamCost: 7.4, min: 1, max: 1000, step: 1, defaultQty: 10 },
  { id: "isp", name: "ISP Estático", short: "ISP Estático", unit: "IP", basePrice: 14.9, upstreamCost: 5.2, min: 1, max: 500, step: 1, defaultQty: 10 },
  { id: "movel", name: "Móvel 4G/5G", short: "Móvel 4G/5G", unit: "GB", basePrice: 39.9, upstreamCost: 17.5, min: 1, max: 500, step: 1, defaultQty: 5 },
  { id: "ipv4", name: "Datacenter IPv4", short: "DC IPv4", unit: "IP", basePrice: 7.9, upstreamCost: 2.6, min: 1, max: 1000, step: 1, defaultQty: 25 },
  { id: "ipv6", name: "Datacenter IPv6", short: "DC IPv6", unit: "IP", basePrice: 1.49, upstreamCost: 0.38, min: 10, max: 10000, step: 10, defaultQty: 100 },
];

export type Country = { code: string; name: string; flag: string; multiplier: number; region: string };

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", multiplier: 1, region: "América do Sul" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", multiplier: 0.9, region: "América do Norte" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", multiplier: 1.1, region: "Europa" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", multiplier: 1.1, region: "Europa" },
  { code: "FR", name: "França", flag: "🇫🇷", multiplier: 1.1, region: "Europa" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", multiplier: 1.05, region: "Europa" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", multiplier: 1, region: "América do Norte" },
  { code: "MX", name: "México", flag: "🇲🇽", multiplier: 1, region: "América do Norte" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", multiplier: 1, region: "América do Sul" },
  { code: "JP", name: "Japão", flag: "🇯🇵", multiplier: 1.2, region: "Ásia" },
];

/** Volume discount tiers: quantity threshold -> discount fraction. */
export const VOLUME_TIERS = [
  { min: 500, discount: 0.2 },
  { min: 100, discount: 0.15 },
  { min: 50, discount: 0.1 },
  { min: 10, discount: 0.05 },
];

export function volumeDiscount(qty: number): number {
  return VOLUME_TIERS.find((t) => qty >= t.min)?.discount ?? 0;
}

export function getProxyType(id: ProxyTypeId): ProxyType {
  const t = PROXY_TYPES.find((p) => p.id === id);
  if (!t) throw new Error(`Unknown proxy type ${id}`);
  return t;
}

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function unitPrice(typeId: ProxyTypeId, countryCode: string): number {
  return round2(getProxyType(typeId).basePrice * getCountry(countryCode).multiplier);
}

export function quote(typeId: ProxyTypeId, countryCode: string, qty: number) {
  const unit = unitPrice(typeId, countryCode);
  const subtotal = round2(unit * qty);
  const discountRate = volumeDiscount(qty);
  const discount = round2(subtotal * discountRate);
  return { unit, subtotal, discountRate, discount, total: round2(subtotal - discount) };
}

/** Same total the buy screen charges: IP plans bill per month, with 10% off on 90 days. */
export function orderTotal(typeId: ProxyTypeId, countryCode: string, qty: number, period: "30" | "90"): number {
  const type = getProxyType(typeId);
  const priced = quote(typeId, countryCode, qty);
  const months = period === "90" ? 3 : 1;
  const factor = type.unit === "IP" ? months * (months === 3 ? 0.9 : 1) : 1;
  return round2(priced.total * factor);
}

export function isProxyTypeId(value: string): value is ProxyTypeId {
  return PROXY_TYPES.some((type) => type.id === value);
}

/** Reseller levels: wholesale discount over retail price. Max is 60%. */
export const RESELLER_LEVELS = [
  { id: "bronze", name: "Bronze", discount: 0.3, minMonthly: 0 },
  { id: "prata", name: "Prata", discount: 0.45, minMonthly: 2000 },
  { id: "ouro", name: "Ouro", discount: 0.6, minMonthly: 8000 },
] as const;

export type ResellerLevelId = (typeof RESELLER_LEVELS)[number]["id"];

/** Monthly fee of a white-label Painel Filho, in BRL. */
export const CHILD_PANEL_FEE = 97;

export function wholesalePrice(typeId: ProxyTypeId, level: ResellerLevelId): number {
  const lvl = RESELLER_LEVELS.find((l) => l.id === level)!;
  return round2(getProxyType(typeId).basePrice * (1 - lvl.discount));
}

export function resellerProfit(opts: {
  typeId: ProxyTypeId;
  level: ResellerLevelId;
  qty: number;
  sellPrice: number;
  childPanel: boolean;
}) {
  const cost = round2(wholesalePrice(opts.typeId, opts.level) * opts.qty);
  const revenue = round2(opts.sellPrice * opts.qty);
  const fee = opts.childPanel ? CHILD_PANEL_FEE : 0;
  const profit = round2(revenue - cost - fee);
  return { revenue, cost, fee, profit, margin: revenue > 0 ? profit / revenue : 0 };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
