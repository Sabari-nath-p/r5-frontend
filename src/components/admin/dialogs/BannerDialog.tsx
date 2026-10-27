"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, bannersApi, type BannerInput } from "@/lib/admin/client";
import type { ApiBanner } from "@/lib/api-types";
import FormDialog from "../FormDialog";
import ImageUploadField from "../ImageUploadField";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

/**
 * Create/edit banner form. Mounted by the list page only while open, so each
 * open starts from the record it was given.
 */
export default function BannerDialog({
  banner,
  onClose,
  onSaved,
}: {
  banner: ApiBanner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("banners");
  const toast = useToast();

  const [form, setForm] = useState<BannerInput>({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    image: banner?.image ?? "",
    ctaText: banner?.ctaText ?? "",
    ctaLink: banner?.ctaLink ?? "",
    sortOrder: banner?.sortOrder ?? 0,
    isActive: banner?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (banner) {
        await bannersApi.update(token, banner.id, form);
        toast.success("Banner updated.");
      } else {
        await bannersApi.create(token, form);
        toast.success("Banner added.");
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
      title={banner ? "Edit banner" : "New banner"}
      description="Promotional slides shown in the homepage hero."
      size="lg"
      submitLabel={banner ? "Save changes" : "Add banner"}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input
          className={styles.input}
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Handmade with love"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Subtitle</label>
        <textarea
          className={styles.textarea}
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="One line of supporting copy."
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
          <span className={styles.hint}>Lower numbers show first.</span>
        </div>

        <label className={styles.switchRow}>
          <span className={styles.switchText}>
            <strong>Active</strong>
            <span>Hidden from the homepage when off.</span>
          </span>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            style={{ width: 17, height: 17, accentColor: "var(--a-brand)" }}
          />
        </label>
      </div>
    </FormDialog>
  );
}
