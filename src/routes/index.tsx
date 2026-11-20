import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Instagram } from "lucide-react";
import { ProductGrid, SectionHeading } from "@/components/storefront";
import { images } from "@/data/images";
import { products } from "@/data/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TALK OF — Streetwear That Speaks | Nairobi" },
      { name: "description", content: "Find your next fit. Discover bold, vintage-inspired streetwear, baggy denim and more at TALK OF in Nairobi." },
      { property: "og:title", content: "TALK OF — Streetwear That Speaks" },
      { property: "og:description", content: "Bold silhouettes. Vintage inspiration. Everyday streetwear, on your own terms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <section className="home-hero" aria-labelledby="hero-title">
        <img className="home-hero-image" src={images.hero} alt="Streetwear model in a washed black denim fit on a Nairobi city street" fetchPriority="high" />
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <p className="hero-kicker">TALK OF / STREETWEAR CULTURE / KENYA</p>
          <h1 id="hero-title" className="hero-title">NOT MADE<br />TO BLEND <span>IN.</span></h1>
          <p className="hero-subtitle">STREETWEAR THAT SPEAKS<br className="sm:hidden" /> BEFORE YOU DO.</p>
          <div className="hero-actions"><a className="button-acid" href="#current-rotation">SHOP THE DROP <ArrowUpRight size={15} /></a><a className="button-light-outline" href="#collections">EXPLORE COLLECTIONS</a></div>
        </div>
        <div className="hero-side-label">INDEPENDENT STYLE · NAIROBI, KE</div>
        <a className="hero-scroll" href="#collections" aria-label="Scroll to collections"><ArrowDown size={15} /></a>
      </section>

      <div className="ticker" aria-label="TALK OF, baggy fits, streetwear, denim, no ordinary fits"><div className="ticker-track" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span key={index}>TALK OF <i>✳</i> BAGGY FITS <i>✳</i> STREETWEAR <i>✳</i> DENIM <i>✳</i> NO ORDINARY FITS <i>✳</i></span>)}</div></div>

      <section id="collections" className="section-wrap categories-section">
        <SectionHeading kicker="DRESS LIKE YOU MEAN IT" title="FIND YOUR FIT." />
        <div className="category-grid">
          <Link to="/shop" search={{ category: "Baggy Jeans" }} className="category-card category-large"><img src={images.denim} alt="Model in wide-leg vintage denim" loading="lazy" /><span className="category-index">01 / THE EVERYDAY</span><span className="category-title">BAGGY<br />JEANS</span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>
          <Link to="/shop" search={{ category: "Jorts" }} className="category-card"><img src={images.jorts} alt="Model wearing relaxed olive utility jorts" loading="lazy" /><span className="category-index">02 / OFF-DUTY</span><span className="category-title">JORTS</span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>
          <Link to="/shop" search={{ category: "Jackets" }} className="category-card"><img src={images.denimJacket} alt="Oversized vintage denim jacket" loading="lazy" /><span className="category-index">03 / LAYER UP</span><span className="category-title">OUTERWEAR</span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>
          <Link to="/shop" search={{ category: "Tops" }} className="category-card category-text-card"><span className="category-index">04 / THE FOUNDATION</span><span className="category-title">TOPS<br />& TEES</span><span className="category-description">The pieces that pull it all together.</span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>
          <Link to="/shop" search={{ category: "New Arrivals" }} className="category-card category-wide"><img src={images.lookbook} alt="Friends styling oversized streetwear together" loading="lazy" /><span className="category-index">05 / JUST LANDED</span><span className="category-title">NEW DROPS</span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>
        </div>
      </section>

      <section id="current-rotation" className="section-wrap rotation-section">
        <SectionHeading kicker="SELECTED FOR YOUR NEXT FIT" title="THE CURRENT ROTATION." detail="Pieces worth building a fit around." href="/shop" />
        <p className="demo-note"><span /> Concept store — products and prices shown for demonstration.</p>
        <ProductGrid items={products} />
      </section>

      <section className="campaign-section">
        <img src={images.lookbook} alt="Two friends in oversized streetwear on a Nairobi street" loading="lazy" />
        <div className="campaign-shade" />
        <div className="campaign-content"><span className="campaign-kicker">TALK OF — THE WAY YOU WEAR IT</span><h2>YOUR STYLE.<br /><span>YOUR RULES.</span></h2><p>Built for the ones who never needed permission to stand out.</p><Link to="/shop" className="campaign-link">EXPLORE THE COLLECTION <ArrowRight size={16} /></Link></div>
        <span className="campaign-side">NO ORDINARY FITS · 001</span>
      </section>

      <section className="section-wrap new-arrivals-section">
        <SectionHeading kicker="THE LATEST LOOKS" title="FRESH ON THE RACK." detail="New ways to wear it. Same unapologetic energy." href="/shop?category=New+Arrivals" />
        <p className="demo-note"><span /> Concept store — products and prices shown for demonstration.</p>
        <ProductGrid items={products.filter((item) => item.isNew).slice(0, 4)} />
      </section>

      <section className="brand-story-section">
        <div className="story-image-wrap"><img src={images.denim} alt="A complete oversized denim look" loading="lazy" /><span className="story-image-mark">THE<br />TALK<br />OF FIT.</span></div>
        <div className="story-copy"><p className="eyebrow">IT'S HOW YOU WEAR IT</p><h2 className="display-heading">MORE THAN<br />A FIT.</h2><p className="story-body">TALK OF brings together bold silhouettes, vintage inspiration, and everyday streetwear for people who dress on their own terms.</p><Link to="/about" className="text-link">GET TO KNOW US <ArrowUpRight size={15} /></Link><span className="story-side-note">NAIROBI, KENYA · STYLE, NO RULES</span></div>
      </section>

      <section className="visit-section">
        <div className="visit-title-wrap"><p className="eyebrow">GOOD FITS, IN PERSON</p><h2 className="display-heading">COME<br />THROUGH<span>.</span></h2></div>
        <div className="visit-details"><p className="visit-brand">TALK OF <span>/ FIND US IN NAIROBI</span></p><p>Hison Limited, Biashara Street<br />2nd Floor, Shop 209<br />Next to Rafiki Bank</p><p className="visit-hours">MONDAY—SATURDAY<br />9:30 AM—8:00 PM</p><a href="tel:+254725674479" className="visit-phone">+254 725 674 479</a><div className="visit-actions"><a href="https://maps.google.com/?q=Hison+Limited+Biashara+Street+Nairobi+Kenya" target="_blank" rel="noreferrer" className="button-acid">GET DIRECTIONS <ArrowUpRight size={15} /></a><a href="tel:+254725674479" className="button-light-outline">CALL THE STORE</a></div></div>
        <span className="visit-watermark">TALK OF</span>
      </section>

      <section className="instagram-section">
        <div className="instagram-heading"><div><p className="eyebrow">OUT IN THE WORLD</p><h2 className="display-heading">SEEN ON THE 'GRAM.</h2></div><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer" className="instagram-follow"><Instagram size={17} /> FOLLOW @TALK_OF <ArrowUpRight size={14} /></a></div>
        <div className="instagram-grid"><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer"><img src={images.hero} alt="Streetwear fit featuring charcoal denim" loading="lazy" /></a><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer"><img src={images.denim} alt="Vintage inspired wide-leg denim look" loading="lazy" /></a><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer"><img src={images.lookbook} alt="Streetwear looks made to wear your way" loading="lazy" /></a><a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer"><img src={images.jorts} alt="Relaxed utility-inspired jorts" loading="lazy" /></a></div>
        <p className="instagram-caption">CURATED LOOKBOOK IMAGERY <span>·</span> NOT LIVE INSTAGRAM CONTENT</p>
      </section>
    </main>
  );
}
