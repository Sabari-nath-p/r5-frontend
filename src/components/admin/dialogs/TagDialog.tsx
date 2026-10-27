"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, tagsApi } from "@/lib/admin/client";
import FormDialog from "../FormDialog";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

/** Tags have no update endpoint, so this dialog only creates. */
export default function TagDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      await tagsApi.create(token, name.trim());
      toast.success("Tag added.");
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
      title="New tag"
      description="Labels used to filter products and badge them on the storefront."
      size="sm"
      submitLabel="Add tag"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <label className={styles.label}>Tag name</label>
        <input
          className={styles.input}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Best Seller"
        />
        <span className={styles.hint}>Shown exactly as typed.</span>
      </div>
    </FormDialog>
  );
}
