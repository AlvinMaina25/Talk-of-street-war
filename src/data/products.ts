import { images } from "@/data/images";

export type ProductCategory = "Baggy Jeans" | "Jorts" | "Jackets" | "Tops" | "Cargo";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  image: string;
  alt: string;
  sizes: string[];
  isNew?: boolean;
  isLimited?: boolean;
  description: string;
}

export const products: Product[] = [
  {
    id: "washed-black-baggy-denim",
    name: "Washed Black Baggy Denim",
    price: 2500,
    category: "Baggy Jeans",
    image: images.blackDenim,
    alt: "Model wearing relaxed, washed-black baggy jeans",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description: "Heavy on the silhouette. Easy on the styling. A relaxed washed denim fit made for the everyday rotation.",
  },
  {
    id: "vintage-blue-wide-leg-jeans",
    name: "Vintage Blue Wide-Leg Jeans",
    price: 2200,
    category: "Baggy Jeans",
    image: images.denim,
    alt: "Model in a vintage blue denim jacket and wide-leg jeans",
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    description: "Room to move, denim that does the talking. A vintage-inspired wide-leg cut with an easy, lived-in feel.",
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
    description: "A boxy, washed-black outer layer with a little edge. Built to make the simplest fit feel intentional.",
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
    description: "A relaxed above-the-knee cut with utility pockets. Made for long days and low-effort styling.",
  },
  {
    id: "vintage-graphic-tee",
    name: "Vintage Graphic Tee",
    price: 1200,
    category: "Tops",
    image: images.tee,
    alt: "Model in a vintage-style oversized charcoal graphic tee",
    sizes: ["S", "M", "L", "XL"],
    description: "A roomy everyday layer with a vintage-inspired graphic. Wear it your way, on repeat.",
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
    description: "The throw-on-and-go layer. A generous vintage denim shape that works with just about everything.",
  },
  {
    id: "washed-denim-cargo-jorts",
    name: "Washed Denim Cargo Jorts",
    price: 2400,
    category: "Cargo",
    image: images.lookbook,
    alt: "Model in washed denim cargo jorts with a vintage graphic tee",
    sizes: ["S", "M", "L", "XL"],
    isLimited: true,
    description: "A long, roomy cargo cut in washed denim with everyday utility pockets. Made to anchor the rest of your outfit.",
  },
  {
    id: "vintage-denim-co-ord",
    name: "Vintage Denim Co-Ord",
    price: 2800,
    category: "Jackets",
    image: images.denim,
    alt: "Model in a matching vintage-wash denim jacket and wide-leg jeans",
    sizes: ["S", "M", "L", "XL"],
    description: "Jacket and wide-leg jeans cut from the same vintage wash. Wear them together, or split the set across two fits.",
  },
];

export const productCategories = ["All", "Baggy Jeans", "Jorts", "Jackets", "Tops", "Cargo", "New Arrivals"] as const;

export const formatPrice = (price: number) => `KSh ${price.toLocaleString("en-KE")}`;