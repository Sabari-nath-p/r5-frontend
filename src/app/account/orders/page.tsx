"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Package } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CoverImage from "@/components/CoverImage";
import { formatDate } from "@/components/shop/OrderDetail";
import { formatMoney } from "@/components/shop/OrderSummary";
import { useShopAuth } from "@/lib/shop/auth-context";
import { ApiError, getMyOrders } from "@/lib/shop/client";
import { ORDER_STATUS_LABELS, type ApiOrder } from "@/lib/api-types";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

export default function OrdersPage() {
  const router = useRouter();
  const { status, user, getToken, logout } = useShopAuth();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace("/login?next=/account/orders");
      return;
    }

    try {
      const result = await getMyOrders(token, { limit: 50 });
      setOrders(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login?next=/account/orders");
      return;
    }
    // Fetching on mount is the point of this effect; the rule cannot see
    // that load() only sets state after awaiting the token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [status, load, router]);

  return (
    <>
      <Navbar />

      <main className={shop.page}>
        <div className="container">
          <header className={`${shop.head} ${styles.head}`}>
            <div>
              <h1 className={`display ${shop.title}`}>
                Your <span>Orders</span>
              </h1>
              {user && <p className={shop.sub}>Signed in as {user.email}</p>}
            </div>
            <button type="button" className={shop.secondary} onClick={logout}>
              <LogOut size={15} /> Sign out
            </button>
          </header>

          {error && <div className={shop.error}>{error}</div>}

          {loading ? (
            <p className={shop.loading}>Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className={`${shop.card} ${shop.empty}`}>
              <Package size={44} strokeWidth={1.4} />
              <div>
                <p>You have not placed an order yet.</p>
                <p className={shop.hint}>Everything you order will appear here.</p>
              </div>
              <Link href="/#shop" className={shop.secondary}>
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className={styles.orders}>
              {orders.map((order) => (
                <li key={order.id}>
                  <Link href={`/account/orders/${order.id}`} className={styles.order}>
                    <div className={styles.thumbs}>
                      {order.items.slice(0, 3).map((item) => (
                        <span key={item.id} className={styles.thumb}>
                          <CoverImage
                            src={item.image}
                            alt={item.productName}
                            icon={Package}
                            tone="lavender"
                            rounded="sm"
                          />
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className={styles.more}>+{order.items.length - 3}</span>
                      )}
                    </div>

                    <div className={styles.body}>
                      <span className={styles.number}>{order.orderNumber}</span>
                      <span className={styles.meta}>
                        {formatDate(order.createdAt)} ·{" "}
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} item
                        {order.items.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <span className={styles[`pill${order.status}`] ?? styles.pillPENDING}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>

                    <span className={styles.total}>{formatMoney(order.total)}</span>

                    <ChevronRight size={18} className={styles.chevron} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
