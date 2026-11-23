export type UserRole = "client" | "reseller" | "admin";

export type TransactionStatus = "pending" | "paid" | "failed";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  balance: number;
}

/** Purchase row. `upstream_order_id` is the Proxy-Cheap order id, separate from the local uuid. */
export interface OrderRecord {
  id: string;
  user_id: string;
  external_id: string;
  upstream_order_id: string | null;
  service_id: string;
  plan_id: string;
  quantity: number;
  country: string;
  protocol: string | null;
  amount: number;
  status: TransactionStatus;
  created_at: string | null;
}

/**
 * Row shape of `proxies`. UI-only fields stay optional so a core table still loads.
 * Daily traffic is not a separate table: consumption lives on `gb_used`.
 */
export interface ProxyRecord {
  id: string;
  user_id: string;
  order_id?: string | null;
  upstream_order_id?: string | null;
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
  order_id?: string | null;
  /** Unique key for the charge. A repeated key must not debit the balance twice. */
  external_id?: string | null;
  amount: number;
  payment_method: string;
  status: TransactionStatus;
  description: string | null;
  created_at: string | null;
}
