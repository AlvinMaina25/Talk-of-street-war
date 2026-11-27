import { images } from "@/data/images";

export type ProductCategory =
  | "Jeans"
  | "Baggy Jeans (New)"
  | "Wide-Leg Jeans (Thrifted)"
  | "Jorts"
  | "Bags"
  | "Leather Jackets"
  | "Hoodies"
  | "Tees/Shirts"
  | "Jerseys"
  | "Caps"
  | "Shoes";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  gallery?: string[];
  alt: string;
  sizes: string[];
  isNew?: boolean;
  isLimited?: boolean;
  /** Seller opted in: when sold out (or a size is), customers can pre-order via WhatsApp. */
  allowPreorder?: boolean;
  /** Optional customer-facing lead time for pre-orders, e.g. "5–7 days". */
  preorderLeadTime?: string;
  description: string;
  /** Quantity per size, only for sizes that are tracked. A size missing here is not tracked (available). */
  stock?: Record<string, number>;
  /** ISO timestamp from the database; the bundled fallback products derive it from array order. */
  created_at?: string;
}

export const LOW_STOCK_THRESHOLD = 3;

export const sizeAvailable = (product: Product, size: string) => (product.stock?.[size] ?? 1) > 0;

/** Pre-order pieces have no picker: customers are told this range and confirm their size on WhatsApp. */
export const PREORDER_SIZE_RANGE = "36–42";

/** Pre-order enquiry text sent to the store on WhatsApp. */
export const preorderMessage = (product: Product, quantity = 1) =>
  `Hi TALK OF! I'd like to pre-order ${product.name}, quantity ${quantity}. Please share the price and which sizes (${PREORDER_SIZE_RANGE}) are available. Thanks!`;

/** Sold out when the product has sizes and every one of them is tracked at 0. */
export const isSoldOut = (product: Product) =>
  product.sizes.length > 0 && product.sizes.every((size) => !sizeAvailable(product, size));

/** Units left in a size, or null when the size is not tracked (treated as available, no count shown). */
export const stockLeft = (product: Product, size: string): number | null =>
  product.stock?.[size] ?? null;

/**
 * True when the piece is sold as a pre-order: the seller allowed pre-orders and the piece isn't kept in
 * stock (no tracked stock) or every size is at 0. Pre-order pieces show no price and no size picker.
 */
export const needsPreorder = (product: Product) =>
  product.allowPreorder === true &&
  (!product.stock || Object.keys(product.stock).length === 0 || isSoldOut(product));

/** Customer-facing "Ready in ..." text, or "" when the seller left the lead time empty. */
export const preorderLeadText = (product: Product) =>
  product.preorderLeadTime?.trim() ? `Ready in ${product.preorderLeadTime.trim()}` : "";

/** "Only N left" range: tracked, at least 1, at most LOW_STOCK_THRESHOLD. */
export const isLowStock = (product: Product, size: string) => {
  const left = stockLeft(product, size);
  return left !== null && left >= 1 && left <= LOW_STOCK_THRESHOLD;
};

/** Stable sort that moves sold-out products to the end while keeping the existing order inside each group. */
export const soldOutLast = <T extends Product>(list: T[]): T[] =>
  [...list].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)));

/**
 * "You may also like": up to `limit` products other than `current`. In-stock ones come first
 * (same category before other categories), sold-out ones go last (same category first there too).
 */
