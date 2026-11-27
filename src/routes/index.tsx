import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Instagram } from "lucide-react";
import { ProductGrid, SectionHeading } from "@/components/storefront";
import { HeroTitleLines, Lines } from "@/components/hero-text";
import { images } from "@/data/images";
import { useSiteSettings } from "@/lib/site-settings-api";
import { fetchActiveProducts } from "@/lib/products-api";

/** One tile per product category — `category` must match the names in productCategories (src/data/products.ts). */
const homeCategories: {
  category: string;
  kicker: string;
  title: string[];
  description: string;
  tone: string;
}[] = [
  {
    category: "Baggy Jeans (New)",
    kicker: "THE EVERYDAY",
    title: ["BAGGY", "JEANS"],
    description: "Heavy on the silhouette. Easy on the styling.",
    tone: "tone-denim",
  },
  {
    category: "Jorts",
    kicker: "OFF-DUTY",
    title: ["JORTS"],
    description: "Relaxed cuts for long days.",
    tone: "tone-olive",
  },
  {
    category: "Leather Jackets",
    kicker: "LAYER UP",
    title: ["LEATHER", "JACKETS"],
    description: "The layer that finishes the fit.",
    tone: "tone-ink",
  },
  {
    category: "Tees/Shirts",
    kicker: "THE FOUNDATION",
    title: ["TEES", "& SHIRTS"],
    description: "The pieces that pull it all together.",
    tone: "",
  },
  {
    category: "Jerseys",
    kicker: "FROM THE TERRACE",
    title: ["JERSEYS"],
    description: "Retro football shirts, worn loud.",
    tone: "tone-red",
  },
  {
    category: "Jeans",
    kicker: "THE CLASSIC",
    title: ["JEANS"],
    description: "Straight, slim, and always in rotation.",
    tone: "tone-indigo",
  },
  {
    category: "Wide-Leg Jeans (Thrifted)",
    kicker: "THRIFTED FINDS",
    title: ["WIDE-LEG", "JEANS"],
    description: "Thrifted, wide, one of a kind.",
    tone: "tone-brown",
  },
  {
    category: "Bags",
    kicker: "CARRY ON",
    title: ["BAGS"],
    description: "Room for everything you carry.",
    tone: "tone-forest",
  },
  {
    category: "Hoodies",
    kicker: "COMFORT ZONE",
    title: ["HOODIES"],
    description: "Heavyweight comfort, loud or quiet.",
    tone: "tone-plum",
  },
  {
    category: "Caps",
    kicker: "TOP IT OFF",
    title: ["CAPS"],
    description: "The finishing touch.",
    tone: "tone-teal",
  },
  {
    category: "Shoes",
    kicker: "STEP OUT",
    title: ["SHOES"],
    description: "Start the fit from the ground up.",
    tone: "tone-slate",
  },
];

