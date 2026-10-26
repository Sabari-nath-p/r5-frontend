import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import CoverImage from "./CoverImage";
import { cheapestVariation, sortedImages, toNumber, type ApiProduct } from "@/lib/api-types";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product }: { product: ApiProduct }) {
  const image = sortedImages(product.images)[0];
  const variation = cheapestVariation(product.variations);
  const price = variation ? toNumber(variation.price) : undefined;
  const originalPrice = variation ? toNumber(variation.strikeThroughPrice) : undefined;
  const hasDiscount = !!originalPrice && originalPrice > (price ?? 0);
  const discountPercent = hasDiscount
    ? Math.round((1 - (price ?? 0) / (originalPrice as number)) * 100)
    : undefined;
  const inStock = (variation?.stock ?? 0) > 0;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          <CoverImage src={image?.url} alt={product.name} icon={Package} tone="lavender" rounded="md" />
        </Link>
      </div>

      <p className={styles.category}>{product.category.name}</p>

      <h3 className={styles.name}>
        <Link href={`/product/${product.slug}`}>{product.name}</Link>
      </h3>

      <div className={styles.priceRow}>
        {price !== undefined && <span className={styles.price}>₹{price}</span>}
        {hasDiscount && (
          <>
            <span className={styles.originalPrice}>₹{originalPrice}</span>
            <span className={styles.discount}>{discountPercent}% OFF</span>
          </>
        )}
      </div>

      <button type="button" className={styles.addBtn} disabled={!inStock}>
        <ShoppingBag size={16} />
        {inStock ? "Add to Cart" : "Out of Stock"}
      </button>
    </article>
  );
}
