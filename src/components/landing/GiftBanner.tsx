import { Gift } from "lucide-react";
import PlaceholderArt from "../PlaceholderArt";
import styles from "./GiftBanner.module.css";

export default function GiftBanner() {
  return (
    <section id="gift-sets" className={styles.section}>
      <div className="container">
        <div className={styles.panel}>
          <span className={styles.blobA} aria-hidden="true" />
          <span className={styles.blobB} aria-hidden="true" />

          <div className={styles.copy}>
            <h2 className={`display ${styles.heading}`}>
              Thoughtful
              <br />
              Gifts
              <br />
              <span>for Every Occasion</span>
            </h2>
            <p className={styles.lead}>
              Birthdays, Anniversaries, Festive Hampers and more — because
              every moment deserves something special.
            </p>
            <a href="#" className={styles.cta}>
              Explore Gift Sets <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className={styles.visual}>
            <PlaceholderArt icon={Gift} tone="gold" rounded="md" decorative={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
