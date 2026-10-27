"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Tags, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, tagsApi } from "@/lib/admin/client";
import type { ApiTag } from "@/lib/api-types";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import TagDialog from "@/components/admin/dialogs/TagDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import { useToast } from "@/components/admin/Toast";
import styles from "@/components/admin/admin.module.css";

export default function AdminTagsPage() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [tags, setTags] = useState<ApiTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTags(await tagsApi.list());
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
    return [...tags]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((tag) => !needle || tag.name.toLowerCase().includes(needle));
  }, [tags, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await tagsApi.remove(token, pendingDelete.id);
      toast.success("Tag deleted.");
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
          <h1 className={styles.title}>Tags</h1>
          <p className={styles.subtitle}>Labels used to filter and badge products.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.button} onClick={() => setAdding(true)}>
            <Plus size={15} /> New tag
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} />
            <input
              className={styles.input}
              placeholder="Search tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className={styles.toolbarSpacer} />
          <span className={styles.count}>
            {visible.length} of {tags.length}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : tags.length === 0 ? (
          <EmptyState
            icon={<Tags size={20} />}
            title="No tags yet"
            message="Tags appear as filters on the shop and as badges on product cards."
            action={
              <button type="button" className={styles.button} onClick={() => setAdding(true)}>
                <Plus size={15} /> New tag
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
                  <th>Name</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {visible.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <span className={styles.badge}>{tag.name}</span>
                    </td>
                    <td className={styles.colActions}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => setPendingDelete(tag)}
                          aria-label={`Delete ${tag.name}`}
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

      {adding && (
        <TagDialog
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete tag"
        message={
          <>
            <strong>{pendingDelete?.name}</strong> will be removed from every product that uses it.
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
