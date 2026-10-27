"use client";

import { Inbox } from "lucide-react";
import styles from "./admin.module.css";

/** Shown in place of a table when a list is empty or a filter matched nothing. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon ?? <Inbox size={20} />}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

/** Placeholder bars while a list loads, so the page doesn't jump on arrival. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.skeletonRows}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.skeleton} style={{ width: `${100 - i * 7}%` }} />
      ))}
    </div>
  );
}
