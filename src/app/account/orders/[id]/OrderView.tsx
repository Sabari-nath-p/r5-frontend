"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import OrderDetail from "@/components/shop/OrderDetail";
import { useShopAuth } from "@/lib/shop/auth-context";
import { ApiError, getOrder } from "@/lib/shop/client";
import type { ApiOrder } from "@/lib/api-types";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

export default function OrderView({ id }: { id: string }) {
  const router = useRouter();
  const { status, getToken } = useShopAuth();

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace(`/login?next=/account/orders/${id}`);
      return;
    }

    try {
      setOrder(await getOrder(token, id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [getToken, id, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(`/login?next=/account/orders/${id}`);
      return;
    }
    // Fetching on mount is the point of this effect; the rule cannot see
    // that load() only sets state after awaiting the token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [status, load, router, id]);

  return (
    <>
      <Link href="/account/orders" className={styles.back}>
        <ArrowLeft size={15} /> All orders
      </Link>

      {error && <div className={shop.error}>{error}</div>}

      {loading ? (
        <p className={shop.loading}>Loading order…</p>
      ) : order ? (
        <OrderDetail order={order} />
      ) : (
        !error && <p className={shop.loading}>Order not found.</p>
      )}
    </>
  );
}
