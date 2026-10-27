import { ChevronLeft, ChevronRight, Gift, Heart, Leaf, Truck } from "lucide-react";
import InstagramIcon from "../icons/InstagramIcon";
import DoodleLayer from "../doodles/DoodleLayer";
import styles from "./Hero.module.css";

const features = [
  { icon: Leaf, label: "Handmade with Care" },
  { icon: Heart, label: "Unique Designs" },
  { icon: Gift, label: "Perfect for Gifting" },
  { icon: Truck, label: "Worldwide Delivery" },
];

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M32 50C14 38 4 27 4 16.5 4 8.5 10.5 3 18 3c6 0 10 3.5 14 9 4-5.5 8-9 14-9 7.5 0 14 5.5 14 13.5 0 2.4-.6 4.7-1.7 7" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className={styles.hero}>
      <DoodleLayer variant="hero" />

      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={styles.overline}>
            Handmade Creations for a Brighter, Kinder World
          </p>

          <h1 className={`display ${styles.headline}`}>
            Crafted
            <br />
            <span className={styles.gold}>with</span>{" "}
            <span className={styles.purpleWrap}>
              <span className={styles.purple}>Love</span>
              <HeartDoodle className={styles.heartDoodle} />
            </span>
          </h1>

          <p className={styles.lead}>
            Unique crochet creations, thoughtful gifts and creative paper
            products — made to add warmth, joy and personality to your
            everyday moments.
          </p>

          <div className={styles.ctaRow}>
            <a href="#shop" className={styles.cta}>
              Shop Now <span aria-hidden="true">→</span>
            </a>

            <a
              href="https://www.instagram.com/YOUR_INSTAGRAM_USERNAME/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.instagramCta}
              aria-label="Follow R5atelier on Instagram"
            >
              <InstagramIcon size={19} />
              Follow on Instagram
            </a>
          </div>

          <ul className={styles.features}>
            {features.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={21} strokeWidth={1.8} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.visual}>
          <span className={styles.blobA} aria-hidden="true" />
          <span className={styles.blobB} aria-hidden="true" />

          <div className={styles.frame}>
            <div className={styles.circleArt} aria-hidden="true">
              <span className={`${styles.circle} ${styles.circleOutlineBig}`} />
              <span className={`${styles.circle} ${styles.circleBase}`} />
              <span className={`${styles.circle} ${styles.circleGold}`} />
              <span className={`${styles.circle} ${styles.circlePurple}`} />
              <span className={`${styles.circle} ${styles.circleBlush}`} />
              <span className={`${styles.circle} ${styles.circleOutlineSmall}`} />

              <span className={`${styles.iconCircle} ${styles.iconCircleHeart}`}>
                <Heart size={26} strokeWidth={1.6} />
              </span>

              <span className={`${styles.iconCircle} ${styles.iconCircleGift}`}>
                <Gift size={22} strokeWidth={1.6} />
              </span>
            </div>

            <div className={styles.messageBadge}>
              Small Things
              <strong>Big Happiness</strong>
            </div>

            <div className={styles.carouselControls}>
              <button type="button" aria-label="Previous slide">
                <ChevronLeft size={20} />
              </button>
              <button type="button" aria-label="Next slide">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className={styles.dots} aria-hidden="true">
              <span className={styles.dotActive} />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
