import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront";
import { useWishlist } from "@/context/wishlist-context";
import { fetchActiveProducts } from "@/lib/products-api";

export const Route = createFileRoute("/wishlist")({
  loader: () => fetchActiveProducts(),
  head: () => ({
    meta: [
      { title: "Your Wishlist — TALK OF" },
      { name: "description", content: "Pieces you've saved from the TALK OF collection." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const products = Route.useLoaderData();
  const { ids, clear } = useWishlist();

  // Keeps the order they were saved in; pieces that are no longer for sale are simply not shown.
  const saved = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [ids, products]);

  return (
    <main className="shop-page">
      <section className="shop-intro">
        <p className="eyebrow">TALK OF · SAVED PIECES</p>
        <h1 className="display-heading">
          WISHLIST<span>.</span>
        </h1>
        <p>Keep track of the pieces you love.</p>
        <div className="shop-breadcrumb">
          HOME <span>/</span> WISHLIST
        </div>
      </section>
      <section className="section-wrap shop-catalog">
        {saved.length > 0 ? (
          <>
            <div className="shop-topline">
              <span className="product-count">
                {saved.length} {saved.length === 1 ? "PIECE" : "PIECES"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[10px] font-semibold tracking-[0.1em]"
                onClick={clear}
              >
                CLEAR ALL
              </Button>
            </div>
            <div className="shop-results">
              <ProductGrid items={saved} priorityCount={4} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <Heart
              className="mb-5 size-8 text-muted-foreground"
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className="text-xl font-semibold">Nothing saved. Yet.</p>
            <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
              Tap the heart on any piece to keep it here for later.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">
                EXPLORE THE SHOP <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
