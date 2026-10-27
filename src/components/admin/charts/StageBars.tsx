"use client";

import styles from "./charts.module.css";

export type Stage = { key: string; label: string; value: number };

/** Counts per pipeline stage: one hue, every bar directly labelled. */
export default function StageBars({ stages }: { stages: Stage[] }) {
  const max = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className={styles.stages}>
      {stages.map((stage) => (
        <div className={styles.stage} key={stage.key}>
          <span className={styles.stageLabel}>{stage.label}</span>
          <span className={styles.stageTrack}>
            <span
              className={styles.stageFill}
              style={{ width: `${stage.value === 0 ? 0 : (stage.value / max) * 100}%` }}
            />
          </span>
          <span className={styles.stageValue}>{stage.value}</span>
        </div>
      ))}
    </div>
  );
}
