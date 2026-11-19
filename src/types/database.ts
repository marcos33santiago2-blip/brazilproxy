export type UserRole = "client" | "reseller" | "admin";

export type TransactionStatus = "pending" | "paid" | "failed";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  balance: number;
}

/** Row shape of `proxies`. UI-only fields stay optional so a core table still loads. */
export interface ProxyRecord {
  id: string;
  user_id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  gb_limit: number;
  gb_used: number;
  status: string;
  protocol: "HTTP" | "SOCKS5" | null;
  proxy_type: string | null;
  country: string | null;
  city: string | null;
  expires_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: TransactionStatus;
  description: string | null;
  created_at: string | null;
}
