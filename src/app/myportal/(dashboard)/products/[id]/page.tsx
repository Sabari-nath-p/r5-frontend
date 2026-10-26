"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { productsApi } from "@/lib/admin/client";
import type { ApiProduct } from "@/lib/api-types";
import styles from "@/components/admin/admin.module.css";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    productsApi
      .get(params.id)
      .then(setProduct)
      .catch(() => setNotFound(true));
  }, [params.id]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Edit product</h1>
          <p className={styles.subtitle}>{product?.name ?? " "}</p>
        </div>
      </div>

      {notFound ? (
        <p className={styles.error}>Product not found.</p>
      ) : !product ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <ProductForm initialProduct={product} />
      )}
    </div>
  );
}
