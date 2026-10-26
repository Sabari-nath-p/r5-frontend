import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import CoverImage from "../CoverImage";
import type { ApiCategory } from "@/lib/api";
import styles from "./Categories.module.css";

const tones = ["lavender", "gold", "blush", "cream"] as const;

export default function Categories({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section id="categories" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <h2 className={`display ${styles.heading}`}>
            Shop by <span>Category</span>
          </h2>
          <a href="#" className={styles.link}>
            View All Categories <ArrowRight size={15} />
          </a>
        </div>

        <div className={styles.grid}>
          {categories.map((category, i) => (
            <Link href={`/category/${category.id}`} key={category.id} className={styles.card}>
              <div className={styles.imageWrap}>
                <CoverImage
                  src={category.image}
                  alt={category.name}
                  icon={Package}
                  tone={tones[i % tones.length]}
                  rounded="md"
                />
                <span className={styles.arrow}>
                  <ArrowRight size={14} />
                </span>
              </div>
              <h3>{category.name}</h3>
              {category.description && <p>{category.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
