"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import ProductCard from "../ProductCard";
import type { ApiCategory, ApiProduct } from "@/lib/api-types";
import styles from "./FeaturedProducts.module.css";

export default function FeaturedProducts({
  products,
  categories,
}: {
  products: ApiProduct[];
  categories: ApiCategory[];
}) {
  const [active, setActive] = useState<string>("All");
  const visible =
    active === "All" ? products : products.filter((p) => p.categoryId === active);

  return (
    <section id="shop" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <h2 className={`display ${styles.heading}`}>
            Featured <span>Products</span>
          </h2>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={active === "All"}
              className={active === "All" ? styles.tabActive : styles.tab}
              onClick={() => setActive("All")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active === category.id}
                className={active === category.id ? styles.tabActive : styles.tab}
                onClick={() => setActive(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <a href="#" className={styles.link}>
            View All <ArrowRight size={15} />
          </a>
        </div>

        {visible.length === 0 ? (
          <p className={styles.empty}>No products to show yet.</p>
        ) : (
          <div className={styles.grid}>
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
