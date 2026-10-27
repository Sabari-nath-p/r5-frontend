"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "./Modal";
import styles from "./admin.module.css";

/**
 * A Modal whose body is a form and whose footer holds the submit/cancel pair.
 * The footer sits outside the <form> element, so the submit button is wired
 * back to it with the `form` attribute — that keeps Enter-to-submit working.
 */
export default function FormDialog({
  open,
  title,
  description,
  size = "md",
  submitLabel,
  savingLabel = "Saving…",
  saving = false,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  submitLabel: string;
  savingLabel?: string;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const formId = useId();

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size={size}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" form={formId} className={styles.button} disabled={saving}>
            {saving ? savingLabel : submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={onSubmit}>
        {error && (
          <p className={styles.error}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </p>
        )}
        {children}
      </form>
    </Modal>
  );
}
