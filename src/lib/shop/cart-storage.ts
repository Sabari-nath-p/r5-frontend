import type { ApiProduct, ApiProductVariation } from "@/lib/api-types";

const CART_KEY = "r5_cart";

export type CartLine = {
  productId: string;
  variationId: string;
  /** Snapshotted for display only — the server re-prices every order. */
  name: string;
  slug: string;
  variationName: string;
  image: string | null;
  price: number;
  quantity: number;
  stock: number;
};

export function lineKey(line: Pick<CartLine, "productId" | "variationId">): string {
  return `${line.productId}:${line.variationId}`;
}

export function toCartLine(
  product: ApiProduct,
  variation: ApiProductVariation,
  quantity: number
): CartLine {
  return {
    productId: product.id,
    variationId: variation.id,
    name: product.name,
    slug: product.slug,
    variationName: variation.name,
    image: [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
    price: Number(variation.price),
    quantity,
    stock: variation.stock,
  };
}

/**
 * The cart lives in sessionStorage: it survives reloads and navigation within
 * the tab, and is dropped when the tab closes. Every accessor is guarded —
 * private browsing and blocked site data both make these throw.
 */
export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  try {
    window.sessionStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // ignore storage failures
  }
}

export function clearStoredCart() {
  try {
    window.sessionStorage.removeItem(CART_KEY);
  } catch {
    // ignore
  }
}
