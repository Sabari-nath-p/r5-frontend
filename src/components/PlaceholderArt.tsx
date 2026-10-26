import type { LucideIcon } from "lucide-react";
import styles from "./PlaceholderArt.module.css";

type Tone = "lavender" | "gold" | "blush" | "purple" | "cream";
type Rounded = "sm" | "md" | "lg" | "full";

interface PlaceholderArtProps {
  icon: LucideIcon;
  tone?: Tone;
  rounded?: Rounded;
  decorative?: boolean;
  className?: string;
}

export default function PlaceholderArt({
  icon: Icon,
  tone = "lavender",
  rounded = "lg",
  decorative = true,
  className,
}: PlaceholderArtProps) {
  return (
    <div
      className={[styles.art, styles[tone], styles[rounded], className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.blobA} aria-hidden="true" />
      <span className={styles.blobB} aria-hidden="true" />
      <Icon className={styles.icon} strokeWidth={1.1} aria-hidden="true" />
      {decorative && (
        <>
          <span className={`${styles.dot} ${styles.dot1}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dot2}`} aria-hidden="true" />
        </>
      )}
    </div>
  );
}
