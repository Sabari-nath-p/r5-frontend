"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, bannersApi, type BannerInput } from "@/lib/admin/client";
import type { ApiBanner } from "@/lib/api-types";
import ImageUploadField from "@/components/admin/ImageUploadField";
import styles from "@/components/admin/admin.module.css";

const emptyForm: BannerInput = {
  title: "",
  subtitle: "",
  image: "",
  ctaText: "",
  ctaLink: "",
  sortOrder: 0,
  isActive: true,
};

export default function AdminBannersPage() {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("banners");

  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<BannerInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoadingList(true);
    setBanners(await bannersApi.list());
    setLoadingList(false);
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function startEdit(banner: ApiBanner) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      image: banner.image,
      ctaText: banner.ctaText ?? "",
      ctaLink: banner.ctaLink ?? "",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
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

    if (!form.image) {
      setError("An image is required.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      if (editingId) {
        await bannersApi.update(token, editingId, form);
      } else {
        await bannersApi.create(token, form);
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
    if (!confirm("Delete this banner?")) return;
    const token = await getToken();
    if (!token) return;
    await bannersApi.remove(token, id);
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Banners</h1>
          <p className={styles.subtitle}>Promotional slides shown on the homepage.</p>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Subtitle</label>
            <textarea
              className={styles.textarea}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>

          <ImageUploadField
            label="Image"
            value={form.image}
            onChange={(url) => setForm({ ...form, image: url })}
            onUpload={onUpload}
          />

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Button text</label>
              <input
                className={styles.input}
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Button link</label>
              <input
                className={styles.input}
                value={form.ctaLink}
                onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                placeholder="/#shop"
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Sort order</label>
              <input
                type="number"
                className={styles.input}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <label className={styles.checkboxRow} style={{ alignSelf: "center", marginTop: 20 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update banner" : "Add banner"}
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
        ) : banners.length === 0 ? (
          <p className={styles.muted}>No banners yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Title</th>
                  <th>Active</th>
                  <th>Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.image} alt="" className={styles.thumb} />
                    </td>
                    <td>{banner.title}</td>
                    <td>
                      <span className={banner.isActive ? styles.badgePill : styles.badgePillMuted}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{banner.sortOrder}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => startEdit(banner)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => handleDelete(banner.id)}
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
