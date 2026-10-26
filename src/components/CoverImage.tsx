import type { LucideIcon } from "lucide-react";
import PlaceholderArt from "./PlaceholderArt";
import styles from "./CoverImage.module.css";

type Tone = "lavender" | "gold" | "blush" | "cream";
type Rounded = "sm" | "md" | "lg" | "full";

export default function CoverImage({
  src,
  alt,
  icon,
  tone = "lavender",
  rounded = "md",
}: {
  src?: string | null;
  alt: string;
  icon: LucideIcon;
  tone?: Tone;
  rounded?: Rounded;
}) {
  if (!src) {
    return <PlaceholderArt icon={icon} tone={tone} rounded={rounded} decorative={false} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- remote image host is dynamic (R2), not known at build time
  return <img src={src} alt={alt} className={`${styles.img} ${styles[rounded]}`} loading="lazy" />;
}