export function relatedProducts(current: Product, all: Product[], limit = 4): Product[] {
  const rank = (product: Product) =>
    Number(isSoldOut(product)) * 2 + Number(product.category !== current.category);
  return all
    .filter((product) => product.id !== current.id)
    .map((product, index) => ({ product, index, rank: rank(product) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.product);
}

const rawProducts: Product[] = [
  // TODO: confirm prices and sizes with the client (placeholders for the new jeans and jerseys).
  {
    id: "dark-indigo-wide-leg-jeans",
    name: "Dark Indigo Wide-Leg Jeans",
    price: 2400,
    category: "Baggy Jeans (New)",
    image: images.jeansIndigo1,
    gallery: [images.jeansIndigo1, images.jeansIndigo2, images.jeansIndigo3],
    alt: "Dark indigo wide-leg jeans laid flat",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "Deep indigo denim with a wide, easy leg. A clean, dark base for every fit in the rotation.",
  },
  {
    id: "vintage-blue-panel-wide-leg-jeans",
    name: "Vintage Blue Panel Wide-Leg Jeans",
    price: 2400,
    category: "Baggy Jeans (New)",
    image: images.jeansVintage1,
    gallery: [images.jeansVintage1, images.jeansVintage2, images.jeansVintage3],
    alt: "Faded vintage blue wide-leg jeans with front seam panels and slit pockets, laid flat",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "A faded vintage wash with front seam panels and slit pockets. Wide through the leg, with a lived-in feel from day one.",
  },
  {
    id: "light-wash-bow-hem-jeans",
    name: "Light Wash Bow-Hem Jeans",
    price: 2400,
    category: "Baggy Jeans (New)",
    image: images.jeansBow1,
    gallery: [images.jeansBow1, images.jeansBow2],
    alt: "Light wash baggy jeans with pink ribbon bows at the hem slits, laid flat",
    sizes: ["S", "M", "L", "XL"],
    isLimited: true,
    description:
      "Light-wash baggy denim with pink ribbon bows tied at the hem slits. A soft detail on a relaxed fit.",
  },
  {
    id: "japan-retro-home-jersey",
    name: "Japan Retro Home Jersey",
    price: 3500,
    category: "Jerseys",
    image: images.jerseyJapan1,
    gallery: [images.jerseyJapan1, images.jerseyJapan2],
    alt: "Blue adidas Japan retro home football jersey with white shoulder panels, laid flat",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "Retro Japan home shirt in royal blue with white shoulder panels, red trim and the JFA crest. A collector's piece that works as a streetwear layer.",
  },
  {
    id: "ac-milan-retro-home-jersey",
    name: "AC Milan Retro Home Jersey",
    price: 3500,
    category: "Jerseys",
    image: images.jerseyMilan1,
    gallery: [images.jerseyMilan1, images.jerseyMilan2],
    alt: "Red and black striped adidas AC Milan retro home football jersey with bwin sponsor, laid flat",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "The classic red and black stripes with gold piping and the bwin front print. Retro Milan, ready to wear loose.",
  },
  {
    id: "portugal-2012-away-jersey",
    name: "Portugal 2012 Away Jersey",
    price: 3500,
    category: "Jerseys",
    image: images.jerseyPortugal1,
    gallery: [images.jerseyPortugal1, images.jerseyPortugal2],
    alt: "White Nike Portugal away football jersey with green and red cross stripes and Portugal/Espanha 27/06/2012 match print, laid flat",
    sizes: ["S", "M", "L", "XL"],
    isLimited: true,
    description:
      "White Nike away shirt with the green and red cross stripes and the Portugal / Espanha 27/06/2012 match print. A clean one for the collection.",
  },
  {
    id: "washed-black-baggy-denim",
    name: "Washed Black Baggy Denim",
    price: 2500,
    category: "Baggy Jeans (New)",
    image: images.blackDenim,
    alt: "Model wearing relaxed, washed-black baggy jeans",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "Heavy on the silhouette. Easy on the styling. A relaxed washed denim fit made for the everyday rotation.",
  },
  {
    id: "vintage-blue-wide-leg-jeans",
    name: "Vintage Blue Wide-Leg Jeans",
    price: 2200,
    category: "Baggy Jeans (New)",
    image: images.denim,
    alt: "Model in a vintage blue denim jacket and wide-leg jeans",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "Room to move, denim that does the talking. A vintage-inspired wide-leg cut with an easy, lived-in feel.",
  },
  {
    id: "oversized-washed-black-jacket",
    name: "Oversized Washed Black Jacket",
    price: 3800,
    category: "Jackets",
    image: images.hero,
    alt: "Model in an oversized washed-black jacket and baggy black denim in a Nairobi alley",
    sizes: ["S", "M", "L", "XL"],
    isLimited: true,
    description:
      "A boxy, washed-black outer layer with a little edge. Built to make the simplest fit feel intentional.",
  },
  {
    id: "utility-cargo-jorts",
    name: "Utility Cargo Jorts",
    price: 1800,
    category: "Jorts",
    image: images.jorts,
    alt: "Model wearing olive utility cargo jorts",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "A relaxed above-the-knee cut with utility pockets. Made for long days and low-effort styling.",
  },
  {
    id: "vintage-graphic-tee",
    name: "Vintage Graphic Tee",
    price: 1200,
    category: "Tees/Shirts",
    image: images.tee,
    alt: "Model in a vintage-style oversized charcoal graphic tee",
    sizes: ["S", "M", "L", "XL"],
    description:
      "A roomy everyday layer with a vintage-inspired graphic. Wear it your way, on repeat.",
  },
  {
    id: "oversized-denim-jacket",
    name: "Oversized Denim Jacket",
    price: 3200,
    category: "Jackets",
    image: images.denimJacket,
    alt: "Model wearing an oversized blue denim jacket",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description:
      "The throw-on-and-go layer. A generous vintage denim shape that works with just about everything.",
  },
  {
    id: "washed-denim-cargo-jorts",
    name: "Washed Denim Cargo Jorts",
    price: 2400,
    category: "Jorts",
    image: images.lookbook,
    alt: "Model in washed denim cargo jorts with a vintage graphic tee",
    sizes: ["S", "M", "L", "XL"],
    isLimited: true,
    description:
      "A long, roomy cargo cut in washed denim with everyday utility pockets. Made to anchor the rest of your outfit.",
  },
  {
    id: "vintage-denim-co-ord",
    name: "Vintage Denim Co-Ord",
    price: 2800,
    category: "Jackets",
    image: images.denim,
    alt: "Model in a matching vintage-wash denim jacket and wide-leg jeans",
    sizes: ["S", "M", "L", "XL"],
    description:
      "Jacket and wide-leg jeans cut from the same vintage wash. Wear them together, or split the set across two fits.",
  },
];

// Bundled fallback: array order = newest first, so give each product a descending timestamp.
const FALLBACK_EPOCH = Date.UTC(2026, 0, 1);
export const products: Product[] = rawProducts.map((product, index) => ({
  ...product,
  created_at: new Date(FALLBACK_EPOCH - index * 60_000).toISOString(),
}));

export const productCategories = [
  "All",
  "Jeans",
  "Baggy Jeans (New)",
  "Wide-Leg Jeans (Thrifted)",
  "Jorts",
  "Bags",
  "Leather Jackets",
  "Hoodies",
  "Tees/Shirts",
  "Jerseys",
  "Caps",
  "Shoes",
  "New Arrivals",
] as const;

export const formatPrice = (price: number) => `KSh ${price.toLocaleString("en-KE")}`;
