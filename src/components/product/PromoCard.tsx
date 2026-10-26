import PlaceholderArt from "../PlaceholderArt";
import { iconRegistry, type IconKey } from "@/lib/icon-registry";
import styles from "./PromoCard.module.css";

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M32 50C14 38 4 27 4 16.5 4 8.5 10.5 3 18 3c6 0 10 3.5 14 9 4-5.5 8-9 14-9 7.5 0 14 5.5 14 13.5 0 2.4-.6 4.7-1.7 7" />
    </svg>
  );
}

export default function PromoCard({ icon }: { icon: IconKey }) {
  const Icon = iconRegistry[icon];
  return (
    <div className={styles.card}>
      <PlaceholderArt icon={Icon} tone="blush" rounded="lg" decorative={false} />
      <span className={styles.blob} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={`display ${styles.text}`}>
          A Little
          <br />
          Handmade
          <br />
          Happiness
        </p>
        <HeartDoodle className={styles.heart} />
      </div>
    </div>
  );
}
