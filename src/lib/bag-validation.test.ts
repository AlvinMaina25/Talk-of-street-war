import { describe, expect, it } from "vitest";

import {
  isLowStock,
  isSoldOut,
  needsPreorder,
  relatedProducts,
  soldOutLast,
  stockLeft,
  type Product,
} from "@/data/products";
import {
  MAX_LINE_QUANTITY,
  issueMessage,
  maxQuantityFor,
  validateBagLine,
} from "@/lib/bag-validation";
import { scaleFor } from "@/lib/image-compress";

const make = (id: string, over: Partial<Product> = {}): Product => ({
  id,
  name: id,
  price: 1000,
  category: "Tops",
  image: "/x.webp",
  alt: id,
  sizes: ["S", "M", "L"],
  description: "",
  ...over,
});

describe("validateBagLine", () => {
  const tee = make("tee", { stock: { M: 2, L: 0 } }); // S is not tracked

  it("accepts quantities within tracked stock and any quantity on untracked sizes", () => {
    expect(validateBagLine({ productId: "tee", size: "M", quantity: 2 }, [tee])).toBeNull();
    expect(validateBagLine({ productId: "tee", size: "S", quantity: 5 }, [tee])).toBeNull();
  });

  it("blocks stock 2 at quantity 3 with an 'Only 2 left' message and a reduce target", () => {
    const issue = validateBagLine({ productId: "tee", size: "M", quantity: 3 }, [tee]);
    expect(issue).toEqual({ kind: "too-many", left: 2 });
    expect(issueMessage(issue!, "M")).toBe("Only 2 left in M");
  });

  it("flags sold-out sizes, vanished sizes and missing products", () => {
    expect(validateBagLine({ productId: "tee", size: "L", quantity: 1 }, [tee])).toEqual({
      kind: "sold-out",
    });
    expect(validateBagLine({ productId: "tee", size: "XXL", quantity: 1 }, [tee])).toEqual({
      kind: "size-gone",
    });
    const gone = validateBagLine({ productId: "deleted-or-inactive", size: "M", quantity: 1 }, [
      tee,
    ]);
    expect(gone).toEqual({ kind: "unavailable" });
    expect(issueMessage(gone!, "M")).toBe("No longer available");
  });

  it("applies the per-line cap place_order uses to untracked sizes", () => {
    expect(
      validateBagLine({ productId: "tee", size: "S", quantity: MAX_LINE_QUANTITY + 1 }, [tee]),
    ).toEqual({ kind: "too-many", left: MAX_LINE_QUANTITY });
    expect(maxQuantityFor(tee, "S")).toBe(MAX_LINE_QUANTITY);
    expect(maxQuantityFor(tee, "M")).toBe(2);
  });
});

describe("stock helpers", () => {
  it("shows low stock only for tracked sizes between 1 and the threshold", () => {
    const p = make("p", { stock: { S: 1, M: 3, L: 4 } });
    expect(isLowStock(p, "S")).toBe(true);
    expect(isLowStock(p, "M")).toBe(true);
    expect(isLowStock(p, "L")).toBe(false);
    expect(isLowStock(make("q", { stock: { S: 0 } }), "S")).toBe(false);
  });

  it("treats a size with no stock row as available with no badge", () => {
    const p = make("p", { stock: { S: 2 } });
    expect(stockLeft(p, "M")).toBeNull();
    expect(isLowStock(p, "M")).toBe(false);
    expect(isSoldOut(p)).toBe(false);
  });

  it("is sold out only when every size is tracked at 0", () => {
    expect(isSoldOut(make("a", { stock: { S: 0, M: 0, L: 0 } }))).toBe(true);
    expect(isSoldOut(make("b", { stock: { S: 0, M: 0 } }))).toBe(false); // L untracked = available
  });

  it("moves sold-out products to the end and keeps the order inside each group", () => {
    const out = make("out", { stock: { S: 0, M: 0, L: 0 } });
    const list = soldOutLast([make("a"), out, make("b")]);
    expect(list.map((p) => p.id)).toEqual(["a", "b", "out"]);
  });
});

describe("relatedProducts", () => {
  const soldOut = { S: 0, M: 0, L: 0 };
  const current = make("current", { category: "Tops" });
  const all = [
    current,
    make("jeans-1", { category: "Baggy Jeans" }),
    make("tops-out", { category: "Tops", stock: soldOut }),
    make("tops-1", { category: "Tops" }),
    make("jacket-1", { category: "Jackets" }),
    make("jeans-out", { category: "Baggy Jeans", stock: soldOut }),
  ];

  it("never includes the current product and returns at most 4", () => {
    const result = relatedProducts(current, all);
    expect(result.map((p) => p.id)).not.toContain("current");
    expect(result).toHaveLength(4);
  });

  it("puts same-category first, then others, with sold-out ones last", () => {
    expect(relatedProducts(current, all).map((p) => p.id)).toEqual([
      "tops-1",
      "jeans-1",
      "jacket-1",
      "tops-out",
    ]);
  });

  it("returns fewer when there are not enough other products", () => {
    expect(relatedProducts(current, [current, make("only")])).toHaveLength(1);
  });
});

describe("scaleFor", () => {
  it("caps the longest edge at 1600 and never upscales", () => {
    expect(scaleFor(4000, 3000)).toBeCloseTo(0.4);
    expect(scaleFor(3000, 4000)).toBeCloseTo(0.4);
    expect(scaleFor(1200, 800)).toBe(1);
    expect(scaleFor(1600, 1600)).toBe(1);
  });
});

describe("needsPreorder", () => {
  it("is never true unless the seller allowed pre-orders", () => {
    expect(needsPreorder(make("a", { stock: { S: 0, M: 0, L: 0 } }))).toBe(false);
    expect(needsPreorder(make("b"))).toBe(false);
  });

  it("is true for an allowed piece with no tracked stock (not kept in stock)", () => {
    expect(needsPreorder(make("c", { allowPreorder: true }))).toBe(true);
  });

  it("with tracked stock, is true only when every size is at 0", () => {
    expect(needsPreorder(make("d", { allowPreorder: true, stock: { S: 2, M: 0, L: 0 } }))).toBe(false);
    expect(needsPreorder(make("e", { allowPreorder: true, stock: { S: 0, M: 0, L: 0 } }))).toBe(true);
  });
});
