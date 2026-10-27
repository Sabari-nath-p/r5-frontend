import { Flower2, Gift, NotebookPen } from "lucide-react";
import PlaceholderArt from "../PlaceholderArt";
import DoodleLayer from "../doodles/DoodleLayer";
import styles from "./Collections.module.css";

const collections = [
  {
    label: "Crochet",
    title: "Handmade Crochet Creations",
    icon: Flower2,
    tone: "lavender" as const,
  },
  {
    label: "Gifts",
    title: "Gifts that Speak from the Heart",
    icon: Gift,
    tone: "gold" as const,
  },
  {
    label: "Paper",
    title: "Creative Paper Goods",
    icon: NotebookPen,
    tone: "blush" as const,
  },
];

export default function Collections() {
  return (
    <section className={styles.section}>
      <DoodleLayer variant="collections" />
      <div className="container">
        <h2 className={`display ${styles.heading}`}>
          Explore Our <span>Collections</span>
        </h2>

        <div className={styles.grid}>
          {collections.map(({ label, title, icon, tone }) => (
            <a href="#" key={title} className={styles.card}>
              <PlaceholderArt icon={icon} tone={tone} rounded="md" decorative={false} />
              <div className={styles.overlay}>
                <span className={styles.label}>{label}</span>
                <h3>{title}</h3>
                <span className={styles.link}>
                  Shop Now <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
