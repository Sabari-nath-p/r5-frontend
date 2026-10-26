import { Camera, Image as ImageIcon } from "lucide-react";
import CoverImage from "../CoverImage";
import type { ApiGalleryImage } from "@/lib/api";
import styles from "./Gallery.module.css";

const tones = ["lavender", "gold", "blush", "cream"] as const;

export default function Gallery({ images }: { images: ApiGalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <div>
            <h2 className={`display ${styles.heading}`}>
              A Glimpse into <span>Our World</span>
            </h2>
            <p className={styles.sub}>
              Follow our journey, behind-the-scenes and happy customers.
            </p>
          </div>
          <a href="#" className={styles.cta}>
            <Camera size={15} />
            Follow on Instagram
          </a>
        </div>

        <div className={styles.grid}>
          {images.map((image, i) => {
            const tile = (
              <CoverImage
                src={image.url}
                alt="Gallery"
                icon={ImageIcon}
                tone={tones[i % tones.length]}
                rounded="sm"
              />
            );

            return (
              <div className={styles.tile} key={image.id}>
                {image.redirectUrl ? (
                  <a href={image.redirectUrl} aria-label="Open gallery link">
                    {tile}
                  </a>
                ) : (
                  tile
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
