"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/shop/cart-context";
import styles from "./CartBar.module.css";

/** Pages that already show the cart or are not part of the storefront. */
const HIDDEN_ON = ["/cart", "/checkout", "/myportal", "/login", "/account"];

function CartBarInner() {
  const { count, subtotal, ready } = useCart();
  const pathname = usePathname();

  if (!ready || count === 0) return null;
  if (HIDDEN_ON.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <div className={styles.wrap} role="region" aria-label="Cart summary">
      <div className={styles.bar}>
        <span className={styles.summary}>
          <span className={styles.icon}>
            <ShoppingBag size={17} />
          </span>
          <span className={styles.text}>
            <strong>
              {count} item{count === 1 ? "" : "s"}
            </strong>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </span>
        </span>

        <span className={styles.actions}>
          <Link href="/cart" className={styles.ghost}>
            View cart
          </Link>
          <Link href="/checkout" className={styles.cta}>
            Proceed to Checkout <ArrowRight size={16} />
          </Link>
        </span>
      </div>
    </div>
  );
}

/**
 * Floating bar that appears on any storefront page once the cart has something
 * in it. The pathname lives behind a Suspense boundary so reading the URL never
 * pulls a dynamic route (/product/[slug]) out of its prerendered shell.
 */
export default function CartBar() {
  return (
    <Suspense fallback={null}>
      <CartBarInner />
    </Suspense>
  );
}
