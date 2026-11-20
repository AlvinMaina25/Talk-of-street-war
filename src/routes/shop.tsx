import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid, SectionHeading } from "@/components/storefront";
import { products, productCategories } from "@/data/products";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): { category?: string; q?: string; focusSearch?: boolean } => ({
    ...(typeof search["category"] === "string" ? { category: search["category"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(search["focusSearch"] === true || search["focusSearch"] === "true" ? { focusSearch: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Shop the Collection — TALK OF Streetwear" },
      { name: "description", content: "Explore baggy denim, jorts, vintage-inspired layers and more in the TALK OF concept collection." },
      { property: "og:title", content: "Shop the Collection — TALK OF" },
      { property: "og:description", content: "Explore the TALK OF streetwear concept collection and find your next fit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const searchParams = useSearch({ from: "/shop" });
  const navigate = useNavigate({ from: "/shop" });
  const [category, setCategory] = useState(searchParams.category ?? "All");
  const [query, setQuery] = useState(searchParams.q ?? "");
  const [size, setSize] = useState("All sizes");
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setCategory(searchParams.category ?? "All");
    setQuery(searchParams.q ?? "");
  }, [searchParams.category, searchParams.q]);

  useEffect(() => {
    if (searchParams.focusSearch) {
      document.querySelector<HTMLInputElement>('input[aria-label="Search products"]')?.focus();
    }
  }, [searchParams.focusSearch]);

  function syncFilters(nextCategory: string, nextQuery: string) {
    void navigate({
      search: () => ({
        ...(nextCategory === "All" ? {} : { category: nextCategory }),
        ...(nextQuery.trim() ? { q: nextQuery } : {}),
      }),
    });
  }

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory = category === "All" ||
        (category === "New Arrivals" ? product.isNew : product.category === category);
      const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesSize = size === "All sizes" || product.sizes.includes(size);
      return matchesCategory && matchesSearch && matchesSize;
    });
    if (sort === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "newest") result = [...result].sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return result;
  }, [category, query, size, sort]);

  return <main className="shop-page">
    <section className="shop-intro"><p className="eyebrow">TALK OF · NAIROBI, KENYA</p><h1 className="display-heading">THE SHOP<span>.</span></h1><p>Find the pieces that feel like you.</p><div className="shop-breadcrumb">HOME <span>/</span> SHOP</div></section>
    <section className="section-wrap shop-catalog">
      <div className="shop-topline"><span className="demo-note"><span /> Concept store — products and prices shown for demonstration.</span><span className="product-count">{filtered.length} PIECES</span></div>
      <div className="shop-controls">
        <div className="search-field"><Search size={17} /><input aria-label="Search products" type="search" placeholder="Search the collection" value={query} onChange={(event) => { setQuery(event.target.value); syncFilters(category, event.target.value); }} />{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => { setQuery(""); syncFilters(category, ""); }}><X size={15} /></Button>}</div>
        <Button variant="outline" className="filter-toggle md:hidden" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> FILTERS {filtersOpen ? <X size={14} /> : null}</Button>
        <label className="sort-select"><span>SORT BY</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
      </div>
      <div className={`shop-filter-row ${filtersOpen ? "filters-open" : ""}`}>
        <div className="category-filter" role="group" aria-label="Filter by category">{productCategories.map((item) => <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => { setCategory(item); syncFilters(item, query); }}>{item}</Button>)}</div>
        <label className="size-filter"><span>SIZE</span><select value={size} onChange={(event) => setSize(event.target.value)} aria-label="Filter by size"><option>All sizes</option>{["S", "M", "L", "XL"].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="shop-results"><p className="result-summary">{category === "All" ? "THE FULL ROTATION" : category.toUpperCase()} <span>·</span> {filtered.length} RESULTS</p><ProductGrid items={filtered} /></div>
    </section>
  </main>;
}