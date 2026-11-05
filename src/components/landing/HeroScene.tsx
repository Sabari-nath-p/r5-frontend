"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import type { FounderSceneHandle } from "./hero3d/createFounderScene";
import styles from "./Hero.module.css";

function canRender3D(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  return Boolean(document.createElement("canvas").getContext("webgl2"));
}

/**
 * The pinned hero stage. Scroll (--p) and the cursor (--mx, --my) reach the scene
 * and the category bubbles through one element. The flat cut-out holds the spot
 * until the 3D version is ready, and stays for anyone who gets no 3D at all.
 */
export default function HeroScene({ children, overlay }: { children: ReactNode; overlay: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const figure = figureRef.current;
    if (!section || !stage || !figure) return;

    if (!canRender3D()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability is only known in the browser
      setOff(true);
      return;
    }

    // Made here rather than in JSX: Next keeps this page mounted across
    // navigations, and a canvas can't get a new context once its first is gone.
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvas;

    let handle: FounderSceneHandle | null = null;
    let cancelled = false;

    const readScroll = () => {
      const travel = section.offsetHeight - stage.offsetHeight;
      const pinnedAt = parseFloat(getComputedStyle(stage).top) || 0;
      const scrolled = pinnedAt - section.getBoundingClientRect().top;
      const progress = travel > 0 ? Math.min(Math.max(scrolled / travel, 0), 1) : 0;
      stage.style.setProperty("--p", progress.toFixed(4));
      handle?.setScroll(progress);
    };
    const readPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      stage.style.setProperty("--mx", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      stage.style.setProperty("--my", ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };
    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    window.addEventListener("pointermove", readPointer, { passive: true });

    const start = async () => {
      try {
        const { createFounderScene } = await import("./hero3d/createFounderScene");
        if (cancelled) return;
        figure.appendChild(canvas);
        const created = await createFounderScene({
          canvas,
          container: figure,
          onReady: () => {
            canvas.classList.add(styles.canvasReady);
            setReady(true);
          },
        });
        if (cancelled) {
          created.dispose();
          return;
        }
        handle = created;
        readScroll();
      } catch (error) {
        // The portrait is still on screen, so this only costs the visitor the extra.
        canvas.remove();
        setOff(true);
        console.warn("[hero] 3D founder unavailable:", error);
      }
    };

    // Wait for an idle moment so the scene never competes with the page's first paint.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1000 })
      : window.setTimeout(start, 250);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      window.removeEventListener("pointermove", readPointer);
      handle?.dispose();
      canvas.remove();
      setReady(false);
    };
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.hero} ${off ? styles.heroStatic : ""}`}>
      <div ref={stageRef} className={styles.stage} data-ready={ready || undefined}>
        {children}
        <div ref={figureRef} className={styles.figure} aria-hidden="true">
          <Image
            className={`${styles.poster} ${ready ? styles.posterHidden : ""}`}
            src="/images/founder/poster.webp"
            alt=""
            width={1254}
            height={1254}
            priority
            unoptimized
          />
        </div>
        {overlay}
      </div>
    </section>
  );
}
