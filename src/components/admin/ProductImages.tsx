"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import styles from "./ProductImages.module.css";

export type GalleryItem = {
  id: string;
  url: string;
  /** Local object URL shown while the file is still uploading. */
  preview?: string;
  uploading?: boolean;
  error?: string;
};

const MAX_PARALLEL_UPLOADS = 3;
const MAX_BYTES = 10 * 1024 * 1024; // the backend rejects anything larger

let counter = 0;
export const newGalleryId = () => `img-${Date.now()}-${counter++}`;

/**
 * Bulk image picker for a product: drop or select many files at once, then drag
 * the thumbnails into order. The first one is the cover, so position is the
 * only ordering control — the caller saves each image's index as its sortOrder.
 */
export default function ProductImages({
  items,
  onChange,
  onUpload,
}: {
  items: GalleryItem[];
  onChange: (updater: (prev: GalleryItem[]) => GalleryItem[]) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const pending = files.map((file) => ({
      file,
      item: {
        id: newGalleryId(),
        url: "",
        preview: URL.createObjectURL(file),
        uploading: file.size <= MAX_BYTES,
        error: file.size > MAX_BYTES ? "Larger than 10 MB" : undefined,
      } as GalleryItem,
    }));
    // All placeholders appear at once, in the order the files were chosen.
    onChange((prev) => [...prev, ...pending.map((p) => p.item)]);

    const queue = pending.filter((p) => p.item.uploading);
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { file, item } = next;
        try {
          const url = await onUpload(file);
          onChange((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, url, uploading: false } : row))
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          onChange((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, uploading: false, error: message } : row
            )
          );
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, queue.length) }, worker));
  }

  function move(from: number, to: number) {
    if (from === to || to < 0) return;
    onChange((prev) => {
      if (to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function remove(id: string) {
    onChange((prev) => {
      const gone = prev.find((row) => row.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((row) => row.id !== id);
    });
  }

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div>
      <div
        className={`${styles.drop} ${fileDragging ? styles.dropActive : ""}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setFileDragging(true);
        }}
        onDragLeave={() => setFileDragging(false)}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setFileDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
      >
        <ImagePlus size={22} />
        <strong>Drop images here or click to browse</strong>
        <span>Select as many as you like · JPG, PNG or WebP · up to 10 MB each</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <>
          <p className={styles.help}>Drag to reorder. The first image is the cover.</p>
          <ul className={styles.grid}>
            {items.map((item, i) => (
              <li
                key={item.id}
                className={[
                  styles.tile,
                  dragId === item.id ? styles.dragging : "",
                  overId === item.id && dragId !== item.id ? styles.over : "",
                  item.error ? styles.failed : "",
                ].join(" ")}
                draggable={!item.uploading}
                onDragStart={(e) => {
                  setDragId(item.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", item.id);
                }}
                onDragOver={(e) => {
                  if (!dragId || hasFiles(e)) return;
                  e.preventDefault();
                  setOverId(item.id);
                }}
                onDrop={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  move(
                    items.findIndex((row) => row.id === dragId),
                    i
                  );
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote image host is dynamic (R2) */}
                <img src={item.url || item.preview} alt={`Product image ${i + 1}`} draggable={false} />
                {i === 0 && !item.error && <span className={styles.cover}>Cover</span>}
                <span className={styles.grip} aria-hidden="true">
                  <GripVertical size={14} />
                </span>

                {item.uploading && (
                  <span className={styles.status}>
                    <Loader2 size={20} className={styles.spin} /> Uploading…
                  </span>
                )}
                {item.error && <span className={styles.status}>{item.error}</span>}

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move image ${i + 1} earlier`}
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === items.length - 1}
                    aria-label={`Move image ${i + 1} later`}
                  >
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
