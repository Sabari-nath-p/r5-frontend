"use client";

import { useState } from "react";
import styles from "./charts.module.css";

export type BarPoint = { key: string; label: string; fullLabel: string; value: number };

/**
 * Single-series column chart: daily magnitude over a short window. Bars are
 * anchored to the baseline with 4px rounded tops and a 2px surface gap; the
 * peak is labelled directly and every other value is in the hover tooltip,
 * with a screen-reader table carrying the full series.
 */
export default function BarChart({
  data,
  formatValue,
  valueLabel,
  tickCount = 3,
}: {
  data: BarPoint[];
  formatValue: (value: number) => string;
  valueLabel: string;
  tickCount?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const max = Math.max(...data.map((point) => point.value), 0);
  const peakKey = max > 0 ? data.find((point) => point.value === max)?.key : undefined;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    max === 0 ? 0 : (max / (tickCount - 1)) * (tickCount - 1 - i)
  );

  return (
    <>
      <div className={styles.chart}>
        <div className={styles.axis} aria-hidden="true">
          {ticks.map((tick, i) => (
            <span key={i}>{max === 0 && i < tickCount - 1 ? "" : formatValue(tick)}</span>
          ))}
        </div>

        <div className={styles.plot}>
          <div className={styles.grid} aria-hidden="true">
            {ticks.map((_, i) => (
              <span key={i} className={styles.gridLine} />
            ))}
          </div>

          <div className={styles.bars}>
            {data.map((point) => {
              const height = max === 0 ? 0 : (point.value / max) * 100;
              return (
                <div
                  key={point.key}
                  className={styles.barSlot}
                  onMouseEnter={() => setHover(point.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === point.key && (
                    <div className={styles.tooltip}>
                      <strong>{formatValue(point.value)}</strong>
                      <span>
                        {point.fullLabel} · {valueLabel}
                      </span>
                    </div>
                  )}
                  {point.key === peakKey && hover !== point.key && (
                    <span className={styles.peak}>{formatValue(point.value)}</span>
                  )}
                  <div
                    className={`${styles.bar} ${point.value === 0 ? styles.barZero : ""}`}
                    style={{ height: `${Math.max(height, point.value > 0 ? 1.5 : 0.6)}%` }}
                  />
                  <span className={styles.barLabel}>{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <table className={styles.srOnly}>
        <caption>{valueLabel}</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.fullLabel}</th>
              <td>{formatValue(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
