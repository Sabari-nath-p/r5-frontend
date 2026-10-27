"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError, ordersApi } from "@/lib/admin/client";
import {
  ORDER_STATUS_LABELS,
  toNumber,
  type ApiOrder,
  type ApiOrderStatus,
} from "@/lib/api-types";
import OrderDialog from "@/components/admin/dialogs/OrderDialog";
import { EmptyState, TableSkeleton } from "@/components/admin/ListStates";
import styles from "@/components/admin/admin.module.css";

const STATUSES: ApiOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

/** Pipeline stages read as neutral brand chips; only the two end states get a tone. */
function statusClass(status: ApiOrderStatus) {
  if (status === "DELIVERED") return styles.badgeGood;
  if (status === "CANCELLED") return styles.badgeCrit;
  if (status === "PENDING") return styles.badgeWarn;
  return styles.badge;
}

export default function AdminOrdersPage() {
  const { getToken } = useAdminAuth();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ApiOrderStatus>("");
  const [active, setActive] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const result = await ordersApi.list(token, {
        limit: 100,
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

  function applyUpdate(updated: ApiOrder) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    setActive(updated);
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

      {error && (
        <p className={styles.error} style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </p>
      )}

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} />
            <input
              className={styles.input}
              placeholder="Search order number, name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            style={{ width: 170 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | ApiOrderStatus)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <span className={styles.toolbarSpacer} />
          <span className={styles.count}>{orders.length} shown</span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={search || statusFilter ? <SlidersHorizontal size={20} /> : <ShoppingBag size={20} />}
            title={search || statusFilter ? "No orders match" : "No orders yet"}
            message={
              search || statusFilter
                ? "Clear the search or pick another status."
                : "Orders placed on the storefront land here."
            }
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className={styles.colActions} />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className={`${styles.cellStrong} ${styles.mono}`}>
                        {order.orderNumber}
                      </div>
                      <div className={styles.cellSub}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td>
                      <div className={styles.cellStrong}>{order.customerName}</div>
                      <div className={styles.cellSub}>{order.customerEmail}</div>
                    </td>
                    <td className={styles.num}>{order.items.length}</td>
                    <td className={`${styles.num} ${styles.cellStrong}`}>
                      ₹{toNumber(order.total).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <div>{order.paymentMethod === "COD" ? "COD" : "Online"}</div>
                      <div className={styles.cellSub}>
                        <span
                          className={
                            order.paymentStatus === "PAID"
                              ? styles.badgeGood
                              : order.paymentStatus === "FAILED"
                                ? styles.badgeCrit
                                : styles.badgeMuted
                          }
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={statusClass(order.status)}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className={styles.colActions}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                          onClick={() => setActive(order)}
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active && (
        <OrderDialog
          order={active}
          onClose={() => setActive(null)}
          onUpdated={applyUpdate}
        />
      )}
    </div>
  );
}
