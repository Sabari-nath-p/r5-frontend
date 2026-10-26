"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, tagsApi } from "@/lib/admin/client";
import type { ApiTag } from "@/lib/api-types";
import styles from "@/components/admin/admin.module.css";

export default function AdminTagsPage() {
  const { getToken } = useAdminAuth();

  const [tags, setTags] = useState<ApiTag[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoadingList(true);
    setTags(await tagsApi.list());
    setLoadingList(false);
  }

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await tagsApi.create(token, name.trim());
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag?")) return;
    const token = await getToken();
    if (!token) return;
    await tagsApi.remove(token, id);
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Tags</h1>
          <p className={styles.subtitle}>Labels used to filter and badge products.</p>
        </div>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>Tag name</label>
              <input
                className={styles.input}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Best Seller"
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? "Adding…" : "Add tag"}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.card}>
        {loadingList ? (
          <p className={styles.muted}>Loading…</p>
        ) : tags.length === 0 ? (
          <p className={styles.muted}>No tags yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    <td>{tag.name}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => handleDelete(tag.id)}
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
