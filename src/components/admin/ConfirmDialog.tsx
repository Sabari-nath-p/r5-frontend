"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";
import styles from "./admin.module.css";
import modalStyles from "./Modal.module.css";

/**
 * Replaces window.confirm for destructive row actions, so a delete reads the
 * same as the rest of the portal and can name what is being removed.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={tone === "danger" ? styles.buttonDanger : styles.button}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          className={`${modalStyles.confirmIcon} ${
            tone === "danger" ? modalStyles.confirmDanger : modalStyles.confirmNeutral
          }`}
        >
          {tone === "danger" ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
        </div>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--a-ink-2)" }}>{message}</p>
      </div>
    </Modal>
  );
}
