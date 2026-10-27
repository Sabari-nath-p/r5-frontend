"use client";

import Link from "next/link";
import { Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/shop/cart-context";
import { useShopAuth } from "@/lib/shop/auth-context";
import styles from "./Navbar.module.css";

/**
 * The account and cart controls. Split out of the server-rendered Navbar so
 * the rest of the header stays static while these read browser-only state.
 */
export default function NavActions() {
  const { count, ready } = useCart();
  const { status, user } = useShopAuth();

  const accountHref = status === "authenticated" ? "/account/orders" : "/login";
  const accountLabel =
    status === "authenticated" ? `Account — ${user?.name ?? user?.email}` : "Sign in";

  return (
    <>
      <Link href={accountHref} className={styles.iconBtn} aria-label={accountLabel} title={accountLabel}>
        <User size={19} strokeWidth={1.8} />
      </Link>
      <button type="button" className={styles.iconBtn} aria-label="Wishlist">
        <Heart size={19} strokeWidth={1.8} />
      </button>
      <Link href="/cart" className={styles.iconBtn} aria-label={`Cart (${count} items)`}>
        <ShoppingBag size={19} strokeWidth={1.8} />
        {ready && count > 0 && <span className={styles.badge}>{count}</span>}
      </Link>
    </>
  );
}
