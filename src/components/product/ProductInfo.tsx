"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gem, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { cheapestVariation, toNumber, type ApiProduct } from "@/lib/api-types";
import { useCart } from "@/lib/shop/cart-context";
import { tiptapToPlainText } from "@/lib/tiptap-text";
import styles from "./ProductInfo.module.css";

const trustItems = [
  { icon: Heart, label: "Handmade with Care" },
  { icon: Gem, label: "Premium Quality" },
  { icon: ShieldCheck, label: "Safe & Easy Returns" },
  { icon: Truck, label: "Worldwide Delivery" },
];

export default function ProductInfo({ product }: { product: ApiProduct }) {
  const router = useRouter();
  const { lines, add, remove } = useCart();
  const defaultVariation = cheapestVariation(product.variations) ?? product.variations[0];
  const [variationId, setVariationId] = useState(defaultVariation?.id);
  const [quantity, setQuantity] = useState(1);

  const variation =
    product.variations.find((v) => v.id === variationId) ?? defaultVariation;

  // The button follows the cart itself rather than a transient "added" flag, so
  // it still reads correctly after a reload or a change made on the cart page.
  const line = variation
    ? lines.find((l) => l.productId === product.id && l.variationId === variation.id)
    : undefined;
  const inCart = line !== undefined;

  const price = variation ? toNumber(variation.price) : undefined;
  const originalPrice = variation ? toNumber(variation.strikeThroughPrice) : undefined;
  const hasDiscount = !!originalPrice && originalPrice > (price ?? 0);
  const discountPercent = hasDiscount
    ? Math.round((1 - (price ?? 0) / (originalPrice as number)) * 100)
    : undefined;
  const stock = variation?.stock ?? 0;
  const summary = product.metaDescription ?? tiptapToPlainText(product.description).slice(0, 220);

  function toggleCart() {
    if (!variation) return;
    if (inCart) {
      remove(product.id, variation.id);
    } else {
      add(product, variation, quantity);
    }
  }

  function buyNow() {
    if (!variation) return;
    add(product, variation, quantity);
    router.push("/checkout");
  }

  return (
    <div className={styles.info}>
      <span className={styles.badge}>⭐ {product.category.name}</span>

      <h1 className={styles.title}>{product.name}</h1>

      <div className={styles.priceRow}>
        {price !== undefined && <span className={styles.price}>₹{price}</span>}
        {hasDiscount && (
          <>
            <span className={styles.originalPrice}>₹{originalPrice}</span>
            <span className={styles.discount}>{discountPercent}% OFF</span>
          </>
        )}
      </div>

      {summary && <p className={styles.summary}>{summary}</p>}

      {product.variations.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Options</span>
          <div className={styles.variants}>
            {product.variations.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                className={v.id === variation?.id ? styles.variantPillActive : styles.variantPill}
                onClick={() => {
                  setVariationId(v.id);
                  setQuantity(1);
                }}
              >
                <span>{v.name}</span>
                <span className={styles.variantPrice}>₹{toNumber(v.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Quantity</span>
        <div className={styles.quantityRow}>
          <div className={styles.stepper}>
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus size={14} />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
            >
              <Plus size={14} />
            </button>
          </div>
          <span className={styles.stock}>
            <span className={styles.stockDot} aria-hidden="true" />
            {stock > 0 ? `Only ${stock} left in stock` : "Out of stock"}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={inCart ? styles.removeFromCart : styles.addToCart}
          disabled={stock === 0}
          onClick={toggleCart}
        >
          {inCart ? <Trash2 size={17} /> : <ShoppingBag size={17} />}
          {inCart ? "Remove from Cart" : "Add to Cart"}
        </button>
        <button
          type="button"
          className={styles.buyNow}
          disabled={stock === 0}
          onClick={buyNow}
        >
          Buy Now
        </button>
      </div>

      {inCart && (
        <p className={styles.cartNote}>
          {line?.quantity} in your cart ·{" "}
          <Link href="/cart">View cart</Link>
        </p>
      )}

      <ul className={styles.trust}>
        {trustItems.map(({ icon: Icon, label }) => (
          <li key={label}>
            <Icon size={19} strokeWidth={1.6} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
