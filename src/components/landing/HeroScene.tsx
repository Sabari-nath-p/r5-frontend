"use client";

import { useEffect, useRef, useState } from "react";
import { Move3d } from "lucide-react";
import type { HeroSceneHandle } from "./hero3d/createHeroScene";
import styles from "./Hero.module.css";

/** Fired by anything that wants the bunny to celebrate, e.g. Add to Cart. */
export const HERO_CELEBRATE_EVENT = "r5:hero-celebrate";

function canRender3D(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  const probe = document.createElement("canvas");
  return Boolean(probe.getContext("webgl2"));
}

function pickQuality(): "high" | "low" {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return coarse || memory <= 4 || cores <= 4 ? "low" : "high";
}

/**
 * The hero's backdrop: the 3D set, loaded in its own chunk after first paint
 * and faded in over the cream hero. Visitors who prefer reduced motion, are
 * saving data or have no WebGL2 get the plain hero without it.
 */
export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [dragged, setDragged] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!canRender3D()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability is only known in the browser
      setOff(true);
      return;
    }

    // Made here rather than in JSX: Next keeps this page mounted across
    // navigations and re-runs the effect on return, and a canvas can never get
    // another WebGL context once its first has been destroyed.
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvas;

    let handle: HeroSceneHandle | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const { createHeroScene } = await import("./hero3d/createHeroScene");
        if (cancelled) return;
        container.appendChild(canvas);
        handle = createHeroScene({
          canvas,
          container,
          quality: pickQuality(),
          onReady: () => {
            canvas.classList.add(styles.canvasReady);
            setReady(true);
          },
        });
      } catch (error) {
        // The photograph is still there, so this only costs the visitor the extra.
        canvas.remove();
        setOff(true);
        console.warn("[hero] 3D scene unavailable:", error);
      }
    };

    // Wait for an idle moment so the scene never competes with the page's first paint.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1200 })
      : window.setTimeout(start, 300);

    const celebrate = () => handle?.celebrate();
    window.addEventListener(HERO_CELEBRATE_EVENT, celebrate);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.removeEventListener(HERO_CELEBRATE_EVENT, celebrate);
      handle?.dispose();
      canvas.remove();
      setReady(false);
    };
  }, []);

  return (
    <div
      className={`${styles.scene} ${off ? styles.sceneOff : ""}`}
      ref={containerRef}
      aria-hidden="true"
      onPointerDown={() => setDragged(true)}
    >
      {ready && !dragged && (
        <span className={styles.dragHint}>
          <Move3d size={15} strokeWidth={1.8} /> Drag to spin
        </span>
      )}
    </div>
  );
}
