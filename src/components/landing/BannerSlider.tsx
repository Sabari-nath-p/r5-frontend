"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import CoverImage from "../CoverImage";
import type { ApiBanner } from "@/lib/api-types";
import styles from "./BannerSlider.module.css";

/**
 * The band right under the hero: promotional banner images managed in the
 * admin portal (/myportal/banners). Title, subtitle and button are optional —
 * a banner with none of them shows as a plain image.
 */
export default function BannerSlider({ banners }: { banners: ApiBanner[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[Math.min(active, banners.length - 1)];
  const hasCopy = Boolean(banner.title || banner.subtitle || banner.ctaText);

  const slide = (
    <>
      <CoverImage src={banner.image} alt={banner.title} icon={ImageIcon} tone="lavender" rounded="sm" />
      {hasCopy && (
        <div className={styles.copy}>
          {banner.title && <h2 className={`display ${styles.heading}`}>{banner.title}</h2>}
          {banner.subtitle && <p className={styles.lead}>{banner.subtitle}</p>}
          {banner.ctaText && (
            <span className={styles.cta}>
              {banner.ctaText} <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <section className={styles.section} aria-label="Promotions">
      <div className="container">
        <div className={styles.slide}>
          {banner.ctaLink ? (
            <a href={banner.ctaLink} className={styles.slideLink}>
              {slide}
            </a>
          ) : (
            slide
          )}

          {banners.length > 1 && (
            <>
              <div className={styles.controls}>
                <button
                  type="button"
                  aria-label="Previous banner"
                  onClick={() => setActive((a) => (a === 0 ? banners.length - 1 : a - 1))}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next banner"
                  onClick={() => setActive((a) => (a + 1) % banners.length)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className={styles.dots}>
                {banners.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className={i === active ? styles.dotActive : undefined}
                    aria-label={`Go to banner ${i + 1}`}
                    onClick={() => setActive(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
