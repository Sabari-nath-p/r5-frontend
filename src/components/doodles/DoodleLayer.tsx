import { doodleShapes, type DoodleName } from "./CrochetDoodles";
import styles from "./DoodleLayer.module.css";

/**
 * A decorative, non-interactive layer of crochet doodles behind a section.
 *
 * Arrangements are deliberate rather than random: pieces sit in the outer
 * margins and corners of each section so they never crowd the copy, they use
 * one shared size scale and a narrow rotation range, and they fade out on
 * smaller screens where there is no spare margin to hold them.
 */

type Placement = {
  shape: DoodleName;
  width: number;
  opacity: number;
  rotate?: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Trimmed below 1240px, where the content starts using the margins. */
  secondary?: boolean;
};

const arrangements: Record<string, Placement[]> = {
  /**
   * The hero's right column already carries the circle composition, so the
   * doodles stay in the left gutter and along the bottom edge, where the
   * copy leaves real room.
   */
  hero: [
    { shape: "granny", width: 190, opacity: 0.07, rotate: -12, top: "-9%", left: "-4%" },
    { shape: "chain", width: 230, opacity: 0.07, rotate: -6, bottom: "3%", left: "-5%" },
    { shape: "hook", width: 62, opacity: 0.09, rotate: 12, bottom: "30%", left: "0%", secondary: true },
    { shape: "sparkle", width: 34, opacity: 0.16, top: "18%", left: "2%", secondary: true },
  ],
  categories: [
    { shape: "chain", width: 210, opacity: 0.06, rotate: -5, top: "7%", right: "-2%" },
    { shape: "granny", width: 150, opacity: 0.06, rotate: 12, bottom: "6%", left: "-3%" },
    { shape: "hook", width: 66, opacity: 0.07, rotate: -16, top: "38%", left: "1%", secondary: true },
  ],
  featured: [
    { shape: "ripple", width: 230, opacity: 0.07, rotate: 4, top: "4%", left: "-3%" },
    { shape: "flower", width: 130, opacity: 0.06, rotate: -10, top: "42%", right: "-2%" },
    { shape: "skein", width: 170, opacity: 0.06, rotate: 9, bottom: "4%", right: "8%", secondary: true },
    { shape: "sparkle", width: 38, opacity: 0.14, bottom: "16%", left: "3%", secondary: true },
  ],
  gift: [
    { shape: "granny", width: 230, opacity: 0.14, rotate: -10, top: "-12%", right: "4%" },
    { shape: "chain", width: 260, opacity: 0.12, rotate: 5, bottom: "-6%", left: "6%" },
    { shape: "flower", width: 120, opacity: 0.13, rotate: 14, top: "16%", left: "42%", secondary: true },
    { shape: "sparkle", width: 46, opacity: 0.26, top: "20%", right: "40%" },
  ],
  collections: [
    { shape: "spool", width: 120, opacity: 0.07, rotate: 10, top: "5%", right: "1%" },
    { shape: "heart", width: 130, opacity: 0.06, rotate: -12, top: "30%", left: "-1%" },
    { shape: "chain", width: 215, opacity: 0.06, rotate: 6, bottom: "4%", right: "6%", secondary: true },
  ],
  trust: [
    { shape: "yarnBall", width: 110, opacity: 0.06, rotate: -10, top: "-14%", left: "1%" },
    { shape: "flower", width: 100, opacity: 0.06, rotate: 12, bottom: "-16%", right: "2%" },
  ],
  gallery: [
    { shape: "flower", width: 140, opacity: 0.06, rotate: -8, top: "4%", left: "-2%" },
    { shape: "yarnBall", width: 150, opacity: 0.06, rotate: 11, bottom: "5%", right: "-2%" },
    { shape: "ripple", width: 200, opacity: 0.06, rotate: -4, bottom: "12%", left: "4%", secondary: true },
    { shape: "sparkle", width: 40, opacity: 0.14, top: "12%", right: "7%", secondary: true },
  ],
};

export type DoodleVariant = keyof typeof arrangements;

export default function DoodleLayer({
  variant,
  tone = "purple",
}: {
  variant: DoodleVariant;
  tone?: "purple" | "ink" | "gold" | "light";
}) {
  const placements = arrangements[variant];
  if (!placements) return null;

  return (
    <div className={`${styles.layer} ${styles[tone]}`} aria-hidden="true">
      {placements.map(({ shape, width, opacity, rotate = 0, secondary, ...pos }, i) => {
        const Shape = doodleShapes[shape];
        return (
          <span
            key={`${shape}-${i}`}
            className={secondary ? `${styles.item} ${styles.secondary}` : styles.item}
            style={{ ...pos, width, opacity, transform: `rotate(${rotate}deg)` }}
          >
            <Shape />
          </span>
        );
      })}
    </div>
  );
}
