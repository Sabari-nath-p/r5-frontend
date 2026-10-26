"use client";

import { useState } from "react";
import type { ApiProduct } from "@/lib/api";
import { tiptapToPlainText } from "@/lib/tiptap-text";
import PromoCard from "./PromoCard";
import styles from "./ProductTabs.module.css";

const tabs = ["Description", "Shipping & Returns", "Reviews"] as const;

export default function ProductTabs({ product }: { product: ApiProduct }) {
  const [active, setActive] = useState<(typeof tabs)[number]>("Description");
  const description = tiptapToPlainText(product.description);

  return (
    <section className={styles.section}>
      <div className={styles.tabBar} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            className={active === tab ? styles.tabActive : styles.tab}
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          {active === "Description" && (
            <>
              <p>{description || "No description available yet."}</p>
              {product.tags.length > 0 && (
                <div className={styles.tags}>
                  {product.tags.map((tag) => (
                    <span key={tag.id} className={styles.tagPill}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {active === "Shipping & Returns" && (
            <p>
              We dispatch every order within 2–3 business days and ship
              worldwide. If something isn&apos;t right, reach out within 7
              days of delivery for an easy, no-fuss return or exchange.
            </p>
          )}

          {active === "Reviews" && <p>No reviews yet — be the first to share yours.</p>}
        </div>

        <PromoCard icon="package" />
      </div>
    </section>
  );
}
