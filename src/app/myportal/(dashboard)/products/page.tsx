"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Package, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, categoriesApi, productsApi } from "@/lib/admin/client";
import {
  cheapestVariation,
  sortedImages,
  toNumber,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/api-types";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import { useToast } from "@/components/admin/Toast";
import styles from "@/components/admin/admin.module.css";

const LOW_STOCK = 3;

function totalStock(product: ApiProduct) {
  return product.variations.reduce((sum, variation) => sum + variation.stock, 0);
}

export default function AdminProductsPage() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<ApiProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await productsApi.list({ limit: 200 });
      setProducts(result.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    categoriesApi.list().then(setCategories);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => !categoryFilter || product.categoryId === categoryFilter)
      .filter((product) => !statusFilter || product.status === statusFilter)
      .filter((product) =>
        featuredFilter === "" ? true : product.isFeatured === (featuredFilter === "yes")
      )
      .filter(
        (product) =>
          !needle ||
          [product.name, product.slug, product.category.name]
            .join(" ")
            .toLowerCase()
            .includes(needle)
      );
  }, [products, query, categoryFilter, statusFilter, featuredFilter]);

  /** Flip the homepage "featured" flag straight from the row. */
  async function toggleFeatured(product: ApiProduct) {
    setTogglingId(product.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const updated = await productsApi.update(token, product.id, {
        isFeatured: !product.isFeatured,
      });
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? updated : item))
      );
      toast.success(
        updated.isFeatured
          ? `${updated.name} is now featured.`
          : `${updated.name} is no longer featured.`
      );
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await productsApi.remove(token, pendingDelete.id);
      toast.success("Product deleted.");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>Catalog, pricing, variations and stock.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/myportal/products/new" className={styles.button}>
            <Plus size={15} /> New product
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} />
            <input
              className={styles.input}
              placeholder="Search by name or slug"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            style={{ width: 180 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            className={styles.select}
            style={{ width: 160 }}
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
          >
            <option value="">All products</option>
            <option value="yes">Featured only</option>
            <option value="no">Not featured</option>
          </select>
          <span className={styles.toolbarSpacer} />
          <span className={styles.count}>
            {visible.length} of {products.length}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={20} />}
            title="No products yet"
            message="Add your first product with its images, variations and stock."
            action={
              <Link href="/myportal/products/new" className={styles.button}>
                <Plus size={15} /> New product
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No matches" message="Try a different search or filter." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>From</th>
                  <th>Stock</th>
                  <th>Variations</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const image = sortedImages(product.images)[0];
                  const variation = cheapestVariation(product.variations);
                  const stock = totalStock(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote host is dynamic (R2)
                          <img src={image.url} alt="" className={styles.thumb} />
                        ) : (
                          <span className={`${styles.thumb} ${styles.thumbEmpty}`}>
                            <ImageOff size={15} />
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.cellStrong}>{product.name}</div>
                        <div className={styles.cellSub}>/{product.slug}</div>
                      </td>
                      <td>{product.category.name}</td>
                      <td>
                        <span
                          className={
                            product.status === "ACTIVE"
                              ? styles.badgeGood
                              : product.status === "DRAFT"
                                ? styles.badgeWarn
                                : styles.badgeMuted
                          }
                        >
                          {product.status === "ACTIVE"
                            ? "Active"
                            : product.status === "DRAFT"
                              ? "Draft"
                              : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={
                            product.isFeatured
                              ? `${styles.iconButton} ${styles.iconButtonActive}`
                              : styles.iconButton
                          }
                          onClick={() => toggleFeatured(product)}
                          disabled={togglingId === product.id}
                          aria-pressed={product.isFeatured}
                          title={
                            product.isFeatured
                              ? "Featured on the homepage — click to remove"
                              : "Feature on the homepage"
                          }
                        >
                          <Star size={14} fill={product.isFeatured ? "currentColor" : "none"} />
                        </button>
                      </td>
                      <td className={styles.num}>
                        {variation ? `₹${toNumber(variation.price).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className={styles.num}>
                        {stock === 0 ? (
                          <span className={styles.badgeCrit}>Out of stock</span>
                        ) : stock <= LOW_STOCK ? (
                          <span className={styles.badgeWarn}>{stock} left</span>
                        ) : (
                          stock
                        )}
                      </td>
                      <td className={styles.num}>{product.variations.length}</td>
                      <td className={styles.colActions}>
                        <div className={styles.rowActions}>
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.iconButton}
                            aria-label={`View ${product.name} on the storefront`}
                          >
                            <ExternalLink size={14} />
                          </a>
                          <Link
                            href={`/myportal/products/${product.id}`}
                            className={styles.iconButton}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            type="button"
                            className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                            onClick={() => setPendingDelete(product)}
                            aria-label={`Delete ${product.name}`}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product"
        message={
          <>
            <strong>{pendingDelete?.name}</strong> and all of its variations will be deleted. This
            cannot be undone.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
