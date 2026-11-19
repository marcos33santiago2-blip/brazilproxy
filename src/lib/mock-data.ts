// Deterministic demo data (seeded) so SSR and the browser render the same values.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rnd = seeded(42);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));

export type ProxyStatus = "online" | "instavel" | "offline";
export type Proxy = {
  id: string;
  ip: string;
  port: number;
  user: string;
  pass: string;
  protocol: "HTTP" | "SOCKS5";
  type: string;
  country: string;
  flag: string;
  city: string;
  expires: string;
  daysLeft: number;
  status: ProxyStatus;
};

const LOCS = [
  { country: "Brasil", flag: "🇧🇷", cities: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Recife"] },
  { country: "Estados Unidos", flag: "🇺🇸", cities: ["Nova York", "Miami", "Dallas", "Los Angeles"] },
  { country: "Alemanha", flag: "🇩🇪", cities: ["Frankfurt", "Berlim"] },
  { country: "Reino Unido", flag: "🇬🇧", cities: ["Londres", "Manchester"] },
  { country: "Portugal", flag: "🇵🇹", cities: ["Lisboa", "Porto"] },
] as const;

const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const randomPass = (len = 12, r = rnd) => Array.from({ length: len }, () => chars[Math.floor(r() * chars.length)]).join("");
export const randomIp = (r = Math.random) =>
  `${[177, 186, 189, 191, 200, 201][Math.floor(r() * 6)]}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}.${1 + Math.floor(r() * 253)}`;

export const PROXIES: Proxy[] = Array.from({ length: 14 }, (_, i) => {
  const loc = i < 8 ? LOCS[0] : pick(LOCS);
  const days = int(1, 30);
  const d = new Date(Date.UTC(2026, 10, 19 + days));
  return {
    id: `px_${1000 + i}`,
    ip: randomIp(rnd),
    port: pick([8000, 8080, 1080, 3128, 9050, 10000 + i]),
    user: `bp_user${int(100, 999)}`,
    pass: randomPass(12),
    protocol: i % 3 === 0 ? "SOCKS5" : "HTTP",
    type: pick(["ISP Estático", "Residencial", "Móvel 4G", "DC IPv4"]),
    country: loc.country,
    flag: loc.flag,
    city: pick(loc.cities),
    expires: d.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
    daysLeft: days,
    status: i === 5 ? "instavel" : i === 11 ? "offline" : "online",
  };
});

export const TRANSACTIONS = [
  { id: "#PX-48211", date: "19/11/2026 08:42", desc: "Recarga via Pix", amount: 250, type: "credito" as const },
  { id: "#PX-48190", date: "18/11/2026 22:10", desc: "10x ISP Estático · Brasil", amount: -149, type: "debito" as const },
  { id: "#PX-48122", date: "17/11/2026 14:05", desc: "5 GB Residencial · EUA", amount: -85.05, type: "debito" as const },
  { id: "#PX-48010", date: "15/11/2026 09:31", desc: "Recarga via Pix", amount: 500, type: "credito" as const },
  { id: "#PX-47888", date: "12/11/2026 19:47", desc: "Renovação 3x Móvel 4G", amount: -119.7, type: "debito" as const },
];

export const USAGE_30D = Array.from({ length: 30 }, (_, i) => ({
  day: `${((i + 20) % 30) + 1}/${i < 10 ? "10" : "11"}`,
  gb: Math.round((2 + rnd() * 6 + (i > 20 ? 3 : 0)) * 10) / 10,
  req: int(18000, 52000),
}));

export const REVENUE_12M = ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"].map((m, i) => ({
  month: m,
  receita: Math.round(68000 + i * 9200 + rnd() * 14000),
  lucro: Math.round(29000 + i * 4300 + rnd() * 6000),
}));

export const RESELLER_SALES_30D = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  vendas: Math.round(380 + rnd() * 620 + i * 14),
  lucro: Math.round(160 + rnd() * 260 + i * 7),
}));

const FIRST = ["Lucas", "Mariana", "Rafael", "Juliana", "Bruno", "Camila", "Pedro", "Larissa", "Gustavo", "Fernanda", "Thiago", "Beatriz", "Diego", "Aline", "Felipe", "Natália"];
const LAST = ["Oliveira", "Souza", "Lima", "Costa", "Ferreira", "Almeida", "Ribeiro", "Martins", "Carvalho", "Rocha"];

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "Cliente" | "Revendedor";
  balance: number;
  orders: number;
  spent: number;
  joined: string;
  status: "ativo" | "bloqueado";
};

export const USERS: AppUser[] = Array.from({ length: 18 }, (_, i) => {
  const f = FIRST[i % FIRST.length];
  const l = pick(LAST);
  return {
    id: `u_${2400 + i}`,
    name: `${f} ${l}`,
    email: `${f.toLowerCase()}.${l.toLowerCase()}@${pick(["gmail.com", "outlook.com", "agencia.com.br", "hotmail.com"])}`,
    role: i % 4 === 0 ? "Revendedor" : "Cliente",
    balance: Math.round(rnd() * 180000) / 100,
    orders: int(1, 64),
    spent: Math.round(rnd() * 2400000) / 100,
    joined: `${int(1, 28).toString().padStart(2, "0")}/${int(1, 11).toString().padStart(2, "0")}/2026`,
    status: i === 6 || i === 13 ? "bloqueado" : "ativo",
  };
});

