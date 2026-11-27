// Product data access. The storefront reads active products from Supabase and falls back
// to the bundled catalogue only if the request fails (e.g. table not created yet).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { products as fallbackProducts, type Product } from "@/data/products";

// The generated Database types don't know about `products` yet, so use an untyped client.
export const db = supabase as unknown as SupabaseClient;

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  description: string;
  alt: string;
  sizes: string[];
  is_new: boolean;
  is_limited: boolean;
  /** Missing until preorder-setup.sql has been run. */
  allow_preorder?: boolean;
  preorder_lead_time?: string | null;
  is_active: boolean;
  images: string[];
  created_at: string;
}

export interface StockRow {
  product_id: string;
  size: string;
  quantity: number;
}

export function rowToProduct(row: ProductRow, stock?: Record<string, number>): Product {
  const images = row.images ?? [];
  return {
    id: row.slug, // storefront routes and bag use the slug as the product id
    name: row.name,
    price: row.price,
    category: row.category,
    image: images[0] ?? "/images/talk-of-hero.webp",
    gallery: images.length > 1 ? images : undefined,
    alt: row.alt || row.name,
    sizes: row.sizes ?? [],
    isNew: row.is_new,
    isLimited: row.is_limited,
    allowPreorder: row.allow_preorder === true,
    preorderLeadTime: row.preorder_lead_time ?? "",
    description: row.description ?? "",
    created_at: row.created_at,
    ...(stock && Object.keys(stock).length ? { stock } : {}),
  };
}

/** Live products + stock. Throws on failure (no bundled fallback) so callers can tell "unknown" from "gone". */
export async function fetchActiveProductsStrict(): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  // Stock is optional: if the table isn't there yet, every size is treated as available.
  const { data: stockRows } = await db.from("product_stock").select("product_id, size, quantity");
  const byProduct = new Map<string, Record<string, number>>();
  for (const r of (stockRows ?? []) as StockRow[]) {
    byProduct.set(r.product_id, { ...(byProduct.get(r.product_id) ?? {}), [r.size]: r.quantity });
  }
  return (data as ProductRow[]).map((row) => rowToProduct(row, byProduct.get(row.id)));
}

export async function fetchActiveProducts(): Promise<Product[]> {
  try {
    return await fetchActiveProductsStrict();
  } catch (error) {
    console.error("fetchActiveProducts failed, using bundled catalogue", (error as Error).message);
    return fallbackProducts;
  }
}

export async function fetchProductBySlug(
  slug: string,
): Promise<{ product: Product | null; all: Product[] }> {
  const all = await fetchActiveProducts();
  return { product: all.find((p) => p.id === slug) ?? null, all };
}
