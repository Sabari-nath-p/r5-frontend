"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Package } from "lucide-react";
import CoverImage from "../CoverImage";
import { sortedImages, type ApiProductImage } from "@/lib/api-types";
import styles from "./Gallery.module.css";

export default function Gallery({ images, name }: { images: ApiProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const ordered = sortedImages(images);

  if (ordered.length === 0) {
    return (
      <div className={styles.gallery}>
        <div className={styles.main}>
          <CoverImage src={undefined} alt={name} icon={Package} tone="blush" rounded="md" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {ordered.length > 1 && (
        <div className={styles.thumbs}>
          {ordered.map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={i === active ? styles.thumbActive : styles.thumb}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
            >
              <CoverImage src={image.url} alt={`${name} thumbnail ${i + 1}`} icon={Package} tone="lavender" rounded="sm" />
            </button>
          ))}
        </div>
      )}

      <div className={styles.main}>
        <CoverImage src={ordered[active].url} alt={name} icon={Package} tone="blush" rounded="md" />

        {ordered.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.navPrev}`}
              aria-label="Previous image"
              onClick={() => setActive((a) => (a === 0 ? ordered.length - 1 : a - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.navNext}`}
              aria-label="Next image"
              onClick={() => setActive((a) => (a === ordered.length - 1 ? 0 : a + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <button type="button" className={styles.expand} aria-label="Expand image">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
