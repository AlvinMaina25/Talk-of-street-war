import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront";
import { productCategories, soldOutLast, type Product } from "@/data/products";
import { fetchActiveProducts } from "@/lib/products-api";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name A–Z" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortKey = "newest";
const isSortKey = (value: unknown): value is SortKey =>
  SORT_OPTIONS.some((option) => option.value === value);
const SEARCH_DEBOUNCE_MS = 200;

/** Sorts by the chosen key, then moves sold-out products to the end (their relative order is kept). */
function sortProducts(list: Product[], sort: SortKey): Product[] {
  const sorted = [...list];
  if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
  else if (sort === "name-asc")
    sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  else sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return soldOutLast(sorted);
}

/** Every word typed must appear in the product name or category (case-insensitive). */
function matchesQuery(product: Product, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = `${product.name} ${product.category}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export const Route = createFileRoute("/shop")({
  loader: () => fetchActiveProducts(),
  // Unknown or malformed values are dropped, so a bad link just shows the default view.
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: string; q?: string; sort?: SortKey; focusSearch?: boolean } => ({
    ...(typeof search["category"] === "string" && search["category"] && search["category"] !== "All"
      ? { category: search["category"].slice(0, 60) }
      : {}),
    ...(typeof search["q"] === "string" && search["q"].trim()
      ? { q: search["q"].slice(0, 100) }
      : {}),
    ...(isSortKey(search["sort"]) && search["sort"] !== DEFAULT_SORT
      ? { sort: search["sort"] }
      : {}),
    ...(search["focusSearch"] === true || search["focusSearch"] === "true"
      ? { focusSearch: true }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Shop the Collection — TALK OF Streetwear" },
      {
        name: "description",
        content:
          "Explore baggy denim, jorts, vintage-inspired layers and more in the TALK OF concept collection.",
      },
      { property: "og:title", content: "Shop the Collection — TALK OF" },
      {
        property: "og:description",
        content: "Explore the TALK OF streetwear concept collection and find your next fit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const products = Route.useLoaderData();
  const categories = useMemo(() => {
    const extra = [...new Set(products.map((p) => p.category))].filter(
      (c) => !(productCategories as readonly string[]).includes(c),
    );
    return [...productCategories.filter((c) => c !== "New Arrivals"), ...extra, "New Arrivals"];
  }, [products]);
  // S–XL first, then any other sizes found on products (shoe sizes, "One size", ...).
  const sizeOptions = useMemo(() => {
    const base = ["S", "M", "L", "XL"];
    const extra = [...new Set(products.flatMap((p) => p.sizes))]
      .filter((s) => !base.includes(s))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    return [...base, ...extra];
  }, [products]);
  const searchParams = useSearch({ from: "/shop" });
  const navigate = useNavigate({ from: "/shop" });
  // The URL is the source of truth for category, sort and the (debounced) search text.
  const category = searchParams.category ?? "All";
  const sort: SortKey = searchParams.sort ?? DEFAULT_SORT;
  const urlQuery = searchParams.q ?? "";
  const [query, setQuery] = useState(urlQuery); // what is typed in the box right now
  const [size, setSize] = useState("All sizes");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pushedQuery = useRef(urlQuery); // last q we wrote to the URL, so our own update doesn't overwrite typing

  function pushSearch(next: { category?: string; q?: string; sort?: SortKey }) {
    const nextCategory = next.category ?? category;
    const nextQuery = next.q ?? urlQuery;
    const nextSort = next.sort ?? sort;
    void navigate({
      replace: true,
      search: () => ({
        ...(nextCategory !== "All" ? { category: nextCategory } : {}),
        ...(nextQuery.trim() ? { q: nextQuery } : {}),
        ...(nextSort !== DEFAULT_SORT ? { sort: nextSort } : {}),
      }),
    });
  }

  // URL changed from outside (back button, shared link, "Clear"): show it in the box.
  useEffect(() => {
    if (urlQuery !== pushedQuery.current) {
      pushedQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  // Typing updates the URL ~200ms after the last keystroke; filtering reads the URL value.
  useEffect(() => {
    if (query === pushedQuery.current) return;
    const timer = setTimeout(() => {
      pushedQuery.current = query;
      pushSearch({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // pushSearch reads category/sort from this render, so re-arm if they change while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, sort]);

  useEffect(() => {
    if (searchParams.focusSearch) {
      document.querySelector<HTMLInputElement>('input[aria-label="Search products"]')?.focus();
    }
  }, [searchParams.focusSearch]);

  function clearAll() {
    pushedQuery.current = "";
    setQuery("");
    setSize("All sizes");
    pushSearch({ category: "All", q: "" });
  }

  const filtered = useMemo(() => {
    const matching = products.filter((product) => {
      const matchesCategory =
        category === "All" ||
        (category === "New Arrivals" ? product.isNew : product.category === category);
      const matchesSize = size === "All sizes" || product.sizes.includes(size);
      return matchesCategory && matchesQuery(product, urlQuery) && matchesSize;
    });
    return sortProducts(matching, sort);
  }, [products, category, urlQuery, size, sort]);

  return (
    <main className="shop-page">
      <section className="shop-intro">
        <p className="eyebrow">TALK OF · NAIROBI, KENYA</p>
        <h1 className="display-heading">
          THE SHOP<span>.</span>
        </h1>
        <p>Find the pieces that feel like you.</p>
        <div className="shop-breadcrumb">
          HOME <span>/</span> SHOP
        </div>
      </section>
      <section className="section-wrap shop-catalog">
        <div className="shop-topline">
          <span className="demo-note">
            <span /> Concept store — products and prices shown for demonstration.
          </span>
          <span className="product-count">{filtered.length} PIECES</span>
        </div>
        <div className="shop-controls">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search products"
              type="search"
              placeholder="Search the collection"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                onClick={() => {
                  pushedQuery.current = "";
                  setQuery("");
                  pushSearch({ q: "" });
                }}
              >
                <X size={15} />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            className="filter-toggle md:hidden"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} /> FILTERS {filtersOpen ? <X size={14} /> : null}
          </Button>
          <label className="sort-select">
            <span>SORT BY</span>
            <select
              value={sort}
              onChange={(event) => pushSearch({ sort: event.target.value as SortKey })}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={`shop-filter-row ${filtersOpen ? "filters-open" : ""}`}>
          <div className="category-filter" role="group" aria-label="Filter by category">
            {categories.map((item) => (
              <Button
                key={item}
                variant={category === item ? "default" : "outline"}
                size="sm"
                onClick={() => pushSearch({ category: item })}
              >
                {item}
              </Button>
            ))}
          </div>
          <label className="size-filter">
            <span>SIZE</span>
            <select
              value={size}
              onChange={(event) => setSize(event.target.value)}
              aria-label="Filter by size"
            >
              <option>All sizes</option>
              {sizeOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="shop-results">
          <p className="result-summary">
            {category === "All" ? "THE FULL ROTATION" : category.toUpperCase()} <span>·</span>{" "}
            {filtered.length} RESULTS
          </p>
          <ProductGrid items={filtered} priorityCount={4} onClear={clearAll} />
        </div>
      </section>
    </main>
  );
}
