import * as THREE from "three";
import { createFounderCharacter } from "./founderCharacter";
import { createHeadline } from "./createHeadline";

/*
 * The hero's stage: the founder in front, the 3D headline behind her. She follows
 * the cursor; a little of it also shifts the camera, so the letters really sit
 * behind her. Scrolling turns her away toward the copy while the letters lift off.
 */

const CAMERA_DISTANCE = 34;
const HEADLINE_DEPTH = 6;
/** How much of the stage's height she fills. */
const FRAMING = 0.84;
/** The portrait's bottom edge sits this far below the frame, so no cut ever shows. */
const BOTTOM_OVERSHOOT = 0.25;
const MAX_LOOK_YAW = 0.42;
const MAX_LOOK_PITCH = 0.15;

export type FounderSceneHandle = {
  /** 0 at the top of the hero, 1 when the pinned scroll has finished. */
  setScroll: (progress: number) => void;
  /** The phone's tilt, -1..1 on each axis; steers her where there's no cursor. */
  setTilt: (x: number, y: number) => void;
  dispose: () => void;
};

type Options = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  onReady: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const damp = (current: number, target: number, rate: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export async function createFounderScene({ canvas, container, onReady }: Options): Promise<FounderSceneHandle> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const character = await createFounderCharacter(
    renderer.capabilities.getMaxAnisotropy(),
    CAMERA_DISTANCE,
    FRAMING
  );
  const headline = createHeadline();

  const scene = new THREE.Scene();
  headline.object.position.z = -HEADLINE_DEPTH;
  // The letters always draw first: everything of her sits in front of them.
  headline.object.traverse((node) => {
    node.renderOrder = -1;
  });
  scene.add(headline.object, character.object);
  const camera = new THREE.PerspectiveCamera(20, 1, 1, CAMERA_DISTANCE * 3);
  camera.position.z = CAMERA_DISTANCE;

  // --- Framing ---------------------------------------------------------------
  let viewHeight = 1;
  let viewWidth = 1;
  let stacked = false;
  let headlineY = 0;
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Tall enough to clear the headline, wide enough to keep her in on a phone.
    viewHeight = Math.max(character.height / FRAMING, (aspect < 0.8 ? 9.2 : 0) / aspect);
    viewWidth = viewHeight * aspect;
    camera.aspect = aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(viewHeight / 2 / CAMERA_DISTANCE));
    camera.updateProjectionMatrix();
    stacked = width < 900;
    const depthScale = (CAMERA_DISTANCE + HEADLINE_DEPTH) / CAMERA_DISTANCE;
    headline.layout(viewWidth * depthScale, viewHeight * depthScale, stacked);
    headlineY = headline.object.position.y;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // --- Input -----------------------------------------------------------------
  let scrollTarget = 0;
  let scrollNow = 0;
  const pointer = new THREE.Vector2();
  let pointerSeen = -Infinity;
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer.set(event.clientX, event.clientY);
    pointerSeen = performance.now();
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  const tilt = new THREE.Vector2();
  let tiltSeen = -Infinity;

  const look = { yaw: 0, pitch: 0, yawTarget: 0, pitchTarget: 0, gazeX: 0, gazeY: 0, sway: 0 };
  const headScreen = new THREE.Vector3();
  let nextBlink = 2000;
  let blinkStart = -1;

  // --- Loop ------------------------------------------------------------------
  const startedAt = performance.now();
  let last = startedAt;
  let frame = 0;
  let visible = true;
  let announced = false;

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    // The frame's timestamp can predate `last` after a slow start; never run time backwards.
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    const time = (now - startedAt) / 1000;

    scrollNow = damp(scrollNow, scrollTarget, 7, dt);
    const turn = easeInOut(clamp(scrollNow, 0, 1));
    const arrive = easeOutCubic(clamp(time / 1.1, 0, 1));

    if (now - pointerSeen > 3500 && now - tiltSeen < 2500) {
      // Tilted right, she looks right; tipped back toward the visitor, she looks up.
      look.yawTarget = tilt.x * MAX_LOOK_YAW;
      look.pitchTarget = tilt.y * MAX_LOOK_PITCH;
    } else if (now - pointerSeen > 3500) {
      // Nobody's steering (a still phone or mouse): she glances around by herself.
      look.yawTarget = Math.sin(time * 0.43) * 0.13 + Math.sin(time * 0.17) * 0.08;
      look.pitchTarget = Math.sin(time * 0.31) * 0.03;
    } else {
      const rect = container.getBoundingClientRect();
      character.object.localToWorld(headScreen.copy(character.headAnchor)).project(camera);
      const originX = rect.left + ((headScreen.x + 1) / 2) * rect.width;
      const originY = rect.top + ((1 - headScreen.y) / 2) * rect.height;
      look.yawTarget = clamp((pointer.x - originX) / (window.innerWidth * 0.42), -1, 1) * MAX_LOOK_YAW;
      look.pitchTarget = clamp((pointer.y - originY) / (window.innerHeight * 0.6), -1, 1) * MAX_LOOK_PITCH;
    }
    look.yaw = damp(look.yaw, look.yawTarget, 5, dt);
    look.pitch = damp(look.pitch, look.pitchTarget, 5, dt);

    // Eyes get there first, the way real ones do, then the head catches up.
    look.gazeX = damp(look.gazeX, clamp(look.yawTarget / MAX_LOOK_YAW - 0.5 * turn, -1, 1), 16, dt);
    look.gazeY = damp(look.gazeY, look.pitchTarget / MAX_LOOK_PITCH, 16, dt);
    character.setGaze(look.gazeX, look.gazeY);

    if (now - startedAt > nextBlink && blinkStart < 0) blinkStart = now;
    if (blinkStart >= 0) {
      const t = (now - blinkStart) / 190;
      character.setBlink(t >= 1 ? 0 : clamp(Math.sin(Math.PI * t) * 1.5, 0, 1));
      if (t >= 1) {
        blinkStart = -1;
        nextBlink = now - startedAt + 2400 + Math.random() * 3600;
      }
    }

    const breath = Math.sin(time * 1.25);
    character.setTime(time);
    character.torso.rotation.y = look.yaw * 0.16 - 0.16 * turn;
    character.setHeadPose(
      clamp(look.yaw * 0.84 - 0.22 * turn, -0.4, 0.4),
      look.pitch + breath * 0.004,
      -look.yaw * 0.08 + 0.04 * turn
    );

    const zoom = 1 + 0.1 * turn;
    character.object.scale.setScalar(zoom);
    character.object.position.y =
      -viewHeight / 2 - BOTTOM_OVERSHOOT * zoom + breath * 0.012 - (1 - arrive) * viewHeight * 0.1;

    // A touch of real parallax between her and the letters behind.
    camera.position.x = damp(camera.position.x, (look.yaw / MAX_LOOK_YAW) * 0.55, 4, dt);
    camera.position.y = damp(camera.position.y, -(look.pitch / MAX_LOOK_PITCH) * 0.25, 4, dt);
    headline.object.rotation.y = -look.yaw * 0.08;
    headline.object.rotation.x = look.pitch * 0.1 + 0.2 * turn;
    headline.object.position.y = headlineY + turn * viewHeight * 0.32;

    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      onReady();
    }
  };

  const syncLoop = () => {
    const shouldRun = visible && !document.hidden;
    if (shouldRun && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(render);
    } else if (!shouldRun && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncLoop();
  });
  intersection.observe(container);
  document.addEventListener("visibilitychange", syncLoop);
  syncLoop();

  return {
    setScroll: (progress) => {
      scrollTarget = progress;
    },
    setTilt: (x, y) => {
      tilt.set(x, y);
      tiltSeen = performance.now();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", syncLoop);
      character.dispose();
      headline.dispose();
      renderer.dispose();
    },
  };
}
