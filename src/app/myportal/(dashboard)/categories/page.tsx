"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, Pencil, Plus, Search, Shapes, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, categoriesApi } from "@/lib/admin/client";
import type { ApiCategory } from "@/lib/api-types";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import CategoryDialog from "@/components/admin/dialogs/CategoryDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import { useToast } from "@/components/admin/Toast";
import styles from "@/components/admin/admin.module.css";

export default function AdminCategoriesPage() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialog, setDialog] = useState<{ category: ApiCategory | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCategories(await categoriesApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((category) => !statusFilter || category.status === statusFilter)
      .filter(
        (category) =>
          !needle ||
          [category.name, category.description].join(" ").toLowerCase().includes(needle)
      );
  }, [categories, query, statusFilter]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await categoriesApi.remove(token, pendingDelete.id);
      toast.success("Category deleted.");
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
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>Shop-by-category tiles shown on the homepage.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => setDialog({ category: null })}
          >
            <Plus size={15} /> New category
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} />
            <input
              className={styles.input}
              placeholder="Search categories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className={styles.toolbarSpacer} />
          <span className={styles.count}>
            {visible.length} of {categories.length}
          </span>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<Shapes size={20} />}
            title="No categories yet"
            message="Every product belongs to a category, so start here."
            action={
              <button
                type="button"
                className={styles.button}
                onClick={() => setDialog({ category: null })}
              >
                <Plus size={15} /> New category
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No matches" message="Try a different search or status." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Image</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {visible.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {category.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote host is dynamic (R2)
                        <img src={category.image} alt="" className={styles.thumb} />
                      ) : (
                        <span className={`${styles.thumb} ${styles.thumbEmpty}`}>
                          <ImageOff size={15} />
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.cellStrong}>{category.name}</div>
                      {category.description && (
                        <div className={styles.cellSub}>{category.description}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          category.status === "ACTIVE" ? styles.badgeGood : styles.badgeMuted
                        }
                      >
                        {category.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.num}>{category.sortOrder}</td>
                    <td className={styles.colActions}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => setDialog({ category })}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => setPendingDelete(category)}
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <CategoryDialog
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete category"
        message={
          <>
            <strong>{pendingDelete?.name}</strong> will be deleted. Products inside it are kept,
            but they will no longer have a category tile.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
