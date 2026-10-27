"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Images, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, galleryApi } from "@/lib/admin/client";
import type { ApiGalleryImage } from "@/lib/api-types";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import GalleryDialog from "@/components/admin/dialogs/GalleryDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import { useToast } from "@/components/admin/Toast";
import styles from "@/components/admin/admin.module.css";
import local from "./page.module.css";

export default function AdminGalleryPage() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [images, setImages] = useState<ApiGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState<{ image: ApiGalleryImage | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiGalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setImages(await galleryApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const sorted = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await galleryApi.remove(token, pendingDelete.id);
      toast.success("Image deleted.");
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
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.subtitle}>
            Images for the homepage slider and the “Glimpse into Our World” grid.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.button} onClick={() => setDialog({ image: null })}>
            <Plus size={15} /> Add images
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>All images</span>
          <span className={styles.count}>{images.length} total</span>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Images size={20} />}
            title="No gallery images yet"
            message="Add a few photos of finished pieces — they fill the homepage slider."
            action={
              <button
                type="button"
                className={styles.button}
                onClick={() => setDialog({ image: null })}
              >
                <Plus size={15} /> Add images
              </button>
            }
          />
        ) : (
          <div className={local.grid}>
            {sorted.map((image) => (
              <figure className={local.tile} key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- remote host is dynamic (R2) */}
                <img src={image.url} alt="" />
                <div className={local.tileBar}>
                  <span className={local.tileMeta}>
                    <span className={styles.badgeMuted}>#{image.sortOrder}</span>
                    {image.redirectUrl && (
                      <a
                        href={image.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={local.tileLink}
                        title={image.redirectUrl}
                      >
                        <ExternalLink size={12} /> link
                      </a>
                    )}
                  </span>
                  <span className={local.tileActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setDialog({ image })}
                      aria-label="Edit image"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => setPendingDelete(image)}
                      aria-label="Delete image"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <GalleryDialog
          image={dialog.image}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete gallery image"
        message="This image will be removed from the homepage gallery. This cannot be undone."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
