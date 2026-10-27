"use client";

import Link from "next/link";
import { Check, Eye, Package, ShoppingBag, Trash2 } from "lucide-react";
import CoverImage from "./CoverImage";
import { useCart } from "@/lib/shop/cart-context";
import { cheapestVariation, sortedImages, toNumber, type ApiProduct } from "@/lib/api-types";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product }: { product: ApiProduct }) {
  const { lines, add, remove } = useCart();

  const image = sortedImages(product.images)[0];
  const variation = cheapestVariation(product.variations);
  const price = variation ? toNumber(variation.price) : undefined;
  const originalPrice = variation ? toNumber(variation.strikeThroughPrice) : undefined;
  const hasDiscount = !!originalPrice && originalPrice > (price ?? 0);
  const discountPercent = hasDiscount
    ? Math.round((1 - (price ?? 0) / (originalPrice as number)) * 100)
    : undefined;
  const inStock = (variation?.stock ?? 0) > 0;

  const line = variation
    ? lines.find((l) => l.productId === product.id && l.variationId === variation.id)
    : undefined;
  const inCart = line !== undefined;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          <CoverImage
            src={image?.url}
            alt={product.name}
            icon={Package}
            tone="lavender"
            rounded="md"
          />
        </Link>
        {hasDiscount && <span className={styles.badge}>{discountPercent}% OFF</span>}
      </div>

      <div className={styles.body}>
        <p className={styles.category}>{product.category.name}</p>

        <h3 className={styles.name}>
          <Link href={`/product/${product.slug}`} title={product.name}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.priceRow}>
          {price !== undefined && <span className={styles.price}>₹{price}</span>}
          {hasDiscount && <span className={styles.originalPrice}>₹{originalPrice}</span>}
        </div>

        {/* On phones the card is too small for cart controls, so it links
            straight to the product page instead. */}
        <Link href={`/product/${product.slug}`} className={styles.viewBtn}>
          <Eye size={15} /> View Product
        </Link>

        {/* Add and remove are deliberately separate controls, never one toggle. */}
        <div className={styles.actions}>
          <button
            type="button"
            className={inCart ? styles.addBtnDone : styles.addBtn}
            disabled={!inStock || !variation}
            onClick={() => variation && add(product, variation)}
          >
            {!inStock ? (
              "Out of Stock"
            ) : inCart ? (
              <>
                <Check size={15} /> In Cart ({line?.quantity})
              </>
            ) : (
              <>
                <ShoppingBag size={15} /> Add to Cart
              </>
            )}
          </button>

          {inCart && variation && (
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => remove(product.id, variation.id)}
              aria-label={`Remove ${product.name} from cart`}
              title="Remove from cart"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
