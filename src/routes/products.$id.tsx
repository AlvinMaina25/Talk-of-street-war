import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProductGrid, SectionHeading } from "@/components/storefront";
import { useBag } from "@/context/bag-context";
import { formatPrice, products } from "@/data/products";
import { images } from "@/data/images";

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => {
    const product = products.find((item) => item.id === params.id);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Piece"} — TALK OF` },
      { name: "description", content: loaderData?.description ?? "Explore streetwear from the TALK OF concept collection." },
      { property: "og:title", content: `${loaderData?.name ?? "Piece"} — TALK OF` },
      { property: "og:description", content: loaderData?.description ?? "Explore streetwear from the TALK OF concept collection." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData();
  const { addItem, setBagOpen } = useBag();
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [needsSize, setNeedsSize] = useState(false);

  function addToBag() {
    if (!size) { setNeedsSize(true); return; }
    addItem(product.id, size, quantity);
    setBagOpen(true);
  }

  const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const whatsappText = `Hi TALK OF! I'd like to enquire about ${product.name}, size ${size || "please advise"}, quantity ${quantity}. Please confirm availability. Thanks!`;

  return <main className="product-page">
    <div className="product-breadcrumb"><Link to="/shop"><ArrowLeft size={14} /> BACK TO SHOP</Link><span>HOME / SHOP / {product.category.toUpperCase()}</span></div>
    <section className="product-detail section-wrap">
      <div className="product-gallery"><div className="product-main-image"><img src={product.image} alt={product.alt} fetchPriority="high" /></div><div className="product-thumbnails"><img src={product.image} alt={`${product.name}, front view`} /><img src={product.image} alt={`${product.name}, detail view`} /></div></div>
      <div className="product-information"><p className="eyebrow">{product.category} · TALK OF SELECT</p><h1 className="product-title">{product.name}</h1><p className="product-price">{formatPrice(product.price)}</p><p className="product-description">{product.description}</p>
        <div className="size-picker"><div className="size-picker-heading"><span>SELECT SIZE</span><Dialog><DialogTrigger asChild><Button variant="ghost" className="size-guide-trigger">SIZE GUIDE <ArrowUpRight size={12} /></Button></DialogTrigger><DialogContent className="size-guide-dialog"><DialogHeader><DialogTitle>SIZE GUIDE</DialogTitle><DialogDescription>Our pieces have a relaxed streetwear fit. Sizes run from S to XL; message us for help choosing your fit.</DialogDescription></DialogHeader></DialogContent></Dialog></div><div className="size-options">{product.sizes.map((option) => <Button key={option} variant={size === option ? "default" : "outline"} className="size-option" onClick={() => { setSize(option); setNeedsSize(false); }} aria-pressed={size === option}>{option}</Button>)}</div>{needsSize && <p className="size-error" role="alert">Choose a size to add this piece to your bag.</p>}</div>
        <div className="product-buy-row"><div className="quantity-control"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus size={14} /></Button><span>{quantity}</span><Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => setQuantity((current) => current + 1)}><Plus size={14} /></Button></div><Button className="add-to-bag" onClick={addToBag}>ADD TO BAG <Plus size={15} /></Button></div>
        <a className="whatsapp-enquiry" href={`https://wa.me/254725674479?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">ASK US ON WHATSAPP <ArrowUpRight size={15} /></a>
        <p className="product-demo-notice">Concept store — product, price and sizes shown for demonstration. Check availability with the TALK OF team.</p>
        <div className="product-details-note"><span>FIT NOTES</span><p>Relaxed streetwear silhouette. Style it your way.</p><span>AVAILABILITY</span><p>Sizes are illustrative. Please confirm on WhatsApp.</p></div>
      </div>
    </section>
    <section className="section-wrap related-section"><SectionHeading kicker="KEEP THE FIT GOING" title="MORE IN THE ROTATION." />{related.length ? <ProductGrid items={related} /> : <ProductGrid items={products.filter((item) => item.id !== product.id).slice(0, 4)} />}</section>
  </main>;
}