"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../ProductCard";
import ProductRow from "./ProductRow";
import { cheapestVariation, toNumber, type ApiCategory, type ApiProduct, type ApiTag } from "@/lib/api-types";
import styles from "./ShopCatalog.module.css";

type Sort = "newest" | "price-low" | "price-high" | "name";
type View = "grid" | "list";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

function priceOf(product: ApiProduct) {
  const variation = cheapestVariation(product.variations);
  return variation ? toNumber(variation.price) : 0;
}

function inStock(product: ApiProduct) {
  return product.variations.some((variation) => variation.stock > 0);
}

/**
 * The whole catalogue is fetched once on the server and filtered here, so
 * searching and switching categories is instant with no round-trip. The active
 * filters are mirrored into the URL (without a navigation) so a filtered view
 * can be shared or reloaded.
 */
export default function ShopCatalog({
  products,
  categories,
  tags,
  initialQuery = "",
  initialCategory = "",
  initialTag = "",
}: {
  products: ApiProduct[];
  categories: ApiCategory[];
  tags: ApiTag[];
  initialQuery?: string;
  initialCategory?: string;
  initialTag?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [sort, setSort] = useState<Sort>("newest");
  const [stockOnly, setStockOnly] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Keep the address bar in step without triggering a route change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("category", categoryId);
    if (tag) params.set("tag", tag);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `/shop?${search}` : "/shop");
  }, [query, categoryId, tag]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = products
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .filter((product) => !tag || product.tags.some((t) => t.name === tag))
      .filter((product) => !stockOnly || inStock(product))
      .filter(
        (product) =>
          !needle ||
          [product.name, product.category.name, product.metaDescription ?? "", ...product.tags.map((t) => t.name)]
            .join(" ")
            .toLowerCase()
            .includes(needle)
      );

    const sorted = [...filtered];
    if (sort === "price-low") sorted.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "price-high") sorted.sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return sorted;
  }, [products, query, categoryId, tag, stockOnly, sort]);

  const activeFilters = (categoryId ? 1 : 0) + (tag ? 1 : 0) + (stockOnly ? 1 : 0);

  function clearAll() {
    setQuery("");
    setCategoryId("");
    setTag("");
    setStockOnly(false);
  }

  return (
    <div className={styles.layout}>
      {/* ---- Toolbar ---- */}
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, categories, tags…"
            aria-label="Search products"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>

        <button
          type="button"
          className={styles.filterToggle}
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} /> Filters
          {activeFilters > 0 && <span className={styles.filterCount}>{activeFilters}</span>}
        </button>

        <select
          className={styles.sort}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort products"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className={styles.viewToggle} role="group" aria-label="View">
          <button
            type="button"
            className={view === "grid" ? styles.viewActive : styles.viewBtn}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={view === "list" ? styles.viewActive : styles.viewBtn}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ---- Filters ---- */}
      <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ""}`}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Category</span>
          <div className={styles.chips}>
            <button
              type="button"
              className={categoryId === "" ? styles.chipActive : styles.chip}
              onClick={() => setCategoryId("")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={categoryId === category.id ? styles.chipActive : styles.chip}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Tag</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={tag === "" ? styles.chipActive : styles.chip}
                onClick={() => setTag("")}
              >
                Any
              </button>
              {tags.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={tag === item.name ? styles.chipActive : styles.chip}
                  onClick={() => setTag(item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.filterFooter}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
            />
            In stock only
          </label>

          {(activeFilters > 0 || query) && (
            <button type="button" className={styles.clear} onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ---- Results ---- */}
      <p className={styles.count}>
        <strong>{visible.length}</strong> product{visible.length === 1 ? "" : "s"}
        {query && <> for “{query}”</>}
      </p>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <PackageSearch size={28} strokeWidth={1.6} />
          <h3>Nothing matched</h3>
          <p>Try a different search, or clear the filters to see everything.</p>
          <button type="button" className={styles.clearBig} onClick={clearAll}>
            Clear filters
          </button>
        </div>
      ) : view === "grid" ? (
        <div className={styles.grid}>
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
