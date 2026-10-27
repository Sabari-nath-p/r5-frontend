"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, categoriesApi, type CategoryInput } from "@/lib/admin/client";
import type { ApiCategory, ApiStatus } from "@/lib/api-types";
import FormDialog from "../FormDialog";
import ImageUploadField from "../ImageUploadField";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

export default function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: ApiCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("categories");
  const toast = useToast();

  const [form, setForm] = useState<CategoryInput>({
    name: category?.name ?? "",
    description: category?.description ?? "",
    image: category?.image ?? "",
    sortOrder: category?.sortOrder ?? 0,
    status: category?.status ?? "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      if (category) {
        await categoriesApi.update(token, category.id, form);
        toast.success("Category updated.");
      } else {
        await categoriesApi.create(token, form);
        toast.success("Category added.");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialog
      open
      title={category ? "Edit category" : "New category"}
      description="Shop-by-category tiles on the homepage."
      size="lg"
      submitLabel={category ? "Save changes" : "Add category"}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Crochet bouquets"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            className={styles.select}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ApiStatus })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Shown under the category name."
        />
      </div>

      <ImageUploadField
        label="Image"
        value={form.image ?? ""}
        onChange={(url) => setForm({ ...form, image: url })}
        onUpload={onUpload}
      />

      <div className={styles.field} style={{ maxWidth: 180 }}>
        <label className={styles.label}>Sort order</label>
        <input
          type="number"
          className={styles.input}
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
        />
        <span className={styles.hint}>Lower numbers show first.</span>
      </div>
    </FormDialog>
  );
}
