"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, ordersApi, type OrderUpdateInput } from "@/lib/admin/client";
import {
  ORDER_STATUS_LABELS,
  toNumber,
  type ApiOrder,
  type ApiOrderStatus,
} from "@/lib/api-types";
import styles from "@/components/admin/admin.module.css";
import local from "./page.module.css";

const STATUSES: ApiOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

/** Mirrors the transitions the API enforces, so the UI only offers valid moves. */
const NEXT_STATUSES: Record<ApiOrderStatus, ApiOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const { getToken } = useAdminAuth();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ApiOrderStatus>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const result = await ordersApi.list(token, {
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setOrders(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [getToken, search, statusFilter]);

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(id: string, dto: OrderUpdateInput) {
    const token = await getToken();
    if (!token) return;

    setSavingId(id);
    setError(null);
    try {
      const updated = await ordersApi.update(token, id, dto);
      setOrders((current) => current.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the order.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>
            Move orders through the pipeline and attach courier tracking.
          </p>
        </div>
      </div>

      {error && <p className={local.error}>{error}</p>}

      <div className={styles.card}>
        <div className={local.filters}>
          <input
            className={styles.input}
            placeholder="Search order number, name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | ApiOrderStatus)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className={styles.muted}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className={styles.muted}>No orders match.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    expanded={expanded === order.id}
                    saving={savingId === order.id}
                    onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                    onSave={(dto) => save(order.id, dto)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  saving,
  onToggle,
  onSave,
}: {
  order: ApiOrder;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: (dto: OrderUpdateInput) => void;
}) {
  const [partner, setPartner] = useState(order.deliveryPartner ?? "");
  const [tracking, setTracking] = useState(order.trackingUrl ?? "");

  const moves = NEXT_STATUSES[order.status];

  return (
    <>
      <tr>
        <td>
          <strong>{order.orderNumber}</strong>
          <div className={styles.muted}>
            {new Date(order.createdAt).toLocaleDateString("en-IN")}
          </div>
        </td>
        <td>
          {order.customerName}
          <div className={styles.muted}>{order.customerEmail}</div>
        </td>
        <td>₹{toNumber(order.total).toFixed(2)}</td>
        <td>
          {order.paymentMethod === "COD" ? "COD" : "Online"}
          <div className={styles.muted}>{order.paymentStatus}</div>
        </td>
        <td>
          <span className={styles.badgePill}>{ORDER_STATUS_LABELS[order.status]}</span>
        </td>
        <td>
          <button type="button" className={styles.button} onClick={onToggle}>
            {expanded ? "Close" : "Manage"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6}>
            <div className={local.panel}>
              <div className={local.panelCol}>
                <h4>Items</h4>
                <ul className={local.items}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.productName} — {item.variationName} × {item.quantity}
                      <span>₹{toNumber(item.lineTotal).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <h4>Ship to</h4>
                <address className={local.address}>
                  {order.addressLine1}
                  {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                  <br />
                  {order.city}, {order.state} {order.zipcode}, {order.country}
                  <br />
                  {order.countryCode} {order.phone}
                </address>
                {order.notes && <p className={styles.muted}>Notes: {order.notes}</p>}
              </div>

              <div className={local.panelCol}>
                <h4>Delivery tracking</h4>
                <div className={styles.field}>
                  <label className={styles.label}>Delivery partner</label>
                  <input
                    className={styles.input}
                    placeholder="Delhivery, BlueDart…"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
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
                  className={styles.button}
                  disabled={saving}
                  onClick={() =>
                    onSave({
                      deliveryPartner: partner,
                      ...(tracking ? { trackingUrl: tracking } : {}),
                    })
                  }
                >
                  {saving ? "Saving…" : "Save tracking"}
                </button>

                <h4 className={local.spaced}>Move to</h4>
                {moves.length === 0 ? (
                  <p className={styles.muted}>
                    This order has reached a final state.
                  </p>
                ) : (
                  <div className={styles.actions}>
                    {moves.map((next) => (
                      <button
                        key={next}
                        type="button"
                        className={styles.button}
                        disabled={saving}
                        onClick={() => onSave({ status: next })}
                      >
                        {ORDER_STATUS_LABELS[next]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
