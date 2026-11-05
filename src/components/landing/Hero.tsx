import Link from "next/link";
import HeroBubbles from "./HeroBubbles";
import HeroScene from "./HeroScene";
import type { ApiCategory } from "@/lib/api-types";
import styles from "./Hero.module.css";

export default function Hero({ categories }: { categories: ApiCategory[] }) {
  return (
    <HeroScene
      overlay={
        <>
          <HeroBubbles categories={categories} />
          <Link href="/shop" className={styles.cta}>
            Shop now
          </Link>
        </>
      }
    >
      {/* The 3D letters are the visible headline; this is what search engines and
          screen readers get, and what shows if 3D can't run. */}
      <h1 className={styles.headline}>Handmade crochet</h1>
    </HeroScene>
  );
}
