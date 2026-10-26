"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { productsApi } from "@/lib/admin/client";
import { cheapestVariation, sortedImages, toNumber, type ApiProduct } from "@/lib/api-types";
import styles from "@/components/admin/admin.module.css";

export default function AdminProductsPage() {
  const { getToken } = useAdminAuth();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const result = await productsApi.list({ limit: 100 });
    setProducts(result.items);
    setLoading(false);
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const token = await getToken();
    if (!token) return;
    await productsApi.remove(token, id);
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>Catalog, pricing, variations and stock.</p>
        </div>
        <Link href="/myportal/products/new" className={styles.button}>
          <Plus size={14} /> New product
        </Link>
      </div>

      <div className={styles.card}>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : products.length === 0 ? (
          <p className={styles.muted}>No products yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const image = sortedImages(product.images)[0];
                  const variation = cheapestVariation(product.variations);
                  return (
                    <tr key={product.id}>
                      <td>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url} alt="" className={styles.thumb} />
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>{product.name}</td>
                      <td>{product.category.name}</td>
                      <td>
                        <span
                          className={
                            product.status === "ACTIVE" ? styles.badgePill : styles.badgePillMuted
                          }
                        >
                          {product.status}
                        </span>
                      </td>
                      <td>{variation ? `₹${toNumber(variation.price)}` : "—"}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/myportal/products/${product.id}`} className={styles.buttonSecondary}>
                            Edit
                          </Link>
                          <button
                            type="button"
                            className={styles.buttonDanger}
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
