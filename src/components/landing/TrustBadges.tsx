import { Gift, Heart, Leaf, Sparkles, Truck } from "lucide-react";
import styles from "./TrustBadges.module.css";

const badges = [
  { icon: Heart, label: "100% Handmade with Love" },
  { icon: Leaf, label: "Eco-friendly Materials" },
  { icon: Sparkles, label: "Unique & One of a Kind" },
  { icon: Gift, label: "Perfect for Every Occasion" },
  { icon: Truck, label: "Safe & Reliable Delivery" },
];

export default function TrustBadges() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.row}`}>
        <Heart size={16} className={styles.deco} aria-hidden="true" />
        {badges.map(({ icon: Icon, label }) => (
          <div className={styles.badge} key={label}>
            <span className={styles.iconWrap}>
              <Icon size={20} strokeWidth={1.6} />
            </span>
            <p>{label}</p>
          </div>
        ))}
        <Heart size={16} className={styles.deco} aria-hidden="true" />
      </div>
    </section>
  );
}
