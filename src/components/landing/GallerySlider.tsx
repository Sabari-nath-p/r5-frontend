"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import CoverImage from "../CoverImage";
import type { ApiGalleryImage } from "@/lib/api-types";
import styles from "./GallerySlider.module.css";

export default function GallerySlider({ images }: { images: ApiGalleryImage[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  const current = images[active];
  const slide = (
    <CoverImage src={current.url} alt="" icon={ImageIcon} tone="lavender" rounded="sm" />
  );

  return (
    <section className={styles.section}>
      <div className={styles.slide}>
        {current.redirectUrl ? (
          <a href={current.redirectUrl} className={styles.slideLink} aria-label="Open slide link">
            {slide}
          </a>
        ) : (
          slide
        )}

        {images.length > 1 && (
          <>
            <div className={styles.controls}>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => setActive((a) => (a === 0 ? images.length - 1 : a - 1))}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => setActive((a) => (a + 1) % images.length)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className={styles.dots} aria-hidden="true">
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  className={i === active ? styles.dotActive : undefined}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
