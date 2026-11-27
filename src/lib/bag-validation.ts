// Pure helpers that check bag lines against freshly fetched products + stock.
// Rules (same as place_order): product must exist and be active, the size must still exist,
// and quantity must not exceed tracked stock. A size with no stock row is "not tracked" = available.
import { stockLeft, type Product } from "@/data/products";
import type { BagItem } from "@/context/bag-context";

/** Same cap place_order() enforces per line (qty 1-20). */
export const MAX_LINE_QUANTITY = 20;

export type LineIssue =
  | { kind: "unavailable" } // product deleted or deactivated
  | { kind: "size-gone" } // size no longer offered for this product
  | { kind: "sold-out" } // tracked at 0
  | { kind: "too-many"; left: number }; // tracked, quantity above what is left

export function validateBagLine(item: BagItem, products: Product[]): LineIssue | null {
  const product = products.find((p) => p.id === item.productId);
  if (!product) return { kind: "unavailable" };
  if (!product.sizes.includes(item.size)) return { kind: "size-gone" };
  const left = stockLeft(product, item.size);
  if (left === null)
    return item.quantity > MAX_LINE_QUANTITY ? { kind: "too-many", left: MAX_LINE_QUANTITY } : null;
  if (left <= 0) return { kind: "sold-out" };
  if (item.quantity > left) return { kind: "too-many", left };
  return null;
}

export function issueMessage(issue: LineIssue, size: string): string {
  switch (issue.kind) {
    case "unavailable":
      return "No longer available";
    case "size-gone":
      return `Size ${size} is no longer offered`;
    case "sold-out":
      return `Sold out in ${size}`;
    case "too-many":
      return `Only ${issue.left} left in ${size}`;
  }
}

/** Largest quantity a customer may hold for a size: tracked stock, or the per-line cap when untracked. */
export function maxQuantityFor(product: Product, size: string): number {
  const left = stockLeft(product, size);
  return left === null ? MAX_LINE_QUANTITY : Math.min(left, MAX_LINE_QUANTITY);
}
