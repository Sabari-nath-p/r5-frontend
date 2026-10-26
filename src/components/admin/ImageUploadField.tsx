"use client";

import { useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";
import styles from "./admin.module.css";

export default function ImageUploadField({
  value,
  onChange,
  onUpload,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.imageField}>
        <div className={styles.imagePreviewBox}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote image host is dynamic (R2)
            <img src={value} alt="" />
          ) : (
            <ImageIcon size={20} />
          )}
        </div>
        <div className={styles.imageFieldInputs}>
          <input
            type="text"
            className={styles.input}
            placeholder="Image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <label className={styles.fileLabel}>
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          </label>
          {error && <span className={styles.error}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
