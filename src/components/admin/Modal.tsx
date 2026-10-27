"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

type Size = "sm" | "md" | "lg" | "xl";

/**
 * The one dialog used across the portal: every create/edit form and every
 * confirmation opens in here, so lists stay lists. Closes on Escape and on a
 * backdrop click, locks body scroll, and moves focus inside on open.
 */
export default function Modal({
  open,
  title,
  description,
  size = "md",
  onClose,
  children,
  footer,
  footerNote,
}: {
  open: boolean;
  title: string;
  description?: string;
  size?: Size;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerNote?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Pull focus into the dialog so the keyboard lands inside, not behind it.
    // The body is searched before the header, so a form dialog opens with the
    // first field focused rather than its close button.
    const selector = "input:not([type=hidden]), select, textarea, button";
    const focusable =
      bodyRef.current?.querySelector<HTMLElement>(selector) ??
      dialogRef.current?.querySelector<HTMLElement>(selector);
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title} id={titleId}>
              {title}
            </h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className={styles.body} ref={bodyRef}>
          {children}
        </div>

        {footer && (
          <div className={styles.footer}>
            {footerNote && <span className={styles.footerLeft}>{footerNote}</span>}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
