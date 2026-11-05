"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Package, ShoppingBag } from "lucide-react";
import CoverImage from "../CoverImage";
import { useCart } from "@/lib/shop/cart-context";
import { cheapestVariation, sortedImages, toNumber, type ApiProduct } from "@/lib/api-types";
import { HERO_CELEBRATE_EVENT } from "./HeroScene";
import styles from "./Hero.module.css";

const ADVANCE_MS = 6000;

/** A shoppable product card floating in the set, cycling through real stock. */
export default function HeroSpotlight({ products }: { products: ApiProduct[] }) {
  const { lines, add } = useCart();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (products.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % products.length);
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [products.length, paused]);

  if (products.length === 0) return null;

  const product = products[Math.min(active, products.length - 1)];
  const image = sortedImages(product.images)[0];
  const variation = cheapestVariation(product.variations);
  const price = variation ? toNumber(variation.price) : undefined;
  const original = variation ? toNumber(variation.strikeThroughPrice) : undefined;
  const hasDiscount = !!original && original > (price ?? 0);
  const inStock = (variation?.stock ?? 0) > 0;
  const line = variation
    ? lines.find((l) => l.productId === product.id && l.variationId === variation.id)
    : undefined;

  const step = (by: number) =>
    setActive((current) => (current + by + products.length) % products.length);

  return (
    <aside
      className={styles.spotlight}
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.spotlightHead}>
        <span className={styles.spotlightLabel}>Featured piece</span>
        {products.length > 1 && (
          <div className={styles.spotlightNav}>
            <button type="button" aria-label="Previous product" onClick={() => step(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span aria-live="polite">
              {Math.min(active, products.length - 1) + 1}/{products.length}
            </span>
            <button type="button" aria-label="Next product" onClick={() => step(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Remounting on product change is what replays the entrance animation. */}
      <div className={styles.spotlightBody} key={product.id}>
        <Link href={`/product/${product.slug}`} className={styles.spotlightImage} tabIndex={-1} aria-hidden="true">
          <CoverImage src={image?.url} alt="" icon={Package} tone="lavender" rounded="sm" />
        </Link>
        <div className={styles.spotlightInfo}>
          <p className={styles.spotlightCategory}>{product.category.name}</p>
          <h2 className={styles.spotlightName}>
            <Link href={`/product/${product.slug}`} title={product.name}>
              {product.name}
            </Link>
          </h2>
          <div className={styles.spotlightPrice}>
            {price !== undefined && <strong>₹{price}</strong>}
            {hasDiscount && <s>₹{original}</s>}
            {hasDiscount && (
              <em>{Math.round((1 - (price ?? 0) / (original as number)) * 100)}% off</em>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={line ? styles.spotlightAdded : styles.spotlightAdd}
        disabled={!inStock || !variation}
        onClick={() => {
          if (!variation) return;
          add(product, variation);
          window.dispatchEvent(new CustomEvent(HERO_CELEBRATE_EVENT));
        }}
      >
        {!inStock ? (
          "Out of stock"
        ) : line ? (
          <>
            <Check size={16} /> In cart ({line.quantity}) · Add another
          </>
        ) : (
          <>
            <ShoppingBag size={16} /> Add to cart
          </>
        )}
      </button>
    </aside>
  );
}
