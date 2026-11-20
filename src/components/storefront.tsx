import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Instagram, Menu, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBag } from "@/context/bag-context";
import { formatPrice, products, type Product } from "@/data/products";
import { images } from "@/data/images";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Shop all", to: "/shop" as const },
  { label: "New drops", to: "/shop" as const, search: { category: "New Arrivals" } },
  { label: "Denim", to: "/shop" as const, search: { category: "Baggy Jeans" } },
  { label: "Outerwear", to: "/shop" as const, search: { category: "Jackets" } },
  { label: "About", to: "/about" as const },
];

export function AnnouncementBar() {
  return (
    <div className="announcement-bar flex h-8 items-center justify-center overflow-hidden px-3 text-center text-[9px] font-semibold uppercase tracking-[0.13em] sm:text-[10px]">
      <span className="announcement-primary">YOUR NEXT FIT IS WAITING <span className="mx-2 text-primary">—</span> SHOP THE LATEST DROPS</span>
      <span className="announcement-secondary">VISIT US ON BIASHARA STREET, SHOP 209</span>
    </div>
  );
}

export function SiteHeader() {
  const { itemCount, setBagOpen } = useBag();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <header className="site-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 md:px-8 lg:h-[76px] lg:px-12">
          <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden" onClick={() => setMenuOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <Link to="/" aria-label="TALK OF home" className="wordmark text-[25px] sm:text-[29px]">
            TALK <span>OF</span><i>.</i>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 xl:flex 2xl:gap-8">
            {navLinks.map((item) => item.search ? (
              <Link key={item.label} to={item.to} search={item.search} className="nav-link">{item.label}</Link>
            ) : <Link key={item.label} to={item.to} className="nav-link">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Search products"><Link to="/shop" search={{ focusSearch: true }}><Search className="size-[19px]" strokeWidth={1.6} /></Link></Button>
            <a className="header-icon hidden md:inline-flex" href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer" aria-label="Follow TALK OF on Instagram"><Instagram size={19} strokeWidth={1.6} /></a>
            <Button variant="ghost" size="icon" aria-label={`Open shopping bag, ${itemCount} items`} className="relative" onClick={() => setBagOpen(true)}>
              <ShoppingBag className="size-[19px]" strokeWidth={1.6} />
              <span className="bag-count">{itemCount}</span>
            </Button>
          </div>
        </div>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[min(85vw,360px)] flex-col bg-background px-6 pt-12">
          <SheetHeader className="mb-7 text-left"><SheetTitle className="wordmark text-3xl">TALK OF<span className="text-primary">.</span></SheetTitle><SheetDescription className="sr-only">Store navigation</SheetDescription></SheetHeader>
          <nav className="flex flex-col">
            {navLinks.map((item) => item.search ? (
              <Link key={item.label} to={item.to} search={item.search} onClick={() => setMenuOpen(false)} className="mobile-nav-link">{item.label}<ArrowUpRight size={16} /></Link>
            ) : <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="mobile-nav-link">{item.label}<ArrowUpRight size={16} /></Link>)}
          </nav>
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer" className="mt-auto flex items-center gap-2 border-t border-border py-5 text-sm"><Instagram size={17} /> @TALK_OF</a>
        </SheetContent>
      </Sheet>
      <BagDrawer />
    </>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, setBagOpen } = useBag();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  function addToBag() {
    if (!selectedSize) return;
    addItem(product.id, selectedSize);
    setBagOpen(true);
    setQuickViewOpen(false);
  }

  return (
    <article className="product-card group min-w-0">
      <div className="product-image-wrap">
        <Link to="/products/$id" params={{ id: product.id }} aria-label={`View ${product.name}`} className="block h-full overflow-hidden">
          <img className="product-image" src={product.image} alt={product.alt} loading="lazy" />
        </Link>
        {(product.isLimited || product.isNew) && <span className="product-tag">{product.isLimited ? "LIMITED" : "JUST IN"}</span>}
        <Button className="product-quick-add hidden sm:inline-flex" variant="secondary" onClick={() => setQuickViewOpen(true)} aria-label={`Quick view ${product.name}`}><Plus size={15} /> QUICK VIEW</Button>
        <Button className="product-mobile-add sm:hidden" variant="secondary" size="icon" onClick={() => setQuickViewOpen(true)} aria-label={`Quick view ${product.name}`}><Plus size={18} /></Button>
      </div>
      <Link to="/products/$id" params={{ id: product.id }} className="product-copy block">
        <span className="product-category">{product.category}</span>
        <span className="mt-1 flex items-start justify-between gap-2 text-[12px] font-semibold leading-snug sm:text-[14px]">
          <span>{product.name}</span><span className="shrink-0">{formatPrice(product.price)}</span>
        </span>
        <span className="mt-1.5 block text-[10px] text-muted-foreground sm:text-[11px]">Sizes S—XL</span>
      </Link>
      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <DialogContent className="quick-view-dialog">
          <div className="quick-view-layout">
            <img className="quick-view-image" src={product.image} alt={product.alt} />
            <div className="quick-view-details">
              <DialogHeader className="text-left">
                <DialogTitle className="font-display text-2xl font-bold">{product.name}</DialogTitle>
                <DialogDescription>{formatPrice(product.price)}</DialogDescription>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">{product.description}</p>
              <div className="size-options" role="group" aria-label={`Choose a size for ${product.name}`}>
                {product.sizes.map((size) => <Button key={size} variant={selectedSize === size ? "default" : "outline"} className="size-option" aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</Button>)}
              </div>
              <Button className="add-to-bag" disabled={!selectedSize} onClick={addToBag}>ADD TO BAG <Plus size={15} /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  if (!items.length) return <p className="py-16 text-center text-sm text-muted-foreground">No pieces found. Try a different search.</p>;
  return <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function BagDrawer() {
  const { items, bagOpen, setBagOpen, updateQuantity, removeItem } = useBag();
  const lines = items.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) })).filter((item) => item.product);
  const subtotal = lines.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
  const whatsappText = [
    "Hi TALK OF! I'd like to enquire about these items:",
    ...lines.map(({ product, size, quantity }) => `${product?.name} — Size ${size} — Unit price ${formatPrice(product?.price ?? 0)} — Quantity ${quantity} — Line total ${formatPrice((product?.price ?? 0) * quantity)}`),
    `Total: ${formatPrice(subtotal)}`,
    "Please confirm availability. Thanks!",
  ].join("\n");

  return (
    <Sheet open={bagOpen} onOpenChange={setBagOpen}>
      <SheetContent side="right" className="flex w-[min(100vw,460px)] flex-col px-5 pt-10 sm:px-7">
        <SheetHeader className="border-b border-border pb-5 text-left">
          <SheetTitle className="flex items-baseline gap-2 text-xl font-semibold">Your bag <span className="text-xs font-normal text-muted-foreground">{lines.reduce((sum, item) => sum + item.quantity, 0)} items</span></SheetTitle>
          <SheetDescription className="pt-1 text-left">Put a fit together. We’ll confirm everything on WhatsApp.</SheetDescription>
        </SheetHeader>
        {lines.length ? <div className="flex-1 divide-y divide-border overflow-y-auto">
          {lines.map(({ product, size, quantity, productId }) => product && (
            <div key={`${productId}-${size}`} className="flex gap-4 py-5">
              <Link to="/products/$id" params={{ id: product.id }} onClick={() => setBagOpen(false)} className="h-[116px] w-[88px] shrink-0 bg-secondary"><img className="h-full w-full object-cover object-top" src={product.image} alt={product.alt} /></Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex justify-between gap-2"><div><p className="text-sm font-medium">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">Size {size}</p></div><p className="shrink-0 text-sm">{formatPrice(product.price * quantity)}</p></div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 items-center border border-border"><Button variant="ghost" size="icon" aria-label="Decrease quantity" className="size-8" onClick={() => updateQuantity(productId, size, quantity - 1)}><Minus size={13} /></Button><span className="w-7 text-center text-xs">{quantity}</span><Button variant="ghost" size="icon" aria-label="Increase quantity" className="size-8" onClick={() => updateQuantity(productId, size, quantity + 1)}><Plus size={13} /></Button></div>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${product.name}`} className="size-8 text-muted-foreground" onClick={() => removeItem(productId, size)}><Trash2 size={15} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div> : <div className="flex flex-1 flex-col items-center justify-center text-center"><ShoppingBag className="mb-5 size-8 text-muted-foreground" strokeWidth={1} /><p className="text-xl font-semibold">Nothing in the bag. Yet.</p><p className="mt-2 max-w-[240px] text-sm text-muted-foreground">A good fit is just a few clicks away.</p><Button asChild className="mt-6"><Link to="/shop" onClick={() => setBagOpen(false)}>EXPLORE THE SHOP <ArrowRight size={15} /></Link></Button></div>}
        {lines.length > 0 && <div className="border-t border-border pt-5">
          <div className="flex justify-between text-base font-semibold"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <p className="mt-2 text-xs text-muted-foreground">Illustrative demo prices. No payment will be taken.</p>
          <a className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-85" href={`https://wa.me/254725674479?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">ENQUIRE ON WHATSAPP <ArrowUpRight size={16} /></a>
        </div>}
      </SheetContent>
    </Sheet>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <div className="footer-top">
          <div><Link to="/" className="wordmark footer-wordmark">TALK OF<span>.</span></Link><p className="footer-tagline">GOOD FITS.<br />LOUD PRESENCE.</p></div>
          <div className="footer-links"><span className="footer-label">FIND YOUR NEXT FIT</span><Link to="/shop">SHOP ALL</Link><Link to="/shop" search={{ category: "New Arrivals" }}>NEW DROPS</Link><Link to="/shop" search={{ category: "Baggy Jeans" }}>DENIM</Link><Link to="/shop" search={{ category: "Jackets" }}>OUTERWEAR</Link><Link to="/about">ABOUT TALK OF</Link><a href="tel:+254725674479">CONTACT <ArrowUpRight size={13} /></a><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">INSTAGRAM <ArrowUpRight size={13} /></a></div>
          <div className="footer-details"><span className="footer-label">COME THROUGH</span><p>Hison Limited, Biashara Street<br />2nd Floor, Shop 209<br />Next to Rafiki Bank</p><p>MON—SAT · 9:30 AM—8:00 PM</p><a href="tel:+254725674479">+254 725 674 479</a></div>
          <a href="https://maps.google.com/?q=Hison+Limited+Biashara+Street+Nairobi+Kenya" target="_blank" rel="noreferrer" aria-label="Open store directions" className="footer-arrow"><ArrowUpRight size={24} /></a>
        </div>
        <div className="footer-bottom"><span>© TALK OF 2026 · NAIROBI, KENYA</span><span className="demo-credit">Website concept by Alvin Solutions</span><span>NOT HERE TO BLEND IN.</span></div>
      </div>
    </footer>
  );
}

export function SectionHeading({ kicker, title, detail, href }: { kicker?: string; title: string; detail?: string; href?: string }) {
  return <div className="section-heading">
    <div>{kicker && <p className="eyebrow">{kicker}</p>}<h2 className="display-heading">{title}</h2>{detail && <p className="mt-2 max-w-[420px] text-sm text-muted-foreground">{detail}</p>}</div>
    {href && <Link to="/shop" className="section-link">VIEW ALL <ArrowUpRight size={15} /></Link>}
  </div>;
}

export function ScrollLink({ children, href }: { children: React.ReactNode; href: string }) {
  return <a href={href} className="inline-flex items-center gap-2">{children}<ArrowDownRight size={15} /></a>;
}

export function CloseIcon() { return <X size={20} />; }