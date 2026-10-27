"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Truck } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, ordersApi, type OrderUpdateInput } from "@/lib/admin/client";
import { ORDER_STATUS_LABELS, toNumber, type ApiOrder, type ApiOrderStatus } from "@/lib/api-types";
import Modal from "../Modal";
import { useToast } from "../Toast";
import styles from "../admin.module.css";
import local from "./OrderDialog.module.css";

/** Mirrors the transitions the API enforces, so the UI only offers valid moves. */
const NEXT_STATUSES: Record<ApiOrderStatus, ApiOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const money = (value: string | number) =>
  `₹${toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrderDialog({
  order,
  onClose,
  onUpdated,
}: {
  order: ApiOrder;
  onClose: () => void;
  onUpdated: (updated: ApiOrder) => void;
}) {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [partner, setPartner] = useState(order.deliveryPartner ?? "");
  const [tracking, setTracking] = useState(order.trackingUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moves = NEXT_STATUSES[order.status];

  async function save(dto: OrderUpdateInput, successMessage: string) {
    const token = await getToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await ordersApi.update(token, order.id, dto);
      onUpdated(updated);
      toast.success(successMessage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={`Order ${order.orderNumber}`}
      description={`Placed ${new Date(order.createdAt).toLocaleString("en-IN")} · ${
        ORDER_STATUS_LABELS[order.status]
      }`}
      size="xl"
      onClose={onClose}
      footer={
        <button type="button" className={styles.buttonSecondary} onClick={onClose}>
          Close
        </button>
      }
      footerNote={`Total ${money(order.total)}`}
    >
      {error && (
        <p className={styles.error} style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </p>
      )}

      <div className={local.layout}>
        <section>
          <h4 className={local.heading}>Items</h4>
          <ul className={local.items}>
            {order.items.map((item) => (
              <li key={item.id}>
                <span className={local.itemName}>
                  {item.productName}
                  <small>
                    {item.variationName} × {item.quantity}
                  </small>
                </span>
                <span className={styles.num}>{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className={local.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd className={styles.num}>{money(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd className={styles.num}>{money(order.shipping)}</dd>
            </div>
            <div className={local.grand}>
              <dt>Total</dt>
              <dd className={styles.num}>{money(order.total)}</dd>
            </div>
          </dl>

          <h4 className={local.heading}>Customer</h4>
          <p className={local.block}>
            <strong>{order.customerName}</strong>
            <br />
            {order.customerEmail}
            <br />
            {order.countryCode} {order.phone}
          </p>

          <h4 className={local.heading}>Ship to</h4>
          <address className={local.block}>
            {order.addressLine1}
            {order.addressLine2 ? `, ${order.addressLine2}` : ""}
            <br />
            {order.city}, {order.state} {order.zipcode}
            <br />
            {order.country}
          </address>

          {order.notes && (
            <>
              <h4 className={local.heading}>Notes</h4>
              <p className={local.block}>{order.notes}</p>
            </>
          )}
        </section>

        <section>
          <h4 className={local.heading}>Payment</h4>
          <div className={local.payment}>
            <span className={styles.badgeMuted}>
              {order.paymentMethod === "COD" ? "Cash on delivery" : "Online (Cashfree)"}
            </span>
            <span
              className={
                order.paymentStatus === "PAID"
                  ? styles.badgeGood
                  : order.paymentStatus === "FAILED"
                    ? styles.badgeCrit
                    : styles.badgeWarn
              }
            >
              {order.paymentStatus}
            </span>
          </div>

          <h4 className={local.heading}>
            <Truck size={14} /> Delivery tracking
          </h4>
          <div className={styles.field}>
            <label className={styles.label}>Delivery partner</label>
            <input
              className={styles.input}
              placeholder="Delhivery, BlueDart…"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.label}>Tracking URL</label>
            <input
              className={styles.input}
              placeholder="https://…"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={styles.buttonSecondary}
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() =>
              save(
                {
                  deliveryPartner: partner,
                  ...(tracking ? { trackingUrl: tracking } : {}),
                },
                "Tracking saved."
              )
            }
          >
            {saving ? "Saving…" : "Save tracking"}
          </button>

          <h4 className={local.heading} style={{ marginTop: 26 }}>
            Move order forward
          </h4>
          {moves.length === 0 ? (
            <p className={styles.muted}>
              This order is {ORDER_STATUS_LABELS[order.status].toLowerCase()} — a final state.
            </p>
          ) : (
            <div className={styles.actions}>
              {moves.map((next) => (
                <button
                  key={next}
                  type="button"
                  className={next === "CANCELLED" ? styles.buttonDanger : styles.button}
                  disabled={saving}
                  onClick={() => save({ status: next }, `Order moved to ${ORDER_STATUS_LABELS[next]}.`)}
                >
                  {next !== "CANCELLED" && <ArrowRight size={14} />}
                  {ORDER_STATUS_LABELS[next]}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