export const SUB_CLIENTS = Array.from({ length: 12 }, (_, i) => {
  const f = FIRST[(i + 5) % FIRST.length];
  const l = pick(LAST);
  return {
    id: `sc_${800 + i}`,
    name: `${f} ${l}`,
    email: `${f.toLowerCase()}@${pick(["gmail.com", "trafego.pro", "outlook.com"])}`,
    proxies: int(1, 40),
    spent: Math.round(rnd() * 380000) / 100,
    last: `${int(1, 19).toString().padStart(2, "0")}/11/2026`,
    status: i === 4 ? ("inativo" as const) : ("ativo" as const),
  };
});

export const RESELLER_ORDERS = Array.from({ length: 10 }, (_, i) => ({
  id: `#RV-${9120 - i * 7}`,
  client: SUB_CLIENTS[i].name,
  product: pick(["10x ISP Estático BR", "20 GB Residencial", "5x Móvel 4G", "50x DC IPv4", "200x IPv6"]),
  date: `${(19 - i).toString().padStart(2, "0")}/11/2026`,
  sale: Math.round(9000 + rnd() * 40000) / 100,
  cost: 0,
})).map((o) => ({ ...o, cost: Math.round(o.sale * 0.46 * 100) / 100 }));

export const UPSTREAMS = [
  { name: "IPRoyal", type: "Residencial / ISP", balance: 4820.5, latency: 84, uptime: 99.98, status: "operacional" as const },
  { name: "Oxylabs", type: "Residencial", balance: 12340.0, latency: 61, uptime: 99.99, status: "operacional" as const },
  { name: "Proxy-Seller", type: "Datacenter IPv4/IPv6", balance: 980.2, latency: 47, uptime: 99.91, status: "saldo-baixo" as const },
  { name: "SOAX", type: "Móvel 4G/5G", balance: 6420.75, latency: 132, uptime: 99.4, status: "degradado" as const },
];

export const CHILD_PANEL_REQUESTS = [
  { id: "pf_31", owner: "Agência Escala Digital", domain: "proxy.escaladigital.com.br", plan: "Ouro", date: "19/11/2026", status: "pendente" as const },
  { id: "pf_30", owner: "Rafael Ads Pro", domain: "ips.rafaeladspro.com", plan: "Prata", date: "18/11/2026", status: "pendente" as const },
  { id: "pf_29", owner: "Contingência Max", domain: "painel.contingenciamax.com.br", plan: "Ouro", date: "17/11/2026", status: "pendente" as const },
  { id: "pf_28", owner: "Infoprodutor Hub", domain: "proxies.infohub.app", plan: "Bronze", date: "15/11/2026", status: "aprovado" as const },
  { id: "pf_27", owner: "TurboScrape", domain: "net.turboscrape.io", plan: "Prata", date: "12/11/2026", status: "aprovado" as const },
];

export const API_LOGS = [
  { time: "10:12:44", method: "POST", path: "/v1/proxies/order", status: 201, ms: 212, source: "pf_28 · infohub" },
  { time: "10:12:31", method: "GET", path: "/v1/proxies?status=online", status: 200, ms: 38, source: "u_2404" },
  { time: "10:12:09", method: "POST", path: "/v1/proxies/px_1005/rotate", status: 200, ms: 640, source: "u_2411" },
  { time: "10:11:52", method: "POST", path: "/upstream/soax/allocate", status: 504, ms: 10012, source: "sistema" },
  { time: "10:11:40", method: "GET", path: "/v1/balance", status: 200, ms: 22, source: "pf_27 · turboscrape" },
  { time: "10:11:18", method: "POST", path: "/v1/pix/charge", status: 201, ms: 318, source: "u_2400" },
  { time: "10:10:57", method: "DELETE", path: "/v1/keys/key_93ab", status: 401, ms: 15, source: "ip 45.12.8.1" },
  { time: "10:10:33", method: "GET", path: "/v1/locations", status: 200, ms: 19, source: "u_2416" },
];

export const TICKETS = [
  { id: "#4821", subject: "IP bloqueado no Facebook Ads após 2h", user: "Mariana Costa", priority: "alta" as const, status: "aberto" as const, updated: "há 8 min" },
  { id: "#4819", subject: "Como configurar no Dolphin Anty?", user: "Lucas Lima", priority: "baixa" as const, status: "respondido" as const, updated: "há 32 min" },
  { id: "#4815", subject: "Pix pago e saldo não caiu", user: "Bruno Rocha", priority: "alta" as const, status: "aberto" as const, updated: "há 1 h" },
  { id: "#4810", subject: "Dúvida sobre domínio do Painel Filho", user: "Agência Escala Digital", priority: "media" as const, status: "em-andamento" as const, updated: "há 3 h" },
  { id: "#4802", subject: "Solicitação de troca de 5 IPs", user: "Camila Martins", priority: "media" as const, status: "resolvido" as const, updated: "ontem" },
];

export const API_KEYS = [
  { id: "key_live_8f2a", name: "Produção · Painel Filho", key: "bp_live_8f2a91c4e7d34b0a9f61c2e8d5b7a3f1", created: "02/10/2026", lastUsed: "há 2 min", scope: "total" },
  { id: "key_live_3c19", name: "Integração WHMCS", key: "bp_live_3c19ab7e0f4d42c18a9b6e5d7c3f2a10", created: "21/09/2026", lastUsed: "há 1 h", scope: "pedidos" },
  { id: "key_test_a71d", name: "Sandbox / Testes", key: "bp_test_a71d4e9c2b8f43a6d1e0c7b5f9a2e3d4", created: "14/08/2026", lastUsed: "há 6 dias", scope: "leitura" },
];
