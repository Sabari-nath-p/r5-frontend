import ProductForm from "@/components/admin/ProductForm";
import styles from "@/components/admin/admin.module.css";

export default function NewProductPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>New product</h1>
          <p className={styles.subtitle}>Add a product to the catalog.</p>
        </div>
      </div>
      <ProductForm />
    </div>
  );
}
