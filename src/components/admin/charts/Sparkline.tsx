"use client";

import styles from "./charts.module.css";

/**
 * Trend shape inside a stat tile — the tile's number carries the value, so the
 * line has no axes or labels of its own.
 */
export default function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);

  const points = values
    .map((value, i) => `${i * step},${28 - ((value - min) / span) * 26}`)
    .join(" ");

  return (
    <svg
      className={styles.spark}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--a-series)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
