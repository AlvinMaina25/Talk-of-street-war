import { db } from "@/lib/products-api";

export const ORDER_STATUSES = ["new", "confirmed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  product_id: string;
  slug: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface OrderRow {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  notes: string | null;
  order_notes: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
}

/** Error shown to the customer; the order was refused on purpose (empty bag, out of stock, bad phone...). */
export class OrderRejectedError extends Error {}

/**
 * Saves the order through the place_order() database function, which checks names,
 * prices and stock on the server. Returns the order number, e.g. "TO-1001".
 */
export async function placeOrder(input: {
  name: string;
  phone: string;
  notes: string;
  items: { productId: string; size: string; quantity: number }[];
}): Promise<string> {
  const { data, error } = await db.rpc("place_order", {
    _customer_name: input.name,
    _phone: input.phone,
    _notes: input.notes,
    _items: input.items.map((i) => ({ product_id: i.productId, size: i.size, qty: i.quantity })),
  });
  if (error) {
    const match = /Order rejected: (.*)/.exec(error.message);
    if (match) throw new OrderRejectedError(match[1]);
    throw new Error(error.message);
  }
  return data as string;
}
