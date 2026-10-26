"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, galleryApi, type GalleryImageInput } from "@/lib/admin/client";
import type { ApiGalleryImage } from "@/lib/api-types";
import ImageUploadField from "@/components/admin/ImageUploadField";
import styles from "@/components/admin/admin.module.css";

function emptyRow(): GalleryImageInput {
  return { url: "", sortOrder: 0, redirectUrl: "" };
}

export default function AdminGalleryPage() {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("gallery");

  const [images, setImages] = useState<ApiGalleryImage[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [rows, setRows] = useState<GalleryImageInput[]>([emptyRow()]);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GalleryImageInput>(emptyRow());
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoadingList(true);
    setImages(await galleryApi.list());
    setLoadingList(false);
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function updateRow(index: number, patch: Partial<GalleryImageInput>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    const valid = rows.filter((r) => r.url.trim().length > 0);
    if (valid.length === 0) {
      setAddError("Add at least one image.");
      return;
    }

    setAdding(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await galleryApi.createMany(
        token,
        valid.map((r) => ({
          url: r.url,
          sortOrder: r.sortOrder,
          redirectUrl: r.redirectUrl || undefined,
        }))
      );
      setRows([emptyRow()]);
      await load();
    } catch (err) {
      setAddError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(image: ApiGalleryImage) {
    setEditingId(image.id);
    setEditForm({
      url: image.url,
      sortOrder: image.sortOrder,
      redirectUrl: image.redirectUrl ?? "",
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyRow());
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    setSavingEdit(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await galleryApi.update(token, editingId, {
        url: editForm.url,
        sortOrder: editForm.sortOrder,
        redirectUrl: editForm.redirectUrl || undefined,
      });
      cancelEdit();
      await load();
    } catch (err) {
      setEditError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this gallery image?")) return;
    const token = await getToken();
    if (!token) return;
    await galleryApi.remove(token, id);
    if (editingId === id) cancelEdit();
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.subtitle}>
            Images for the homepage gallery slider and &quot;Glimpse into Our World&quot; grid.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleAddSubmit}>
          {addError && <p className={styles.error}>{addError}</p>}

          <div className={styles.repeatList}>
            {rows.map((row, i) => (
              <div className={styles.repeatRow} key={i}>
                <div className={styles.repeatFields} style={{ gridTemplateColumns: "1fr" }}>
                  <ImageUploadField
                    value={row.url}
                    onChange={(url) => updateRow(i, { url })}
                    onUpload={onUpload}
                  />
                  <div className={styles.grid2}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Redirect URL (optional)"
                      value={row.redirectUrl ?? ""}
                      onChange={(e) => updateRow(i, { redirectUrl: e.target.value })}
                    />
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Sort order"
                      value={row.sortOrder ?? 0}
                      onChange={(e) => updateRow(i, { sortOrder: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => removeRow(i)}
                    aria-label="Remove row"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus size={14} /> Add another image
            </button>
            <button type="submit" className={styles.button} disabled={adding}>
              {adding ? "Saving…" : "Save images"}
            </button>
          </div>
        </form>
      </div>

      {editingId && (
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleEditSubmit}>
            <p className={styles.label}>Editing image</p>
            {editError && <p className={styles.error}>{editError}</p>}

            <ImageUploadField
              value={editForm.url}
              onChange={(url) => setEditForm({ ...editForm, url })}
              onUpload={onUpload}
            />

            <div className={styles.grid2}>
              <input
                type="text"
                className={styles.input}
                placeholder="Redirect URL (optional)"
                value={editForm.redirectUrl ?? ""}
                onChange={(e) => setEditForm({ ...editForm, redirectUrl: e.target.value })}
              />
              <input
                type="number"
                className={styles.input}
                placeholder="Sort order"
                value={editForm.sortOrder ?? 0}
                onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })}
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Update image"}
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.card}>
        {loadingList ? (
          <p className={styles.muted}>Loading…</p>
        ) : images.length === 0 ? (
          <p className={styles.muted}>No gallery images yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Redirect URL</th>
                  <th>Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {images.map((image) => (
                  <tr key={image.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" className={styles.thumb} />
                    </td>
                    <td>{image.redirectUrl ?? <span className={styles.muted}>—</span>}</td>
                    <td>{image.sortOrder}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => startEdit(image)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => handleDelete(image.id)}
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
