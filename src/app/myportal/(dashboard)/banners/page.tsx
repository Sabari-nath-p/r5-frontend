"use client";

import { useEffect, useMemo, useState } from "react";
import { GalleryVerticalEnd, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, bannersApi } from "@/lib/admin/client";
import type { ApiBanner } from "@/lib/api-types";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import BannerDialog from "@/components/admin/dialogs/BannerDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import { useToast } from "@/components/admin/Toast";
import styles from "@/components/admin/admin.module.css";

export default function AdminBannersPage() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // null = closed; { banner: null } = add; { banner } = edit.
  const [dialog, setDialog] = useState<{ banner: ApiBanner | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiBanner | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setBanners(await bannersApi.list());
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
    const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!needle) return sorted;
    return sorted.filter((banner) =>
      [banner.title, banner.subtitle, banner.ctaText].join(" ").toLowerCase().includes(needle)
    );
  }, [banners, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await bannersApi.remove(token, pendingDelete.id);
      toast.success("Banner deleted.");
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
          <h1 className={styles.title}>Banners</h1>
          <p className={styles.subtitle}>Promotional slides shown in the homepage hero.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.button} onClick={() => setDialog({ banner: null })}>
            <Plus size={15} /> New banner
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} />
            <input
              className={styles.input}
              placeholder="Search banners"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className={styles.toolbarSpacer} />
          <span className={styles.count}>
            {visible.length} of {banners.length}
          </span>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : banners.length === 0 ? (
          <EmptyState
            icon={<GalleryVerticalEnd size={20} />}
            title="No banners yet"
            message="Banners are the rotating slides at the top of the homepage."
            action={
              <button
                type="button"
                className={styles.button}
                onClick={() => setDialog({ banner: null })}
              >
                <Plus size={15} /> New banner
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No matches" message={`Nothing matches “${query}”.`} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Image</th>
                  <th>Title</th>
                  <th>Button</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {visible.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote host is dynamic (R2) */}
                      <img src={banner.image} alt="" className={styles.thumb} />
                    </td>
                    <td>
                      <div className={styles.cellStrong}>{banner.title}</div>
                      {banner.subtitle && <div className={styles.cellSub}>{banner.subtitle}</div>}
                    </td>
                    <td>
                      {banner.ctaText ? (
                        <>
                          <div>{banner.ctaText}</div>
                          <div className={styles.cellSub}>{banner.ctaLink}</div>
                        </>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={banner.isActive ? styles.badgeGood : styles.badgeMuted}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.num}>{banner.sortOrder}</td>
                    <td className={styles.colActions}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => setDialog({ banner })}
                          aria-label={`Edit ${banner.title}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => setPendingDelete(banner)}
                          aria-label={`Delete ${banner.title}`}
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
        <BannerDialog
          banner={dialog.banner}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete banner"
        message={
          <>
            <strong>{pendingDelete?.title}</strong> will be removed from the homepage. This cannot
            be undone.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
