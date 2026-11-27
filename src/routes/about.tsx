import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { images } from "@/data/images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TALK OF — Streetwear, Nairobi" },
      {
        name: "description",
        content:
          "Meet TALK OF: bold silhouettes, vintage inspiration and everyday streetwear from Biashara Street, Nairobi.",
      },
      { property: "og:title", content: "About TALK OF — Streetwear, Nairobi" },
      {
        property: "og:description",
        content:
          "Streetwear for people who dress on their own terms. Find us on Biashara Street, Nairobi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <img
          src={images.campaign}
          alt="Woman in a cream blazer, white top and baggy denim shorts posing against a metal wall"
          fetchPriority="high"
        />
        <div className="about-hero-shade" />
        <div className="about-hero-copy">
          <p className="eyebrow">TALK OF / NAIROBI, KENYA</p>
          <h1 className="display-heading">
            WEAR IT
            <br />
            YOUR WAY<span>.</span>
          </h1>
          <p>Style that speaks for itself.</p>
        </div>
        <span className="about-hero-caption">GOOD FITS. LOUD PRESENCE.</span>
      </section>
      <section className="about-statement section-wrap">
        <div>
          <p className="eyebrow">NO DRESS CODE FOR SELF-EXPRESSION</p>
          <h2 className="display-heading">
            MORE THAN
            <br />A FIT.
          </h2>
        </div>
        <div className="about-statement-copy">
          <p>
            TALK OF brings together bold silhouettes, vintage inspiration, and everyday streetwear
            for people who dress on their own terms.
          </p>
          <p>
            From baggy denim to easy layers, find the pieces that feel like you — and wear them your
            way.
          </p>
          <a href="https://www.instagram.com/talk_of/" target="_blank" rel="noreferrer">
            FOLLOW @TALK_OF <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
      <section className="about-image-band">
        <img
          src={images.story}
          alt="Two women in cropped puffer vests and baggy black jeans in the Talk Of store"
          loading="lazy"
        />
        <span>
          NEVER HERE
          <br />
          TO BLEND IN.
        </span>
      </section>
      <section className="about-visit">
        <div>
          <p className="eyebrow">FIND US IN PERSON</p>
          <h2 className="display-heading">
            COME
            <br />
            THROUGH<span>.</span>
          </h2>
        </div>
        <div className="about-address">
          <p className="visit-brand">
            TALK OF <span>/ BIASHARA STREET</span>
          </p>
          <p>
            Hison Limited, next to Rafiki Bank
            <br />
            Biashara Street, 2nd Floor, Shop 209
            <br />
            Nairobi, Kenya
          </p>
          <p>
            Monday–Saturday
            <br />
            9:30 AM–8:00 PM
          </p>
          <a href="tel:+254725647479">
            +254 725 647 479 <ArrowUpRight size={15} />
          </a>
          <div className="visit-actions">
            <a
              href="https://maps.google.com/?q=Hison+Limited+Biashara+Street+Nairobi+Kenya"
              target="_blank"
              rel="noreferrer"
              className="button-acid"
            >
              GET DIRECTIONS <ArrowUpRight size={15} />
            </a>
            <Link to="/shop" className="button-light-outline">
              FIND YOUR FIT <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
