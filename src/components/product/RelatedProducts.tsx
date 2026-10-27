import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "../ProductCard";
import type { ApiProduct } from "@/lib/api";
import styles from "./RelatedProducts.module.css";

export default function RelatedProducts({ products }: { products: ApiProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={`display ${styles.heading}`}>
          You May <span>Also Like</span>
        </h2>
        <Link href="/shop" className={styles.link}>
          View All <ArrowRight size={15} />
        </Link>
      </div>

      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
