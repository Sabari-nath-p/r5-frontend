"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import styles from "./Toast.module.css";

type ToastTone = "success" | "error";
type Toast = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

/** Save/delete feedback for actions that happen inside a dialog that then closes. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${
              toast.tone === "success" ? styles.success : styles.error
            }`}
          >
            {toast.tone === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  return {
    success: (message: string) => push?.("success", message),
    error: (message: string) => push?.("error", message),
  };
}
