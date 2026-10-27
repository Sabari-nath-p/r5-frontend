"use client";

import { toNumber } from "@/lib/api-types";
import type { CartLine } from "@/lib/shop/cart-storage";
import styles from "./OrderSummary.module.css";

/** Shipping must mirror the backend's rule in OrdersService.shippingFor. */
export const FREE_SHIPPING_ABOVE = 999;
export const FLAT_SHIPPING = 60;

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_ABOVE ? 0 : FLAT_SHIPPING;
}

export function formatMoney(value: number | string): string {
  return `₹${toNumber(value).toFixed(2)}`;
}

export default function OrderSummary({
  lines,
  subtotal,
  children,
}: {
  lines: CartLine[];
  subtotal: number;
  children?: React.ReactNode;
}) {
  const shipping = shippingFor(subtotal);
  const remaining = FREE_SHIPPING_ABOVE - subtotal;

  return (
    <aside className={styles.summary}>
      <h2 className={styles.heading}>Order Summary</h2>

      <ul className={styles.lines}>
        {lines.map((line) => (
          <li key={`${line.productId}:${line.variationId}`}>
            <span className={styles.lineName}>
              {line.name}
              <span className={styles.lineMeta}>
                {line.variationName} × {line.quantity}
              </span>
            </span>
            <span className={styles.lineTotal}>
              {formatMoney(line.price * line.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className={styles.totals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatMoney(subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{shipping === 0 ? "Free" : formatMoney(shipping)}</dd>
        </div>
        <div className={styles.grand}>
          <dt>Total</dt>
          <dd>{formatMoney(subtotal + shipping)}</dd>
        </div>
      </dl>

      {shipping > 0 && remaining > 0 && (
        <p className={styles.freeHint}>
          Add {formatMoney(remaining)} more for free shipping.
        </p>
      )}

      {children}
    </aside>
  );
}
