import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid, SectionHeading } from "@/components/storefront";
import { SizeGuideDialog } from "@/components/size-guide";
import { useBag } from "@/context/bag-context";
import { useWishlist } from "@/context/wishlist-context";
import {
  formatPrice,
  isLowStock,
  type Product,
  isSoldOut,
  preorderMessage,
  needsPreorder,
  preorderLeadText,
  PREORDER_SIZE_RANGE,
  relatedProducts,
  sizeAvailable,
  stockLeft,
} from "@/data/products";
import { maxQuantityFor } from "@/lib/bag-validation";
import { fetchProductBySlug } from "@/lib/products-api";
import { useSiteSettings, whatsappLink } from "@/lib/site-settings-api";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ params }) => {
    const { product, all } = await fetchProductBySlug(params.id);
    if (!product) throw notFound();
    return { product, all };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Piece"} — TALK OF` },
      {
        name: "description",
        content:
          loaderData?.product.description ??
          "Explore streetwear from the TALK OF concept collection.",
      },
      { property: "og:title", content: `${loaderData?.product.name ?? "Piece"} — TALK OF` },
      {
        property: "og:description",
        content:
          loaderData?.product.description ??
          "Explore streetwear from the TALK OF concept collection.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { product, all } = Route.useLoaderData();
  // key = slug, so choosing a related product starts with a clean size/quantity.
  return <ProductView key={product.id} product={product} products={all} />;
}

function ProductView({ product, products }: { product: Product; products: Product[] }) {
  const { items, addItem, setBagOpen } = useBag();
  const { has: isSaved, toggle: toggleSaved } = useWishlist();
  const saved = isSaved(product.id);
  const { whatsapp_number } = useSiteSettings();
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [needsSize, setNeedsSize] = useState(false);
  const [stockNote, setStockNote] = useState("");
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const gallery = product.gallery;
  const mainImage = activeImage && gallery?.includes(activeImage) ? activeImage : product.image;

  const soldOut = isSoldOut(product);
  const left = size ? stockLeft(product, size) : null; // null = not tracked (or no size chosen yet)
  const canPreorder = product.allowPreorder === true;
  const preorder = needsPreorder(product);
  const soldOutShown = soldOut && !canPreorder; // pre-order pieces never say "sold out"
  const leadText = preorderLeadText(product);
  const maxQuantity = preorder ? 10 : size ? maxQuantityFor(product, size) : 20;
  const shownQuantity = Math.min(quantity, Math.max(1, maxQuantity)); // never above what is in stock
  const atCap = !!size && left !== null && shownQuantity >= left;
  const inBag =
    items.find((item) => item.productId === product.id && item.size === size)?.quantity ?? 0;
  const lowSizes = product.sizes.filter((option) => isLowStock(product, option));

  function chooseSize(option: string) {
    setSize(option);
    setNeedsSize(false);
    setStockNote("");
    setQuantity((current) =>
      sizeAvailable(product, option)
        ? Math.min(current, Math.max(1, maxQuantityFor(product, option)))
        : current,
    );
  }

  function addToBag() {
    if (preorder || soldOutShown) return;
    if (!size) {
      setNeedsSize(true);
      return;
    }
    const room = maxQuantity - inBag; // how many more this size can take, counting what is already in the bag
    if (room <= 0) {
      setStockNote(
        `Only ${left ?? maxQuantity} left in ${size}${inBag ? `, and you already have ${inBag} in your bag` : ""}.`,
      );
      return;
    }
    if (shownQuantity > room) {
      setQuantity(room);
      setStockNote(
        `Only ${left ?? maxQuantity} left in ${size}. You have ${inBag} in your bag, so we set the quantity to ${room}.`,
      );
      return;
    }
    const result = addItem(product.id, size, shownQuantity, maxQuantity);
    if (result.added === 0) return;
    setStockNote("");
    setBagOpen(true);
  }

  const related = relatedProducts(product, products, 4);
  const whatsappText = `Hi TALK OF! I'd like to enquire about ${product.name}, size ${size || "please advise"}, quantity ${shownQuantity}. Please confirm availability. Thanks!`;

  return (
    <main className="product-page">
      <div className="product-breadcrumb">
        <Link to="/shop">
          <ArrowLeft size={14} /> BACK TO SHOP
        </Link>
        <span>HOME / SHOP / {product.category.toUpperCase()}</span>
      </div>
      <section className="product-detail section-wrap">
        <div className="product-gallery">
          <div className="product-main-image">
            <img
              src={mainImage}
              alt={product.alt}
              width={800}
              height={1000}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="product-thumbnails">
            {gallery ? (
              gallery.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className={`block p-0 bg-transparent ${src === mainImage ? "" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setActiveImage(src)}
                  aria-label={`Show view ${index + 1} of ${product.name}`}
                  aria-pressed={src === mainImage}
                >
                  <img
                    src={src}
                    alt={`${product.name}, view ${index + 1}`}
                    width={300}
                    height={400}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))
            ) : (
              <>
                <img
                  src={product.image}
                  alt={`${product.name}, front view`}
                  width={300}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src={product.image}
                  alt={`${product.name}, detail view`}
                  width={300}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
              </>
            )}
          </div>
        </div>
        <div className="product-information">
          <p className="eyebrow">{product.category} · TALK OF SELECT</p>
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price">
            {!preorder && formatPrice(product.price)}
            {soldOutShown && (
              <span className="ml-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sold out
              </span>
            )}
            {preorder && (
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Pre-order{leadText ? ` · ${leadText}` : ""}
              </span>
            )}
          </p>
          <p className="product-description">{product.description}</p>
          {preorder ? (
            <div className="size-picker">
              <div className="size-picker-heading">
                <span>SIZES</span>
              </div>
              <p className="text-sm">
                {PREORDER_SIZE_RANGE}. We'll confirm your size with you on WhatsApp.
              </p>
            </div>
          ) : (
            <div className="size-picker">
              <div className="size-picker-heading">
                <span>SELECT SIZE</span>
                {!/cap|shoe|sneaker/i.test(product.category) && (
                  <SizeGuideDialog category={product.category} />
                )}
              </div>
              <div className="size-options">
                {product.sizes.map((option) => {
                  const available = sizeAvailable(product, option);
                  return (
                    <Button
                      key={option}
                      variant={size === option ? "default" : "outline"}
                      className={`size-option ${available ? "" : "line-through"}`}
                      disabled={!available}
                      onClick={() => chooseSize(option)}
                      aria-pressed={size === option}
                      aria-label={available ? `Size ${option}` : `Size ${option}, sold out`}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
              {!soldOut && lowSizes.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="Low stock">
                  {lowSizes.map((option) => (
                    <li
                      key={option}
                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive"
                    >
                      Only {stockLeft(product, option)} left in {option}
                    </li>
                  ))}
                </ul>
              )}
              {needsSize && (
                <p className="size-error" role="alert">
                  Choose a size to add this piece to your bag.
                </p>
              )}
            </div>
          )}
          <div className="product-buy-row">
            <div className="quantity-control">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease quantity"
                disabled={soldOutShown || shownQuantity <= 1}
                onClick={() => {
                  setQuantity(Math.max(1, shownQuantity - 1));
                  setStockNote("");
                }}
              >
                <Minus size={14} />
              </Button>
              <span>{shownQuantity}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase quantity"
                disabled={soldOutShown || shownQuantity >= maxQuantity}
                onClick={() => {
                  setQuantity(Math.min(maxQuantity, shownQuantity + 1));
                  setStockNote("");
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
            {preorder ? (
              <Button asChild className="add-to-bag">
                <a
                  href={whatsappLink(whatsapp_number, preorderMessage(product, shownQuantity))}
                  target="_blank"
                  rel="noreferrer"
                >
                  PRE-ORDER ON WHATSAPP <ArrowUpRight size={15} />
                </a>
              </Button>
            ) : (
              <Button className="add-to-bag" disabled={soldOutShown} onClick={addToBag}>
                {soldOutShown ? (
                  "SOLD OUT"
                ) : (
                  <>
                    ADD TO BAG <Plus size={15} />
                  </>
                )}
              </Button>
            )}
          </div>
          {preorder && (
            <p className="mt-2 text-[11px] text-muted-foreground" role="status">
              Pre-order{leadText ? ` · ${leadText}` : ""}. Message us on WhatsApp for the price and to confirm your size.
            </p>
          )}
          {!soldOut && atCap && !stockNote && (
            <p
              className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive"
              role="status"
            >
              Only {left} left
            </p>
          )}
          {stockNote && (
            <p className="mt-2 text-[11px] text-destructive" role="alert">
              {stockNote}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="wishlist-toggle mt-3 w-full"
            aria-pressed={saved}
            onClick={() => toggleSaved(product.id)}
          >
            <Heart size={15} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{" "}
            {saved ? "SAVED TO WISHLIST" : "SAVE TO WISHLIST"}
          </Button>
          <a
            className="whatsapp-enquiry"
            href={whatsappLink(whatsapp_number, whatsappText)}
            target="_blank"
            rel="noreferrer"
          >
            ASK US ON WHATSAPP <ArrowUpRight size={15} />
          </a>
          <p className="product-demo-notice">
            Concept store — product, price and sizes shown for demonstration. Check availability
            with the TALK OF team.
          </p>
          <div className="product-details-note">
            <span>FIT NOTES</span>
            <p>Relaxed streetwear silhouette. Style it your way.</p>
            <span>AVAILABILITY</span>
            <p>Sizes are illustrative. Please confirm on WhatsApp.</p>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="section-wrap related-section">
          <SectionHeading kicker="KEEP THE FIT GOING" title="YOU MAY ALSO LIKE." />
          <ProductGrid items={related} />
        </section>
      )}
    </main>
  );
}
