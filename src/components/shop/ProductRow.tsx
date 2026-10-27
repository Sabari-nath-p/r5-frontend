"use client";

import Link from "next/link";
import { Check, Eye, Package, ShoppingBag, Trash2 } from "lucide-react";
import CoverImage from "../CoverImage";
import { useCart } from "@/lib/shop/cart-context";
import { cheapestVariation, sortedImages, toNumber, type ApiProduct } from "@/lib/api-types";
import styles from "./ProductRow.module.css";

/** The list-view counterpart of ProductCard: image left, details right. */
export default function ProductRow({ product }: { product: ApiProduct }) {
  const { lines, add, remove } = useCart();

  const image = sortedImages(product.images)[0];
  const variation = cheapestVariation(product.variations);
  const price = variation ? toNumber(variation.price) : undefined;
  const originalPrice = variation ? toNumber(variation.strikeThroughPrice) : undefined;
  const hasDiscount = !!originalPrice && originalPrice > (price ?? 0);
  const discountPercent = hasDiscount
    ? Math.round((1 - (price ?? 0) / (originalPrice as number)) * 100)
    : undefined;
  const stock = product.variations.reduce((sum, v) => sum + v.stock, 0);

  const line = variation
    ? lines.find((l) => l.productId === product.id && l.variationId === variation.id)
    : undefined;
  const inCart = line !== undefined;

  const summary = product.metaDescription ?? "";

  return (
    <article className={styles.row}>
      <Link href={`/product/${product.slug}`} className={styles.imageWrap} aria-label={product.name}>
        <CoverImage src={image?.url} alt={product.name} icon={Package} tone="lavender" rounded="md" />
        {hasDiscount && <span className={styles.badge}>{discountPercent}% OFF</span>}
      </Link>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.category}>{product.category.name}</span>
          {product.tags.slice(0, 2).map((tag) => (
            <span className={styles.tag} key={tag.id}>
              {tag.name}
            </span>
          ))}
        </div>

        <h3 className={styles.name}>
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>

        {summary && <p className={styles.summary}>{summary}</p>}

        <div className={styles.priceRow}>
          {price !== undefined && <span className={styles.price}>₹{price}</span>}
          {hasDiscount && <span className={styles.originalPrice}>₹{originalPrice}</span>}
          <span className={stock === 0 ? styles.outOfStock : styles.stock}>
            {stock === 0
              ? "Out of stock"
              : stock <= 3
                ? `Only ${stock} left`
                : `${product.variations.length} option${product.variations.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={`/product/${product.slug}`} className={styles.view}>
          <Eye size={15} /> View
        </Link>

        <div className={styles.cartActions}>
          <button
            type="button"
            className={inCart ? styles.addDone : styles.add}
            disabled={stock === 0 || !variation}
            onClick={() => variation && add(product, variation)}
          >
            {stock === 0 ? (
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
              className={styles.remove}
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
