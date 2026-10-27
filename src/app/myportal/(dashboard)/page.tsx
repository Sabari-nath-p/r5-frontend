"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  GalleryVerticalEnd,
  IndianRupee,
  Images,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Receipt,
  Shapes,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import {
  ApiError,
  bannersApi,
  categoriesApi,
  galleryApi,
  ordersApi,
  productsApi,
  tagsApi,
  usersApi,
} from "@/lib/admin/client";
import {
  ORDER_STATUS_LABELS,
  toNumber,
  type ApiOrder,
  type ApiOrderStatus,
  type ApiProduct,
} from "@/lib/api-types";
import BarChart, { type BarPoint } from "@/components/admin/charts/BarChart";
import Sparkline from "@/components/admin/charts/Sparkline";
import StageBars from "@/components/admin/charts/StageBars";
import { EmptyState } from "@/components/admin/ListStates";
import styles from "@/components/admin/admin.module.css";
import local from "./page.module.css";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const PIPELINE: ApiOrderStatus[] = ["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"];
const OPEN_STATUSES: ApiOrderStatus[] = ["PENDING", "CONFIRMED", "PACKING", "SHIPPED"];
const LOW_STOCK = 3;

const inr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Compact axis/tooltip money: 12.4k keeps the axis column narrow. */
function inrShort(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₹${Math.round(value)}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function totalStock(product: ApiProduct) {
  return product.variations.reduce((sum, variation) => sum + variation.stock, 0);
}

type Counts = {
  products: number;
  categories: number;
  tags: number;
  banners: number;
  gallery: number;
  customers: number | null;
};

export default function AdminDashboardPage() {
  const { getToken } = useAdminAuth();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [counts, setCounts] = useState<Counts>({
    products: 0,
    categories: 0,
    tags: 0,
    banners: 0,
    gallery: 0,
    customers: null,
  });
  const [range, setRange] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      const [orderList, productList, categories, tags, banners, gallery] = await Promise.all([
        ordersApi.list(token, { limit: 200 }),
        productsApi.list({ limit: 200 }),
        categoriesApi.list(),
        tagsApi.list(),
        bannersApi.list(),
        galleryApi.list(),
      ]);

      // Customer count is a nice-to-have: a failure here must not blank the page.
      const customers = await usersApi
        .list(token)
        .then((users) => users.filter((user) => user.role === "USER").length)
        .catch(() => null);

      setOrders(orderList.items);
      setProducts(productList.items);
      setCounts({
        products: productList.total,
        categories: categories.length,
        tags: tags.length,
        banners: banners.length,
        gallery: gallery.length,
        customers,
      });
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not load the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // Initial data load on mount, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const now = new Date();
    const from = startOfDay(new Date(now.getTime() - (range - 1) * 86400000));

    const inRange = orders.filter((order) => new Date(order.createdAt) >= from);
    const paidInRange = inRange.filter((order) => order.paymentStatus === "PAID");
    const revenue = paidInRange.reduce((sum, order) => sum + toNumber(order.total), 0);

    // Daily buckets for the window; 90 days is bucketed weekly so the bars stay readable.
    const weekly = range > 31;
    const bucketDays = weekly ? 7 : 1;
    const bucketCount = Math.ceil(range / bucketDays);
    const buckets: { start: Date; revenue: number; orders: number }[] = Array.from(
      { length: bucketCount },
      (_, i) => ({
        start: startOfDay(
          new Date(from.getTime() + (bucketCount - 1 - i) * bucketDays * 86400000)
        ),
        revenue: 0,
        orders: 0,
      })
    ).reverse();

    for (const order of inRange) {
      const placed = new Date(order.createdAt);
      const index = Math.min(
        buckets.length - 1,
        Math.floor((startOfDay(placed).getTime() - from.getTime()) / (bucketDays * 86400000))
      );
      if (index < 0) continue;
      buckets[index].orders += 1;
      if (order.paymentStatus === "PAID") buckets[index].revenue += toNumber(order.total);
    }

    const revenueSeries: BarPoint[] = buckets.map((bucket) => {
      const end = new Date(bucket.start.getTime() + (bucketDays - 1) * 86400000);
      return {
        key: bucket.start.toISOString(),
        label: weekly
          ? bucket.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : bucket.start.toLocaleDateString("en-IN", { day: "numeric" }),
        fullLabel: weekly
          ? `${bucket.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
          : bucket.start.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
        value: Math.round(bucket.revenue),
      };
    });

    const awaitingPayment = orders
      .filter(
        (order) =>
          order.paymentStatus === "PENDING" &&
          order.status !== "CANCELLED"
      )
      .reduce((sum, order) => sum + toNumber(order.total), 0);

    const byStatus = (status: ApiOrderStatus) =>
      orders.filter((order) => order.status === status).length;

    const lowStock = products
      .map((product) => ({ product, stock: totalStock(product) }))
      .filter((row) => row.stock <= LOW_STOCK)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    // Units sold per product, from every order line that wasn't cancelled.
    const unitsByProduct = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items) {
        const current = unitsByProduct.get(item.productId) ?? {
          name: item.productName,
          units: 0,
          revenue: 0,
        };
        current.units += item.quantity;
        current.revenue += toNumber(item.lineTotal);
        unitsByProduct.set(item.productId, current);
      }
    }
    const topProducts = [...unitsByProduct.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      revenue,
      orderCount: inRange.length,
      paidCount: paidInRange.length,
      avgOrder: paidInRange.length ? revenue / paidInRange.length : 0,
      openOrders: orders.filter((order) => OPEN_STATUSES.includes(order.status)).length,
      pendingOrders: byStatus("PENDING"),
      awaitingPayment,
      revenueSeries,
      orderSeries: buckets.map((bucket) => bucket.orders),
      revenueSpark: buckets.map((bucket) => bucket.revenue),
      stages: PIPELINE.map((status) => ({
        key: status,
        label: ORDER_STATUS_LABELS[status],
        value: byStatus(status),
      })),
      cancelled: byStatus("CANCELLED"),
      recent: [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
      lowStock,
      topProducts,
      weekly,
    };
  }, [orders, products, range]);

  const rangeLabel = RANGES.find((item) => item.days === range)?.label ?? `${range} days`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Sales, fulfilment and catalog health for r5atelier.in.
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={local.segmented} role="group" aria-label="Date range">
            {RANGES.map((item) => (
              <button
                key={item.days}
                type="button"
                className={range === item.days ? local.segmentActive : local.segment}
                onClick={() => setRange(item.days)}
                aria-pressed={range === item.days}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.error} style={{ marginBottom: 18 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </p>
      )}

      {/* ---- KPI row ---- */}
      <div className={local.statRow}>
        <StatTile
          icon={<IndianRupee size={16} />}
          label={`Paid revenue · ${rangeLabel}`}
          value={loading ? "—" : inr(metrics.revenue)}
          footnote={`${metrics.paidCount} paid order${metrics.paidCount === 1 ? "" : "s"}`}
          spark={metrics.revenueSpark}
          sparkLabel={`Paid revenue trend over the last ${rangeLabel}`}
        />
        <StatTile
          icon={<ShoppingBag size={16} />}
          label={`Orders · ${rangeLabel}`}
          value={loading ? "—" : String(metrics.orderCount)}
          footnote={`${metrics.openOrders} still open`}
          spark={metrics.orderSeries}
          sparkLabel={`Order count trend over the last ${rangeLabel}`}
        />
        <StatTile
          icon={<Receipt size={16} />}
          label="Average order value"
          value={loading ? "—" : inr(metrics.avgOrder)}
          footnote="Across paid orders in range"
        />
        <StatTile
          icon={<PackageCheck size={16} />}
          label="Needs attention"
          value={loading ? "—" : String(metrics.pendingOrders)}
          footnote={
            metrics.awaitingPayment > 0
              ? `${inr(metrics.awaitingPayment)} awaiting payment`
              : "No payments outstanding"
          }
          tone={metrics.pendingOrders > 0 ? "warn" : undefined}
          href="/myportal/orders"
        />
      </div>

      {/* ---- Charts ---- */}
      <div className={local.chartRow}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Paid revenue</span>
              <p className={styles.cardMeta}>
                {metrics.weekly ? "Per week" : "Per day"} · last {rangeLabel}
              </p>
            </div>
            <span className={styles.count}>{inr(metrics.revenue)} total</span>
          </div>
          <div className={styles.cardPad}>
            {loading ? (
              <div className={local.chartPlaceholder} />
            ) : (
              <BarChart
                data={metrics.revenueSeries}
                formatValue={inrShort}
                valueLabel="Paid revenue"
              />
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Order pipeline</span>
              <p className={styles.cardMeta}>All orders by stage</p>
            </div>
            <Link href="/myportal/orders" className={local.cardLink}>
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div className={styles.cardPad}>
            <StageBars stages={metrics.stages} />
            {metrics.cancelled > 0 && (
              <p className={local.pipelineNote}>
                <AlertTriangle size={13} /> {metrics.cancelled} cancelled order
                {metrics.cancelled === 1 ? "" : "s"} not shown above.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ---- Recent orders + top products ---- */}
      <div className={local.splitRow}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Recent orders</span>
            <Link href="/myportal/orders" className={local.cardLink}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {metrics.recent.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={20} />}
              title="No orders yet"
              message="Orders placed on the storefront appear here."
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recent.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className={`${styles.cellStrong} ${styles.mono}`}>
                          {order.orderNumber}
                        </div>
                        <div className={styles.cellSub}>
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </td>
                      <td>
                        <div>{order.customerName}</div>
                        <div className={styles.cellSub}>{order.customerEmail}</div>
                      </td>
                      <td className={`${styles.num} ${styles.cellStrong}`}>
                        {inr(toNumber(order.total))}
                      </td>
                      <td>
                        <span
                          className={
                            order.status === "DELIVERED"
                              ? styles.badgeGood
                              : order.status === "CANCELLED"
                                ? styles.badgeCrit
                                : order.status === "PENDING"
                                  ? styles.badgeWarn
                                  : styles.badge
                          }
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Best sellers</span>
              <p className={styles.cardMeta}>Units across all non-cancelled orders</p>
            </div>
          </div>
          {metrics.topProducts.length === 0 ? (
            <EmptyState
              icon={<Package size={20} />}
              title="Nothing sold yet"
              message="Once orders come in, your best sellers rank here."
            />
          ) : (
            <ol className={local.rankList}>
              {metrics.topProducts.map((product, i) => (
                <li key={product.name}>
                  <span className={local.rankIndex}>{i + 1}</span>
                  <span className={local.rankName}>{product.name}</span>
                  <span className={local.rankValue}>
                    {product.units} units
                    <small>{inr(product.revenue)}</small>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* ---- Stock + catalog ---- */}
      <div className={local.splitRow}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Stock alerts</span>
              <p className={styles.cardMeta}>{LOW_STOCK} units or fewer across variations</p>
            </div>
            <Link href="/myportal/products" className={local.cardLink}>
              Products <ArrowRight size={13} />
            </Link>
          </div>
          {metrics.lowStock.length === 0 ? (
            <EmptyState
              icon={<PackageCheck size={20} />}
              title="Stock looks healthy"
              message="No product is running low right now."
            />
          ) : (
            <ul className={local.alertList}>
              {metrics.lowStock.map(({ product, stock }) => (
                <li key={product.id}>
                  <span className={local.alertName}>
                    {product.name}
                    <small>{product.category.name}</small>
                  </span>
                  <span className={stock === 0 ? styles.badgeCrit : styles.badgeWarn}>
                    {stock === 0 ? "Out of stock" : `${stock} left`}
                  </span>
                  <Link
                    href={`/myportal/products/${product.id}`}
                    className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                  >
                    Restock
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Catalog &amp; content</span>
            <Link href="/myportal/products/new" className={local.cardLink}>
              <Plus size={13} /> New product
            </Link>
          </div>
          <div className={local.catalogGrid}>
            <CatalogTile
              href="/myportal/products"
              icon={<Package size={15} />}
              label="Products"
              value={counts.products}
            />
            <CatalogTile
              href="/myportal/categories"
              icon={<Shapes size={15} />}
              label="Categories"
              value={counts.categories}
            />
            <CatalogTile
              href="/myportal/tags"
              icon={<Tags size={15} />}
              label="Tags"
              value={counts.tags}
            />
            <CatalogTile
              href="/myportal/banners"
              icon={<GalleryVerticalEnd size={15} />}
              label="Banners"
              value={counts.banners}
            />
            <CatalogTile
              href="/myportal/gallery"
              icon={<Images size={15} />}
              label="Gallery"
              value={counts.gallery}
            />
            <CatalogTile
              icon={<Users size={15} />}
              label="Customers"
              value={counts.customers}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  footnote,
  spark,
  sparkLabel,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  footnote?: string;
  spark?: number[];
  sparkLabel?: string;
  tone?: "warn";
  href?: string;
}) {
  const body = (
    <>
      <span className={local.statHead}>
        <span className={tone === "warn" ? local.statIconWarn : local.statIcon}>{icon}</span>
        {label}
      </span>
      <strong className={local.statValue}>{value}</strong>
      {spark && spark.some((point) => point > 0) && (
        <Sparkline values={spark} label={sparkLabel ?? label} />
      )}
      {footnote && <span className={local.statFoot}>{footnote}</span>}
    </>
  );

  return href ? (
    <Link href={href} className={`${local.statTile} ${local.statTileLink}`}>
      {body}
    </Link>
  ) : (
    <div className={local.statTile}>{body}</div>
  );
}

function CatalogTile({
  href,
  icon,
  label,
  value,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  const body = (
    <>
      <span className={local.catalogIcon}>{icon}</span>
      <span className={local.catalogValue}>{value ?? "—"}</span>
      <span className={local.catalogLabel}>{label}</span>
    </>
  );

  return href ? (
    <Link href={href} className={`${local.catalogTile} ${local.catalogTileLink}`}>
      {body}
    </Link>
  ) : (
    <div className={local.catalogTile}>{body}</div>
  );
}
