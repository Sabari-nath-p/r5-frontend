import type { LucideIcon } from "lucide-react";
import { Flower, Flower2, KeyRound, NotebookPen, Package, Rabbit } from "lucide-react";

export const iconRegistry = {
  rabbit: Rabbit,
  flower2: Flower2,
  package: Package,
  "notebook-pen": NotebookPen,
  flower: Flower,
  "key-round": KeyRound,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof iconRegistry;
