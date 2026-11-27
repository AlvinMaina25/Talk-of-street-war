import { LOW_STOCK_THRESHOLD } from "@/data/products";
import type { OrderStatus } from "@/lib/orders-api";
import { db } from "@/lib/products-api";

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  soldOut: number;
  lowStock: number;
  newOrders: number;
  ordersThisMonth: number;
}

export interface RecentOrder {
  id: string;
  order_no: string;
  customer_name: string;
  total: number;
  status: OrderStatus;
  created_at: string;
}

export interface ActivityEntry {
  id: number;
  created_at: string;
  actor_email: string | null;
  entity_type: "product" | "stock" | "order";
  action: string;
  summary: string;
}

async function count(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count: n, error } = await query;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

/** Same rules as the Products page: sold out = every size tracked at 0; low = any tracked size at or under the threshold. */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, stock, newOrders, ordersThisMonth] = await Promise.all([
    db.from("products").select("*"),
    db.from("product_stock").select("product_id, size, quantity"),
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString())
        .neq("status", "cancelled"),
    ),
  ]);
  if (products.error) throw new Error(products.error.message);
  if (stock.error) throw new Error(stock.error.message);

  const tracked: Record<string, Record<string, number>> = {};
  for (const r of stock.data as { product_id: string; size: string; quantity: number }[]) {
    (tracked[r.product_id] ??= {})[r.size] = r.quantity;
  }

  let soldOut = 0;
  let lowStock = 0;
  const rows = products.data as { id: string; sizes: string[]; is_active: boolean; allow_preorder?: boolean }[];
  for (const p of rows) {
    if (!p.is_active) continue; // hidden products don't need restocking attention
    if (p.allow_preorder) continue; // pre-order pieces are sourced on request, not restocked
    const t = tracked[p.id] ?? {};
    const isSoldOut = p.sizes.length > 0 && p.sizes.every((s) => t[s] === 0);
    if (isSoldOut) soldOut++;
    else if (p.sizes.some((s) => t[s] !== undefined && t[s] <= LOW_STOCK_THRESHOLD)) lowStock++;
  }

  return {
    totalProducts: rows.length,
    activeProducts: rows.filter((p) => p.is_active).length,
    soldOut,
    lowStock,
    newOrders,
    ordersThisMonth,
  };
}

export async function fetchRecentOrders(limit = 6): Promise<RecentOrder[]> {
  const { data, error } = await db
    .from("orders")
    .select("id, order_no, customer_name, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as RecentOrder[];
}

export async function fetchActivity(limit = 15): Promise<ActivityEntry[]> {
  const { data, error } = await db
    .from("activity_log")
    .select("id, created_at, actor_email, entity_type, action, summary")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as ActivityEntry[];
}
