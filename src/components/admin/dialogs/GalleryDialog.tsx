"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import { ApiError, galleryApi, type GalleryImageInput } from "@/lib/admin/client";
import type { ApiGalleryImage } from "@/lib/api-types";
import FormDialog from "../FormDialog";
import ImageUploadField from "../ImageUploadField";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

function emptyRow(): GalleryImageInput {
  return { url: "", sortOrder: 0, redirectUrl: "" };
}

/**
 * Adding supports several images in one go (the API takes a batch); editing
 * works on a single image, so the repeat controls are hidden in that mode.
 */
export default function GalleryDialog({
  image,
  onClose,
  onSaved,
}: {
  image: ApiGalleryImage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("gallery");
  const toast = useToast();

  const [rows, setRows] = useState<GalleryImageInput[]>([
    image
      ? { url: image.url, sortOrder: image.sortOrder, redirectUrl: image.redirectUrl ?? "" }
      : emptyRow(),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<GalleryImageInput>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const valid = rows.filter((row) => row.url.trim().length > 0);
    if (valid.length === 0) {
      setError("Add at least one image.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      if (image) {
        const [row] = valid;
        await galleryApi.update(token, image.id, {
          url: row.url,
          sortOrder: row.sortOrder,
          redirectUrl: row.redirectUrl || undefined,
        });
        toast.success("Image updated.");
      } else {
        await galleryApi.createMany(
          token,
          valid.map((row) => ({
            url: row.url,
            sortOrder: row.sortOrder,
            redirectUrl: row.redirectUrl || undefined,
          }))
        );
        toast.success(valid.length === 1 ? "Image added." : `${valid.length} images added.`);
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
      title={image ? "Edit gallery image" : "Add gallery images"}
      description="Images for the homepage slider and the “Glimpse into Our World” grid."
      size="lg"
      submitLabel={image ? "Save changes" : "Add images"}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className={styles.repeatList}>
        {rows.map((row, i) => (
          <div className={styles.repeatRow} key={i}>
            {!image && rows.length > 1 && <span className={styles.repeatIndex}>{i + 1}</span>}
            <div className={styles.repeatFields} style={{ gridTemplateColumns: "1fr" }}>
              <ImageUploadField
                value={row.url}
                onChange={(url) => updateRow(i, { url })}
                onUpload={onUpload}
              />
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Redirect URL</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Optional — e.g. /product/tulip-bouquet"
                    value={row.redirectUrl ?? ""}
                    onChange={(e) => updateRow(i, { redirectUrl: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sort order</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={row.sortOrder ?? 0}
                    onChange={(e) => updateRow(i, { sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            {!image && rows.length > 1 && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove image ${i + 1}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!image && (
        <button
          type="button"
          className={styles.buttonSecondary}
          style={{ alignSelf: "flex-start" }}
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
        >
          <Plus size={14} /> Add another image
        </button>
      )}
    </FormDialog>
  );
}
