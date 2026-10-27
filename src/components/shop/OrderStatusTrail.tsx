import { Check, CircleX, ExternalLink } from "lucide-react";
import { ORDER_STAGES, ORDER_STATUS_LABELS, type ApiOrderStatus } from "@/lib/api-types";
import styles from "./OrderStatusTrail.module.css";

/**
 * The delivery journey, with everything up to the current stage marked done.
 * A cancelled order has no journey, so it gets its own notice instead.
 */
export default function OrderStatusTrail({
  status,
  trackingUrl,
  deliveryPartner,
}: {
  status: ApiOrderStatus;
  trackingUrl?: string | null;
  deliveryPartner?: string | null;
}) {
  if (status === "CANCELLED") {
    return (
      <div className={styles.cancelled}>
        <CircleX size={18} />
        <span>This order was cancelled.</span>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.indexOf(status);

  return (
    <div className={styles.wrap}>
      <ol className={styles.trail}>
        {ORDER_STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;

          return (
            <li
              key={stage}
              className={done ? styles.done : current ? styles.current : styles.todo}
            >
              <span className={styles.dot} aria-hidden="true">
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              <span className={styles.label}>{ORDER_STATUS_LABELS[stage]}</span>
            </li>
          );
        })}
      </ol>

      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.tracking}
        >
          Track with {deliveryPartner || "our courier"} <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
