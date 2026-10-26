"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, categoriesApi, type CategoryInput } from "@/lib/admin/client";
import type { ApiCategory, ApiStatus } from "@/lib/api-types";
import ImageUploadField from "@/components/admin/ImageUploadField";
import styles from "@/components/admin/admin.module.css";

const emptyForm: CategoryInput = {
  name: "",
  description: "",
  image: "",
  sortOrder: 0,
  status: "ACTIVE",
};

export default function AdminCategoriesPage() {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("categories");

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoadingList(true);
    setCategories(await categoriesApi.list());
    setLoadingList(false);
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function startEdit(category: ApiCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
      sortOrder: category.sortOrder,
      status: category.status,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      if (editingId) {
        await categoriesApi.update(token, editingId, form);
      } else {
        await categoriesApi.create(token, form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products in it are not deleted.")) return;
    const token = await getToken();
    if (!token) return;
    await categoriesApi.remove(token, id);
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>Shop-by-category tiles shown on the homepage.</p>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ApiStatus })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <ImageUploadField
            label="Image"
            value={form.image ?? ""}
            onChange={(url) => setForm({ ...form, image: url })}
            onUpload={onUpload}
          />

          <div className={styles.field} style={{ maxWidth: 160 }}>
            <label className={styles.label}>Sort order</label>
            <input
              type="number"
              className={styles.input}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update category" : "Add category"}
            </button>
            {editingId && (
              <button type="button" className={styles.buttonSecondary} onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.card}>
        {loadingList ? (
          <p className={styles.muted}>Loading…</p>
        ) : categories.length === 0 ? (
          <p className={styles.muted}>No categories yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {category.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={category.image} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{category.name}</td>
                    <td>
                      <span
                        className={
                          category.status === "ACTIVE" ? styles.badgePill : styles.badgePillMuted
                        }
                      >
                        {category.status}
                      </span>
                    </td>
                    <td>{category.sortOrder}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => startEdit(category)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => handleDelete(category.id)}
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
    </div>
  );
}
