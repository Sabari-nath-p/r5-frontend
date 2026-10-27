/**
 * Hand-drawn crochet line-art doodles used as low-opacity page decoration.
 *
 * Every shape draws with `currentColor`, a 1.6 stroke and round joins so the
 * whole family reads as one pen. Each keeps its own viewBox / aspect ratio —
 * the doodle layer sets a width only and lets height follow.
 */

type DoodleProps = { className?: string };

const pen = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function YarnBall({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 104 118" {...pen}>
      <circle cx="52" cy="48" r="40" />
      <path d="M17 31c21 9 45 25 66 40" />
      <path d="M13 61c21-12 43-30 59-47" />
      <path d="M29 85c13-19 29-41 59-49" />
      <path d="M25 21c21 24 35 50 41 66" />
      <path d="M61 86c6 14-6 26-17 21-8-4-6-14 3-13" />
    </svg>
  );
}

export function CrochetHook({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 44 168" {...pen}>
      <path d="M22 150V46" />
      <path d="M22 46c0-7 0-11-5-14-6-3-12 1-12 7 0 6 5 10 11 9" />
      <path d="M18 78c-1 9-1 18 0 27" />
      <path d="M26 78c1 9 1 18 0 27" />
    </svg>
  );
}

export function GrannySquare({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 110 110" {...pen}>
      <path d="M10 22c0-7 5-12 12-12h66c7 0 12 5 12 12v66c0 7-5 12-12 12H22c-7 0-12-5-12-12V22Z" />
      <path d="M55 24l31 31-31 31-31-31 31-31Z" />
      <circle cx="55" cy="55" r="17" />
      <circle cx="55" cy="55" r="5" />
      <path d="M19 19l11 11M91 19L80 30M19 91l11-11M91 91L80 80" />
    </svg>
  );
}

export function CrochetFlower({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 110 110" {...pen}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle} 55 55)`}
          d="M55 55c-10-17-7-33 0-39 7 6 10 22 0 39Z"
        />
      ))}
      <circle cx="55" cy="55" r="10" />
      <circle cx="55" cy="55" r="3" />
    </svg>
  );
}

export function ChainStitch({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 240 40" {...pen}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={26 + i * 38} cy={20} rx={22} ry={13} />
      ))}
    </svg>
  );
}

export function RippleStitch({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 240 72" {...pen}>
      {[16, 36, 56].map((y) => (
        <path key={y} d={`M4 ${y}Q34 ${y - 18} 64 ${y}T124 ${y}T184 ${y}T236 ${y}`} />
      ))}
    </svg>
  );
}

export function YarnSkein({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 140 90" {...pen}>
      <path d="M14 45c0-17 14-31 31-31h50c17 0 31 14 31 31s-14 31-31 31H45c-17 0-31-14-31-31Z" />
      <path d="M56 17v56M86 17v56" />
      <path d="M24 29c11 5 21 12 28 21M24 61c11-5 21-12 28-21" />
      <path d="M116 29c-10 5-19 12-26 21M116 61c-10-5-19-12-26-21" />
    </svg>
  );
}

export function StitchedHeart({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 110 100" {...pen}>
      <path d="M55 92C27 72 10 55 10 36 10 22 21 12 34 12c9 0 17 5 21 12 4-7 12-12 21-12 13 0 24 10 24 24 0 19-17 36-45 56Z" />
      <path d="M31 33l7 9M48 29l7 9M65 29l7 9M82 33l-7 9M40 52l7 9M57 50l7 9M74 52l-7 9" />
    </svg>
  );
}

export function ThreadSpool({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 90 120" {...pen}>
      <ellipse cx="45" cy="18" rx="31" ry="11" />
      <ellipse cx="45" cy="102" rx="31" ry="11" />
      <path d="M14 18v84M76 18v84" />
      <path d="M20 40h50M20 60h50M20 80h50" />
      <path d="M76 64c13 7 15 22 7 33-5 7-3 13 4 16" />
    </svg>
  );
}

export function Sparkle({ className }: DoodleProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" {...pen}>
      <path d="M20 4c2 9 7 14 16 16-9 2-14 7-16 16-2-9-7-14-16-16 9-2 14-7 16-16Z" />
    </svg>
  );
}

export const doodleShapes = {
  yarnBall: YarnBall,
  hook: CrochetHook,
  granny: GrannySquare,
  flower: CrochetFlower,
  chain: ChainStitch,
  ripple: RippleStitch,
  skein: YarnSkein,
  heart: StitchedHeart,
  spool: ThreadSpool,
  sparkle: Sparkle,
} as const;

export type DoodleName = keyof typeof doodleShapes;