function renderCategory(item: (typeof homeCategories)[number], index: number) {
  return (
    <Link
      key={item.category}
      to="/shop"
      search={{ category: item.category }}
      className={`category-card category-text-card ${index === 0 ? "category-large " : ""}${item.tone}`}
    >
      <span className="category-index">
        {String(index + 1).padStart(2, "0")} / {item.kicker}
      </span>
      <span className="category-title">
        {item.title.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </span>
      <span className="category-description">{item.description}</span>
      <span className="category-arrow">
        <ArrowUpRight size={18} />
      </span>
    </Link>
  );
}

export const Route = createFileRoute("/")({
  loader: () => fetchActiveProducts(),
  head: () => ({
    meta: [
      { title: "TALK OF — Streetwear That Speaks | Nairobi" },
      {
        name: "description",
        content:
          "Find your next fit. Discover bold, vintage-inspired streetwear, baggy denim and more at TALK OF in Nairobi.",
      },
      { property: "og:title", content: "TALK OF — Streetwear That Speaks" },
      {
        property: "og:description",
        content: "Bold silhouettes. Vintage inspiration. Everyday streetwear, on your own terms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const products = Route.useLoaderData();
  const hero = useSiteSettings();
  return (
    <main>
      <section className="home-hero" aria-labelledby="hero-title">
        <img
          className="home-hero-image"
          src={hero.hero_image}
          alt={
            hero.hero_image === images.storeRack
              ? "Racks of jerseys, denim and caps inside the TALK OF store"
              : "TALK OF streetwear look"
          }
          fetchPriority="high"
        />
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <p className="hero-kicker">TALK OF / STREETWEAR CULTURE / KENYA</p>
          <h1 id="hero-title" className="hero-title">
            <HeroTitleLines text={hero.hero_title} />
          </h1>
          <p className="hero-subtitle">
            <Lines text={hero.hero_subtitle} />
          </p>
          <div className="hero-actions">
            <a className="button-acid home-shop-drop" href="#current-rotation">
              SHOP THE DROP <ArrowUpRight size={15} />
            </a>
            <a className="button-light-outline" href="#collections">
              EXPLORE COLLECTIONS
            </a>
          </div>
        </div>
        <div className="hero-side-label">INDEPENDENT STYLE · NAIROBI, KE</div>
        <a className="hero-scroll" href="#collections" aria-label="Scroll to collections">
          <ArrowDown size={15} />
        </a>
      </section>

      <div className="ticker" aria-label="TALK OF, baggy fits, streetwear, denim, no ordinary fits">
        <div className="ticker-track" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>
              TALK OF <i>✳</i> BAGGY FITS <i>✳</i> STREETWEAR <i>✳</i> DENIM <i>✳</i> NO ORDINARY
              FITS <i>✳</i>
            </span>
          ))}
        </div>
      </div>

      <section id="collections" className="section-wrap categories-section">
        <SectionHeading kicker="DRESS LIKE YOU MEAN IT" title="FIND YOUR FIT." />
        <div className="category-grid">
          {homeCategories.slice(0, 1).map((item, index) => renderCategory(item, index))}
          {/* Desktop: the rail is transparent (display: contents) so the grid is unchanged.
              Mobile: it becomes a swipeable row under the hero tile. */}
          <div className="category-rail">
            {homeCategories.slice(1).map((item, i) => renderCategory(item, i + 1))}
            <Link
              to="/shop"
              search={{ category: "New Arrivals" }}
              className="category-card category-text-card category-wide tone-sand"
            >
              <span className="category-index">
                {String(homeCategories.length + 1).padStart(2, "0")} / JUST LANDED
              </span>
              <span className="category-title">NEW DROPS</span>
              <span className="category-description">Fresh pieces, just landed.</span>
              <span className="category-arrow">
                <ArrowUpRight size={18} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section id="current-rotation" className="section-wrap rotation-section">
        <SectionHeading
          kicker="SELECTED FOR YOUR NEXT FIT"
          title="THE CURRENT ROTATION."
          detail="Pieces worth building a fit around."
          href="/shop"
        />
        <p className="demo-note">
          <span /> Concept store — products and prices shown for demonstration.
        </p>
        <ProductGrid items={products} />
      </section>

      <section className="campaign-section">
        <img
          src={images.campaign}
          alt="Woman in a cream blazer, white top and baggy denim shorts posing against a metal wall"
          loading="lazy"
        />
        <div className="campaign-shade" />
        <div className="campaign-content">
          <span className="campaign-kicker">TALK OF — THE WAY YOU WEAR IT</span>
          <h2>
            YOUR STYLE.
            <br />
            <span>YOUR RULES.</span>
          </h2>
          <p>Built for the ones who never needed permission to stand out.</p>
          <Link to="/shop" className="campaign-link">
            EXPLORE THE COLLECTION <ArrowRight size={16} />
          </Link>
        </div>
        <span className="campaign-side">NO ORDINARY FITS · 001</span>
      </section>

      <section className="section-wrap new-arrivals-section">
        <SectionHeading
          kicker="THE LATEST LOOKS"
          title="FRESH ON THE RACK."
          detail="New ways to wear it. Same unapologetic energy."
          href="/shop?category=New+Arrivals"
        />
        <p className="demo-note">
          <span /> Concept store — products and prices shown for demonstration.
        </p>
        <ProductGrid items={products.filter((item) => item.isNew).slice(0, 4)} />
      </section>

      <section className="brand-story-section">
        <div className="story-image-wrap">
          <img
            src={images.story}
            alt="Two women in cropped puffer vests and baggy black jeans in the Talk Of store"
            loading="lazy"
          />
          <span className="story-image-mark">
            THE
            <br />
            TALK
            <br />
            OF FIT.
          </span>
        </div>
        <div className="story-copy">
          <p className="eyebrow">IT'S HOW YOU WEAR IT</p>
          <h2 className="display-heading">
            MORE THAN
            <br />A FIT.
          </h2>
          <p className="story-body">
            TALK OF brings together bold silhouettes, vintage inspiration, and everyday streetwear
            for people who dress on their own terms.
          </p>
          <Link to="/about" className="text-link">
            GET TO KNOW US <ArrowUpRight size={15} />
          </Link>
          <span className="story-side-note">NAIROBI, KENYA · STYLE, NO RULES</span>
        </div>
      </section>

      <section className="instagram-section">
        <div className="instagram-heading">
          <div>
            <p className="eyebrow">OUT IN THE WORLD</p>
            <h2 className="display-heading">SEEN ON THE 'GRAM.</h2>
          </div>
          <a
            href="https://www.instagram.com/talk_of/"
            target="_blank"
            rel="noreferrer"
            className="instagram-follow"
          >
            <Instagram size={17} /> FOLLOW @TALK_OF <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="instagram-grid">
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">
            <img
              src={images.storeRack}
              alt="Jerseys and denim on the racks inside the Talk Of store"
              loading="lazy"
            />
          </a>
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">
            <img
              src={images.storeJerseys}
              alt="Retro sports jerseys hanging in the Talk Of store"
              loading="lazy"
            />
          </a>
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">
            <img
              src={images.story}
              alt="Two women in cropped puffer vests and baggy black jeans in the Talk Of store"
              loading="lazy"
            />
          </a>
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">
            <img
              src={images.seen1}
              alt="Oversized leather jacket styled with baggy flared jeans and a mini bag"
              loading="lazy"
            />
          </a>
        </div>
        <p className="instagram-caption">
          CURATED LOOKBOOK IMAGERY <span>·</span> NOT LIVE INSTAGRAM CONTENT
        </p>
      </section>
    </main>
  );
}