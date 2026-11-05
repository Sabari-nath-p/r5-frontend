import Link from "next/link";
import { Baby, Flower2, Gift, KeyRound, Package, Rabbit, Sofa, type LucideIcon } from "lucide-react";
import CoverImage from "../CoverImage";
import type { ApiCategory } from "@/lib/api-types";
import styles from "./Hero.module.css";

const TONES = ["lavender", "gold", "blush", "cream"] as const;

/* Left column, then right; x and y are percent of the stage. */
const SPOTS = [
  { x: 9, y: 42, side: -1, depth: 34, delay: 0 },
  { x: 19, y: 63, side: -1, depth: 20, delay: 1.1 },
  { x: 8, y: 83, side: -1, depth: 28, delay: 2.2 },
  { x: 91, y: 42, side: 1, depth: 30, delay: 0.6 },
  { x: 81, y: 63, side: 1, depth: 22, delay: 1.7 },
  { x: 92, y: 83, side: 1, depth: 34, delay: 2.8 },
];

/* Only shown while the catalog has no categories, so the hero is never bare. */
const PLACEHOLDERS: { name: string; icon: LucideIcon }[] = [
  { name: "Soft Toys", icon: Rabbit },
  { name: "Bouquets", icon: Flower2 },
  { name: "Keychains", icon: KeyRound },
  { name: "Gift Sets", icon: Gift },
  { name: "Home Decor", icon: Sofa },
  { name: "Baby Gifts", icon: Baby },
];

export default function HeroBubbles({ categories }: { categories: ApiCategory[] }) {
  const items =
    categories.length > 0
      ? categories.slice(0, SPOTS.length).map((category, i) => ({
          key: category.id,
          name: category.name,
          href: `/category/${category.id}`,
          art: (
            <CoverImage src={category.image} alt="" icon={Package} tone={TONES[i % TONES.length]} rounded="md" />
          ),
        }))
      : PLACEHOLDERS.map(({ name, icon: Icon }) => ({
          key: name,
          name,
          href: `/shop?q=${encodeURIComponent(name)}`,
          art: <Icon className={styles.bubbleIcon} strokeWidth={1.5} aria-hidden="true" />,
        }));

  return (
    <nav className={styles.bubbles} aria-label="Shop by category">
      {items.map((item, i) => {
        const spot = SPOTS[i];
        return (
          <Link
            key={item.key}
            href={item.href}
            className={styles.bubble}
            data-side={spot.side < 0 ? "left" : "right"}
            style={
              {
                "--x": `${spot.x}%`,
                "--y": `${spot.y}%`,
                "--side": spot.side,
                "--depth": spot.depth,
                "--delay": `${spot.delay}s`,
              } as React.CSSProperties
            }
          >
            <span className={styles.bubbleFloat}>
              <span className={styles.bubbleBall}>{item.art}</span>
              <span className={styles.bubbleLabel}>{item.name}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
