import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Heart,
  Instagram,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useBag } from "@/context/bag-context";
import { useWishlist } from "@/context/wishlist-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatPrice,
  isLowStock,
  isSoldOut,
  preorderMessage,
  needsPreorder,
  preorderLeadText,
  PREORDER_SIZE_RANGE,
  products as bundledProducts,
  sizeAvailable,
  stockLeft,
  type Product,
} from "@/data/products";
import { fetchActiveProductsStrict } from "@/lib/products-api";
import { issueMessage, maxQuantityFor, validateBagLine } from "@/lib/bag-validation";
import { OrderRejectedError, placeOrder } from "@/lib/orders-api";
import { Input } from "@/components/ui/input";
import { images } from "@/data/images";
import { useSiteSettings, whatsappLink } from "@/lib/site-settings-api";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Shop all", to: "/shop" as const },
  { label: "New drops", to: "/shop" as const, search: { category: "New Arrivals" } },
  { label: "Denim", to: "/shop" as const, search: { category: "Baggy Jeans (New)" } },
  { label: "Leather jackets", to: "/shop" as const, search: { category: "Leather Jackets" } },
  { label: "About", to: "/about" as const },
];

export function AnnouncementBar() {
  const { announcement_text, announcement_active } = useSiteSettings();
  const text = announcement_text.trim();
  const storageKey = `announcement-dismissed:${text}`;
  const [dismissed, setDismissed] = useState(false);

  // Read after mount (not during render) so server and client markup match.
  // Keyed by message text: a new announcement shows again even if the old one was dismissed.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (!announcement_active || !text || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable: dismissal lasts until reload */
    }
  }

  return (
    <div className="announcement-bar relative flex h-8 items-center justify-center overflow-hidden px-9 text-center text-[9px] font-semibold uppercase tracking-[0.13em] sm:text-[10px]">
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-1.5 flex size-6 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

export function SiteHeader() {
  const { itemCount, setBagOpen } = useBag();
  const { count: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <header className="site-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 md:px-8 lg:h-[76px] lg:px-12">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Link to="/" aria-label="TALK OF home" className="wordmark text-[25px] sm:text-[29px]">
            TALK <span>OF</span>
            <i>.</i>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 xl:flex 2xl:gap-8">
            {navLinks.map((item) =>
              item.search ? (
                <Link key={item.label} to={item.to} search={item.search} className="nav-link">
                  {item.label}
                </Link>
              ) : (
                <Link key={item.label} to={item.to} className="nav-link">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Search products">
              <Link to="/shop" search={{ focusSearch: true }}>
                <Search className="size-[19px]" strokeWidth={1.6} />
              </Link>
            </Button>
            <a
              className="header-icon hidden md:inline-flex"
              href="https://www.instagram.com/talk_of/"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow TALK OF on Instagram"
            >
              <Instagram size={19} strokeWidth={1.6} />
            </a>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="relative"
            >
              <Link to="/wishlist">
                <Heart className="size-[19px]" strokeWidth={1.6} />
                {wishlistCount > 0 && <span className="bag-count">{wishlistCount}</span>}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Open shopping bag, ${itemCount} items`}
              className="relative"
              onClick={() => setBagOpen(true)}
            >
              <ShoppingBag className="size-[19px]" strokeWidth={1.6} />
              <span className="bag-count">{itemCount}</span>
            </Button>
          </div>
        </div>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(85vw,360px)] flex-col bg-background px-6 pt-12"
        >
          <SheetHeader className="mb-7 text-left">
            <SheetTitle className="wordmark text-3xl">
              TALK OF<span className="text-primary">.</span>
            </SheetTitle>
            <SheetDescription className="sr-only">Store navigation</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col">
            {navLinks.map((item) =>
              item.search ? (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search}
                  onClick={() => setMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {item.label}
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {item.label}
                  <ArrowUpRight size={16} />
                </Link>
              ),
            )}
            <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="mobile-nav-link">
              Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
              <ArrowUpRight size={16} />
            </Link>
          </nav>
          <a
            href="https://www.instagram.com/talk_of/"
            target="_blank"
            rel="noreferrer"
            className="mt-auto flex items-center gap-2 border-t border-border py-5 text-sm"
          >
            <Instagram size={17} /> @TALK_OF
          </a>
        </SheetContent>
      </Sheet>
      <BagDrawer />
    </>
  );
}

/** "Sizes S—XL" for a range, the single size when there is only one (e.g. "One size"), nothing when none are set. */
function sizeSummary(sizes: string[]) {
  if (sizes.length === 0) return "";
  if (sizes.length === 1) return sizes[0];
  return `Sizes ${sizes[0]}—${sizes[sizes.length - 1]}`;
}

export function WishlistButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);
  return (
    <button
      type="button"
      className={`wishlist-button ${saved ? "is-saved" : ""} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      onClick={() => toggle(productId)}
    >
      <Heart
        size={16}
        strokeWidth={1.7}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { addItem, setBagOpen } = useBag();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [capNote, setCapNote] = useState("");
  const { whatsapp_number } = useSiteSettings();
  const soldOut = isSoldOut(product);
  const selectedLeft = selectedSize ? stockLeft(product, selectedSize) : null;
  const canPreorder = product.allowPreorder === true;
  const preorder = needsPreorder(product);
  const soldOutShown = soldOut && !canPreorder; // pre-order pieces never say "sold out"
  const leadText = preorderLeadText(product);

  function addToBag() {
    if (!selectedSize || soldOut || !sizeAvailable(product, selectedSize)) return;
    const result = addItem(product.id, selectedSize, 1, maxQuantityFor(product, selectedSize));
    if (result.added === 0) {
      setCapNote(
        `Only ${selectedLeft ?? result.inBag} left in ${selectedSize}. You already have ${result.inBag} in your bag.`,
      );
      return;
    }
    setCapNote("");
    setBagOpen(true);
    setQuickViewOpen(false);
  }

  return (
    <article className={`product-card group min-w-0 ${soldOutShown ? "is-sold-out" : ""}`}>
      <div className="product-image-wrap">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          aria-label={`View ${product.name}${soldOutShown ? " (sold out)" : ""}`}
          className="block h-full overflow-hidden"
        >
          <img
            className="product-image"
            src={product.image}
            alt={product.alt}
            width={600}
            height={800}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority ? { fetchPriority: "high" as const } : {})}
          />
        </Link>
        {soldOutShown ? (
          <span className="product-tag product-tag-sold-out">SOLD OUT</span>
        ) : needsPreorder(product) ? (
          <span className="product-tag">PRE-ORDER</span>
        ) : (
          (product.isLimited || product.isNew) && (
            <span className="product-tag">{product.isLimited ? "LIMITED" : "JUST IN"}</span>
          )
        )}
        <WishlistButton productId={product.id} productName={product.name} />
        <Button
          className="product-quick-add hidden sm:inline-flex"
          variant="secondary"
          onClick={() => setQuickViewOpen(true)}
          aria-label={`Quick view ${product.name}`}
        >
          <Plus size={15} /> QUICK VIEW
        </Button>
        <Button
          className="product-mobile-add sm:hidden"
          variant="secondary"
          size="icon"
          onClick={() => setQuickViewOpen(true)}
          aria-label={`Quick view ${product.name}`}
        >
          <Plus size={18} />
        </Button>
      </div>
      <Link to="/products/$id" params={{ id: product.id }} className="product-copy block">
        <span className="product-category">{product.category}</span>
        <span className="mt-1 flex items-start justify-between gap-2 text-[12px] font-semibold leading-snug sm:text-[14px]">
          <span>{product.name}</span>
          {!preorder && <span className="shrink-0">{formatPrice(product.price)}</span>}
        </span>
        <span className="mt-1.5 block text-[10px] text-muted-foreground sm:text-[11px]">
          {soldOutShown
            ? "Sold out"
            : needsPreorder(product)
              ? `Pre-order${leadText ? ` · ${leadText}` : ""}`
              : sizeSummary(product.sizes)}
        </span>
      </Link>
      <Dialog
        open={quickViewOpen}
        onOpenChange={(open) => {
          setQuickViewOpen(open);
          if (!open) setCapNote("");
        }}
      >
        <DialogContent className="quick-view-dialog">
          <div className="quick-view-layout">
            <img
              className="quick-view-image"
              src={product.image}
              alt={product.alt}
              decoding="async"
            />
            <div className="quick-view-details">
              <DialogHeader className="text-left">
                <DialogTitle className="font-display text-2xl font-bold">
                  {product.name}
                </DialogTitle>
                <DialogDescription>
                  {preorder
                    ? `Pre-order${leadText ? ` · ${leadText}` : ""}`
                    : formatPrice(product.price)}
                </DialogDescription>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">{product.description}</p>
              {preorder ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                  SIZES {PREORDER_SIZE_RANGE}
                </p>
              ) : (
                <div
                  className="size-options"
                  role="group"
                  aria-label={`Choose a size for ${product.name}`}
                >
                  {product.sizes.map((size) => {
                    const available = sizeAvailable(product, size);
                    return (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        className={`size-option ${available ? "" : "line-through"}`}
                        aria-pressed={selectedSize === size}
                        disabled={!available}
                        aria-label={available ? `Size ${size}` : `Size ${size}, sold out`}
                        onClick={() => {
                          setSelectedSize(size);
                          setCapNote("");
                        }}
                      >
                        {size}
                      </Button>
                    );
                  })}
                </div>
              )}
              {selectedSize && isLowStock(product, selectedSize) && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">
                  Only {selectedLeft} left
                </p>
              )}
              {capNote && (
                <p role="alert" className="text-[11px] text-destructive">
                  {capNote}
                </p>
              )}
              {preorder && (
                <p className="text-[11px] text-muted-foreground">
                  Pre-order{leadText ? ` · ${leadText}` : ""}. Message us on WhatsApp for the price and to confirm your size.
                </p>
              )}
              {preorder ? (
                <Button asChild className="add-to-bag">
                  <a
                    href={whatsappLink(whatsapp_number, preorderMessage(product))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PRE-ORDER ON WHATSAPP <ArrowUpRight size={15} />
                  </a>
                </Button>
              ) : (
                <Button className="add-to-bag" disabled={soldOutShown || !selectedSize} onClick={addToBag}>
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
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

/** `priorityCount`: how many cards at the start are above the fold (loaded eagerly); the rest lazy-load. */
export function ProductGrid({
  items,
  priorityCount = 0,
  onClear,
}: {
  items: Product[];
  priorityCount?: number;
  onClear?: () => void;
}) {
  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.1em]">No products match</p>
        <p className="mt-2 text-sm text-muted-foreground">Try a different search or category.</p>
        {onClear && (
          <Button type="button" variant="outline" className="mt-5" onClick={onClear}>
            CLEAR
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="product-grid">
      {items.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}

const BAG_PRODUCTS_KEY = ["bag-products"] as const;

/** Fresh products + stock for validating the bag. `verified: false` means the database could not be reached. */
async function fetchBagProducts(): Promise<{ products: Product[]; verified: boolean }> {
  try {
    return { products: await fetchActiveProductsStrict(), verified: true };
  } catch (error) {
    console.error("bag stock check failed", error);
    return { products: bundledProducts, verified: false };
  }
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function BagDrawer() {
  const { items, bagOpen, setBagOpen, updateQuantity, removeItem, clearBag } = useBag();
  const { whatsapp_number } = useSiteSettings();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [sending, setSending] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Re-fetched every time the bag opens (staleTime 0) and when the tab regains focus while it is open.
  const { data: bagData, isFetching } = useQuery({
    queryKey: BAG_PRODUCTS_KEY,
    queryFn: fetchBagProducts,
    staleTime: 0,
    enabled: bagOpen && items.length > 0,
  });
  const products = bagData?.products ?? [];
  const checking = items.length > 0 && (!bagData || isFetching);

  const rows = items.map((item) => ({
    ...item,
    product: products.find((product) => product.id === item.productId),
    issue: bagData ? validateBagLine(item, products) : null,
  }));
  const validRows = rows.filter((row) => row.product && !row.issue);
  const hasIssue = rows.some((row) => row.issue);
  const subtotal = validRows.reduce(
    (sum, row) => sum + (row.product?.price ?? 0) * row.quantity,
    0,
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const buildWhatsappText = (orderNo?: string) =>
    [
      orderNo
        ? `Hi TALK OF! I just placed order ${orderNo}. Items:`
        : "Hi TALK OF! I'd like to enquire about these items:",
      ...validRows.map(
        ({ product, size, quantity }) =>
          `${product?.name} — Size ${size} — Unit price ${formatPrice(product?.price ?? 0)} — Quantity ${quantity} — Line total ${formatPrice((product?.price ?? 0) * quantity)}`,
      ),
      `Total: ${formatPrice(subtotal)}`,
      ...(customerName.trim() ? [`Name: ${customerName.trim()}`, `Phone: ${phone.trim()}`] : []),
      "Please confirm availability. Thanks!",
    ].join("\n");

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (sending || checking || hasIssue || !validRows.length) return;
    setOrderError("");
    setSending(true);

    // Re-check against live stock right before submitting. The result also updates the lines on screen.
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: BAG_PRODUCTS_KEY,
        queryFn: fetchBagProducts,
        staleTime: 0,
      });
      if (items.some((item) => validateBagLine(item, fresh.products))) {
        setOrderError(
          "Some items in your bag changed. Please fix the highlighted items, then try again.",
        );
        setSending(false);
        return;
      }
    } catch (error) {
      console.error("pre-submit stock check failed", error); // place_order() still checks on the server
    }

    let orderNo: string | undefined;
    try {
      orderNo = await placeOrder({
        name: customerName,
        phone,
        notes: orderNote,
        items: validRows.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
      });
    } catch (error) {
      if (error instanceof OrderRejectedError) {
        // Most likely someone else bought the last pieces first: refresh stock so the lines show what changed.
        const stockRelated = /left|available|size|stock|quantity|bag/i.test(error.message);
        if (stockRelated) void queryClient.invalidateQueries({ queryKey: BAG_PRODUCTS_KEY });
        setOrderError(
          stockRelated
            ? `${capitalise(error.message)}. We've refreshed your bag, so please review it and try again.`
            : capitalise(error.message),
        );
        setSending(false);
        return;
      }
      // Could not reach the order system: don't lose the enquiry, send it on WhatsApp without an order number.
      console.error("placeOrder failed", error);
    }
    const url = whatsappLink(whatsapp_number, buildWhatsappText(orderNo));
    const opened = window.open(url, "_blank", "noopener");
    if (orderNo) {
      clearBag();
      setOrderNote("");
    }
    setSending(false);
    if (!opened) window.location.href = url;
  }

  const buttonLabel = sending
    ? "SENDING…"
    : checking
      ? "CHECKING STOCK…"
      : "PLACE ORDER ON WHATSAPP";

  return (
    <Sheet open={bagOpen} onOpenChange={setBagOpen}>
      <SheetContent side="right" className="flex w-[min(100vw,460px)] flex-col px-5 pt-10 sm:px-7">
        <SheetHeader className="border-b border-border pb-5 text-left">
          <SheetTitle className="flex items-baseline gap-2 text-xl font-semibold">
            Your bag{" "}
            <span className="text-xs font-normal text-muted-foreground">{totalItems} items</span>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left">
            Put a fit together. We’ll confirm everything on WhatsApp.
          </SheetDescription>
        </SheetHeader>
        {items.length ? (
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {checking && !bagData && (
              <p
                className="py-6 text-xs uppercase tracking-[0.1em] text-muted-foreground"
                role="status"
              >
                Checking stock…
              </p>
            )}
            {bagData && !bagData.verified && (
              <p className="py-3 text-xs text-muted-foreground" role="status">
                We couldn’t check stock just now. We’ll confirm availability when you order.
              </p>
            )}
            {bagData &&
              rows.map(({ product, size, quantity, productId, issue }) => {
                const left = product ? stockLeft(product, size) : null;
                const atMax = product ? quantity >= maxQuantityFor(product, size) : true;
                return (
                  <div
                    key={`${productId}-${size}`}
                    className={`flex gap-4 py-5 ${issue ? "border-l-2 border-destructive pl-3" : ""}`}
                  >
                    {product ? (
                      <Link
                        to="/products/$id"
                        params={{ id: product.id }}
                        onClick={() => setBagOpen(false)}
                        className={`h-[116px] w-[88px] shrink-0 bg-secondary ${issue ? "opacity-50" : ""}`}
                      >
                        <img
                          className="h-full w-full object-cover object-top"
                          src={product.image}
                          alt={product.alt}
                          width={88}
                          height={116}
                          decoding="async"
                        />
                      </Link>
                    ) : (
                      <div
                        className="h-[116px] w-[88px] shrink-0 bg-secondary opacity-50"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {product ? product.name : "Item no longer available"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Size {size}
                            {!product && ` · Qty ${quantity}`}
                          </p>
                        </div>
                        {product && !issue && (
                          <p className="shrink-0 text-sm">
                            {formatPrice(product.price * quantity)}
                          </p>
                        )}
                      </div>
                      {issue && (
                        <div role="alert">
                          <p className="text-xs font-semibold text-destructive">
                            {issueMessage(issue, size)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {issue.kind === "too-many" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-none text-[10px] uppercase tracking-[0.08em]"
                                onClick={() => updateQuantity(productId, size, issue.left)}
                              >
                                Reduce to {issue.left}
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-none text-[10px] uppercase tracking-[0.08em]"
                              onClick={() => removeItem(productId, size)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                      {product && !issue && (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex h-8 items-center border border-border">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Decrease quantity"
                                className="size-8"
                                onClick={() => updateQuantity(productId, size, quantity - 1)}
                              >
                                <Minus size={13} />
                              </Button>
                              <span className="w-7 text-center text-xs">{quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Increase quantity"
                                className="size-8"
                                disabled={atMax}
                                onClick={() =>
                                  updateQuantity(
                                    productId,
                                    size,
                                    Math.min(quantity + 1, maxQuantityFor(product, size)),
                                  )
                                }
                              >
                                <Plus size={13} />
                              </Button>
                            </div>
                            {atMax && left !== null && (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Only {left} left
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${product.name}`}
                            className="size-8 text-muted-foreground"
                            onClick={() => removeItem(productId, size)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ShoppingBag className="mb-5 size-8 text-muted-foreground" strokeWidth={1} />
            <p className="text-xl font-semibold">Nothing in the bag. Yet.</p>
            <p className="mt-2 max-w-[240px] text-sm text-muted-foreground">
              A good fit is just a few clicks away.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop" onClick={() => setBagOpen(false)}>
                EXPLORE THE SHOP <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        )}
        {items.length > 0 && (
          <div className="border-t border-border pt-5">
            <div className="flex justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Illustrative demo prices. No payment will be taken.
            </p>
            <form onSubmit={submitOrder} className="mt-4 grid gap-2.5">
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                aria-label="Your name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (e.g. 0712 345 678)"
                aria-label="Phone number"
                type="tel"
                autoComplete="tel"
                required
              />
              <Input
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Note (optional)"
                aria-label="Order note"
                maxLength={500}
              />
              {hasIssue && !orderError && (
                <p role="alert" className="text-xs text-destructive">
                  Fix the highlighted items above to place your order.
                </p>
              )}
              {orderError && (
                <p role="alert" className="text-xs text-destructive">
                  {orderError}
                </p>
              )}
              <button
                type="submit"
                disabled={sending || checking || hasIssue || !validRows.length}
                className="flex h-12 w-full items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buttonLabel} <ArrowUpRight size={16} />
              </button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="visit-section footer-visit">
        <div className="visit-title-wrap">
          <p className="eyebrow">GOOD FITS, IN PERSON</p>
          <h2 className="display-heading">
            COME
            <br />
            THROUGH<span>.</span>
          </h2>
        </div>
        <div className="visit-details">
          <p className="visit-brand">
            TALK OF <span>/ FIND US IN NAIROBI</span>
          </p>
          <p>
            Hison Limited, Biashara Street
            <br />
            2nd Floor, Shop 209
            <br />
            Next to Rafiki Bank
          </p>
          <p className="visit-hours">
            MONDAY—SATURDAY
            <br />
            9:30 AM—8:00 PM
          </p>
          <a href="tel:+254725647479" className="visit-phone">
            +254 725 647 479
          </a>
          <div className="visit-actions">
            <a
              href="https://maps.google.com/?q=Hison+Limited+Biashara+Street+Nairobi+Kenya"
              target="_blank"
              rel="noreferrer"
              className="button-acid home-directions"
            >
              GET DIRECTIONS <ArrowUpRight size={15} />
            </a>
            <a href="tel:+254725647479" className="button-light-outline">
              CALL THE STORE
            </a>
          </div>
        </div>
        <span className="visit-watermark">TALK OF</span>
      </section>
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="footer-bottom">
          <span>© TALK OF 2026 · NAIROBI, KENYA</span>
          <span className="demo-credit">Website concept by Alvin Solutions</span>
          <Link to="/login" className="footer-staff-link" rel="nofollow">
            STAFF LOGIN
          </Link>
          <span>NOT HERE TO BLEND IN.</span>
        </div>
      </div>
    </footer>
  );
}

const WHATSAPP_GREETING = "Hi TALK OF! I'd like to enquire about your pieces.";

export function WhatsAppButton() {
  const { whatsapp_number } = useSiteSettings();
  return (
    <a
      href={whatsappLink(whatsapp_number, WHATSAPP_GREETING)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with TALK OF on WhatsApp"
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:right-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.18 2.095 3.195 5.076 4.483.709.3 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </a>
  );
}

export function SectionHeading({
  kicker,
  title,
  detail,
  href,
}: {
  kicker?: string;
  title: string;
  detail?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2 className="display-heading">{title}</h2>
        {detail && <p className="mt-2 max-w-[420px] text-sm text-muted-foreground">{detail}</p>}
      </div>
      {href && (
        <Link to="/shop" className="section-link">
          VIEW ALL <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function ScrollLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-2">
      {children}
      <ArrowDownRight size={15} />
    </a>
  );
}

export function CloseIcon() {
  return <X size={20} />;
}
