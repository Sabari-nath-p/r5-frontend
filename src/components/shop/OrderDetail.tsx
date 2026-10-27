"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import OrderStatusTrail from "./OrderStatusTrail";
import { formatMoney } from "./OrderSummary";
import { ORDER_STATUS_LABELS, type ApiOrder } from "@/lib/api-types";
import styles from "./OrderDetail.module.css";

const PAYMENT_LABELS: Record<string, string> = {
  COD: "Cash on delivery",
  CASHFREE: "Paid online (Cashfree)",
};

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Shared by the customer's order page and the post-payment status page. */
export default function OrderDetail({ order }: { order: ApiOrder }) {
  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.head}>
          <div>
            <span className={styles.label}>Order</span>
            <h2 className={styles.number}>{order.orderNumber}</h2>
            <p className={styles.placed}>Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span className={styles[`pill${order.status}`] ?? styles.pillPENDING}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        <OrderStatusTrail
          status={order.status}
          trackingUrl={order.trackingUrl}
          deliveryPartner={order.deliveryPartner}
        />
      </section>

      <div className={styles.columns}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Items</h3>
          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={item.id}>
                <Link href={`/product/${item.productSlug}`} className={styles.thumb}>
                  <CoverImage
                    src={item.image}
                    alt={item.productName}
                    icon={Package}
                    tone="lavender"
                    rounded="sm"
                  />
                </Link>
                <div className={styles.itemBody}>
                  <Link href={`/product/${item.productSlug}`} className={styles.itemName}>
                    {item.productName}
                  </Link>
                  <span className={styles.itemMeta}>
                    {item.variationName} · {formatMoney(item.unitPrice)} × {item.quantity}
                  </span>
                </div>
                <span className={styles.itemTotal}>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className={styles.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>
                {Number(order.shipping) === 0 ? "Free" : formatMoney(order.shipping)}
              </dd>
            </div>
            <div className={styles.grand}>
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>

        <div className={styles.side}>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Delivery address</h3>
            <address className={styles.address}>
              <strong>{order.customerName}</strong>
              {order.addressLine1}
              {order.addressLine2 && <>{order.addressLine2}</>}
              {order.city}, {order.state} {order.zipcode}
              {order.country}
              <span className={styles.contact}>
                {order.countryCode} {order.phone}
              </span>
              <span className={styles.contact}>{order.customerEmail}</span>
            </address>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Payment</h3>
            <p className={styles.payment}>
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <span className={styles[`payment${order.paymentStatus}`] ?? styles.paymentPENDING}>
              {order.paymentStatus === "PAID"
                ? "Payment received"
                : order.paymentStatus === "FAILED"
                  ? "Payment failed"
                  : order.paymentStatus === "REFUNDED"
                    ? "Refunded"
                    : order.paymentMethod === "COD"
                      ? "Due on delivery"
                      : "Awaiting payment"}
            </span>

            {order.notes && <p className={styles.notes}>{order.notes}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
