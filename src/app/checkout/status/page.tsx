"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import OrderDetail from "@/components/shop/OrderDetail";
import { useCart } from "@/lib/shop/cart-context";
import { useShopAuth } from "@/lib/shop/auth-context";
import { ApiError, lookupOrder, verifyPayment } from "@/lib/shop/client";
import type { ApiOrder } from "@/lib/api-types";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

function StatusView() {
  const params = useSearchParams();
  const orderNumber = params.get("order_number");
  const { user } = useShopAuth();
  const { clear } = useCart();

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const load = useCallback(
    async (lookupEmail?: string) => {
      if (!orderNumber) {
        setError("We could not tell which order to show.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Ask the server to re-check with Cashfree first. For a COD order this
        // is a no-op that simply returns the order.
        const confirmed = await verifyPayment(orderNumber);
        setOrder(confirmed);
        // The order exists, so whatever is still in the cart has been ordered.
        if (confirmed.status !== "CANCELLED") clear();
      } catch {
        // Payment verification needs the gateway; fall back to the plain
        // lookup, which only needs the order number and the email.
        const fallbackEmail = lookupEmail ?? user?.email;
        if (!fallbackEmail) {
          setError("Enter the email you ordered with to see this order.");
          setLoading(false);
          return;
        }

        try {
          setOrder(await lookupOrder(fallbackEmail, orderNumber));
        } catch (err) {
          setError(
            err instanceof ApiError ? err.message : "We could not find that order."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, user?.email, clear]
  );

  useEffect(() => {
    // The whole page exists to report a result fetched on arrival.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className={shop.loading}>
        <Loader2 size={20} className={styles.spin} /> Confirming your order…
      </p>
    );
  }

  if (!order) {
    return (
      <div className={`${shop.card} ${styles.lookup}`}>
        <CircleAlert size={40} strokeWidth={1.5} />
        <h1 className={shop.title}>We need a little more</h1>
        {error && <p className={shop.sub}>{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(email.trim().toLowerCase());
          }}
        >
          <div className={shop.field}>
            <label htmlFor="lookup-email">Email used for the order</label>
            <input
              id="lookup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className={shop.primary}>
            Find my order
          </button>
        </form>
      </div>
    );
  }

  const paid = order.paymentStatus === "PAID";
  const failed = order.paymentStatus === "FAILED" || order.status === "CANCELLED";

  return (
    <>
      <div className={failed ? styles.bannerFailed : styles.banner}>
        {failed ? <CircleAlert size={30} /> : <CheckCircle2 size={30} />}
        <div>
          <h1 className={styles.bannerTitle}>
            {failed
              ? "Your payment did not go through"
              : paid
                ? "Payment received — thank you!"
                : "Order placed — thank you!"}
          </h1>
          <p className={styles.bannerText}>
            {failed
              ? "Nothing has been charged. You can try placing the order again."
              : `We emailed a confirmation to ${order.customerEmail}.`}
          </p>
        </div>
      </div>

      <OrderDetail order={order} />

      <div className={styles.actions}>
        <Link href="/#shop" className={shop.secondary}>
          Continue shopping
        </Link>
        <Link href="/account/orders" className={shop.secondary}>
          View all orders
        </Link>
      </div>
    </>
  );
}

export default function CheckoutStatusPage() {
  return (
    <>
      <Navbar active="Shop" />
      <main className={shop.page}>
        <div className="container">
          <Suspense fallback={<p className={shop.loading}>Loading…</p>}>
            <StatusView />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
