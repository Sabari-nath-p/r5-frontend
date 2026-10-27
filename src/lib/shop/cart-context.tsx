"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiProduct, ApiProductVariation } from "@/lib/api-types";
import {
  clearStoredCart,
  lineKey,
  loadCart,
  saveCart,
  toCartLine,
  type CartLine,
} from "./cart-storage";

type CartContextValue = {
  lines: CartLine[];
  /** False until sessionStorage has been read, so the badge never flickers. */
  ready: boolean;
  count: number;
  subtotal: number;
  add: (product: ApiProduct, variation: ApiProductVariation, quantity?: number) => void;
  setQuantity: (productId: string, variationId: string, quantity: number) => void;
  remove: (productId: string, variationId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after mount so server and first client render agree; sessionStorage
    // is not available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(loadCart());
    setReady(true);
  }, []);

  const commit = useCallback((next: CartLine[]) => {
    setLines(next);
    saveCart(next);
  }, []);

  const add = useCallback(
    (product: ApiProduct, variation: ApiProductVariation, quantity = 1) => {
      const incoming = toCartLine(product, variation, quantity);
      const key = lineKey(incoming);
      const existing = lines.find((l) => lineKey(l) === key);

      const next = existing
        ? lines.map((l) =>
            lineKey(l) === key
              ? // Never let the cart exceed what is actually in stock.
                { ...l, quantity: Math.min(l.quantity + quantity, variation.stock) }
              : l
          )
        : [...lines, incoming];

      commit(next);
    },
    [lines, commit]
  );

  const setQuantity = useCallback(
    (productId: string, variationId: string, quantity: number) => {
      const key = lineKey({ productId, variationId });

      if (quantity < 1) {
        commit(lines.filter((l) => lineKey(l) !== key));
        return;
      }

      commit(
        lines.map((l) =>
          lineKey(l) === key
            ? { ...l, quantity: Math.min(quantity, l.stock || quantity) }
            : l
        )
      );
    },
    [lines, commit]
  );

  const remove = useCallback(
    (productId: string, variationId: string) => {
      const key = lineKey({ productId, variationId });
      commit(lines.filter((l) => lineKey(l) !== key));
    },
    [lines, commit]
  );

  const clear = useCallback(() => {
    setLines([]);
    clearStoredCart();
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
