"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ChevronLeft, ExternalLink } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import { TableSkeleton } from "@/components/admin/ListStates";
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
          <Link
            href="/myportal/products"
            className={styles.hint}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}
          >
            <ChevronLeft size={13} /> Products
          </Link>
          <h1 className={styles.title}>{product?.name ?? "Edit product"}</h1>
          <p className={styles.subtitle}>
            {product ? `/${product.slug}` : "Loading the product…"}
          </p>
        </div>
        {product && (
          <div className={styles.headerActions}>
            <a
              href={`/product/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className={styles.buttonSecondary}
            >
              <ExternalLink size={14} /> View on storefront
            </a>
          </div>
        )}
      </div>

      {notFound ? (
        <p className={styles.error}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          Product not found. It may have been deleted.
        </p>
      ) : !product ? (
        <div className={styles.card}>
          <TableSkeleton rows={6} />
        </div>
      ) : (
        <ProductForm initialProduct={product} />
      )}
    </div>
  );
}
