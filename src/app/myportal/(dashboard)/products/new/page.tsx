import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import styles from "@/components/admin/admin.module.css";

export default function NewProductPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/myportal/products" className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <ChevronLeft size={13} /> Products
          </Link>
          <h1 className={styles.title}>New product</h1>
          <p className={styles.subtitle}>Add a product with its images, variations and stock.</p>
        </div>
      </div>
      <ProductForm />
    </div>
  );
}
