import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createStitchGeometry, createYarnMaterial, createYarnNormalMap } from "./yarn";
import {
  createBouquet,
  createBunny,
  createGift,
  createLooseFlower,
  createPlinth,
  createYarnBall,
  palette,
  type Kit,
} from "./models";

export type HeroSceneHandle = {
  /** The bunny does a happy hop and spin, e.g. when something joins the cart. */
  celebrate: () => void;
  dispose: () => void;
};

type Options = {
  canvas: HTMLCanvasElement;
  /** Element the canvas fills; its size drives the renderer. */
  container: HTMLElement;
  /** Low-end devices get chunkier stitches and fewer triangles. */
  quality: "high" | "low";
  /** Fired after the first real frame is on screen. */
  onReady: () => void;
};

const PLINTH_HEIGHT = 0.62;
const FLOOR_Y = -PLINTH_HEIGHT;
/** How much of the set the camera keeps in frame, in scene units. */
const FIT_HEIGHT = 8.9;
const SET_HALF_WIDTH = 4.2;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const damp = (current: number, target: number, rate: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));

/** The sunlit back wall: window light and foliage shadow, softly out of focus. */
function createWallTexture(): THREE.CanvasTexture {
  // Painting small and scaling up is the blur: ctx.filter is missing in Safari.
  const small = document.createElement("canvas");
  small.width = 192;
  small.height = 96;
  const ctx = small.getContext("2d") as CanvasRenderingContext2D;

  const base = ctx.createLinearGradient(0, 0, 192, 0);
  base.addColorStop(0, "#f7eddf");
  base.addColorStop(0.55, "#f4e8d8");
  base.addColorStop(1, "#efe1d2");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 192, 96);

  // Window panes, thrown at an angle across the wall.
  ctx.save();
  ctx.transform(1, 0, -0.42, 1, 42, 0);
  ctx.fillStyle = "rgba(255, 250, 240, 0.8)";
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      ctx.fillRect(14 + col * 27, 6 + row * 34, 23, 30);
    }
  }
  ctx.restore();

  // Leaf shadows drift over the lit side.
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = "rgba(150, 118, 118, 0.045)";
  for (let i = 0; i < 46; i++) {
    const x = 62 + random() * 70;
    const y = 14 + random() * 62;
    ctx.beginPath();
    ctx.ellipse(x, y, 1.5 + random() * 3, 0.8 + random() * 1.4, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const out = canvas.getContext("2d") as CanvasRenderingContext2D;
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = "high";
  out.drawImage(small, 0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The lilac arch, brighter where the window light lands and dappled by leaves. */
function createArchTexture(): THREE.CanvasTexture {
  const small = document.createElement("canvas");
  small.width = 96;
  small.height = 128;
  const ctx = small.getContext("2d") as CanvasRenderingContext2D;
  const base = ctx.createLinearGradient(0, 0, 96, 128);
  base.addColorStop(0, "#e6daf4");
  base.addColorStop(0.55, "#d6c5ec");
  base.addColorStop(1, "#c6b2e2");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 96, 128);

  let seed = 29;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = "rgba(92, 62, 140, 0.05)";
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.ellipse(
      4 + random() * 44,
      24 + random() * 92,
      1.5 + random() * 3.2,
      0.8 + random() * 1.5,
      random() * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 512;
  const out = canvas.getContext("2d") as CanvasRenderingContext2D;
  out.imageSmoothingQuality = "high";
  out.drawImage(small, 0, 0, 384, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A polished cream tabletop that fades into the wall at the far edge. */
function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#f1e4d6");
  gradient.addColorStop(0.06, "#f9f1e6");
  gradient.addColorStop(1, "#fdf8f0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSoftDiscTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createHeroScene({ canvas, container, quality, onReady }: Options): HeroSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f6ecdf");

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.72;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(25, 2, 0.5, 80);

  // --- Studio set ---------------------------------------------------------
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(52, 26),
    new THREE.MeshBasicMaterial({ map: createWallTexture(), toneMapped: false })
  );
  wall.position.set(-1, FLOOR_Y + 13, -7);
  scene.add(wall);

  const arch = new THREE.Mesh(
    (() => {
      const shape = new THREE.Shape();
      const w = 3.9;
      shape.moveTo(-w, 0);
      shape.lineTo(-w, 6);
      shape.absarc(0, 6, w, Math.PI, 0, true);
      shape.lineTo(w, 0);
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape, 64);
      // ShapeGeometry's UVs are raw coordinates; fit them to the painted texture.
      const uv = geometry.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) + w) / (w * 2), uv.getY(i) / (6 + w));
      }
      return geometry;
    })(),
    new THREE.MeshBasicMaterial({ map: createArchTexture(), toneMapped: false })
  );
  arch.position.set(1.15, FLOOR_Y, -6.96);
  scene.add(arch);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 34),
    new THREE.MeshBasicMaterial({ map: createFloorTexture(), toneMapped: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, 10);
  scene.add(floor);

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 34),
    new THREE.ShadowMaterial({ color: "#5a3a55", opacity: 0.3 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.set(0, FLOOR_Y + 0.004, 10);
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const softDisc = createSoftDiscTexture();
  const addContactShadow = (x: number, z: number, sx: number, sz: number, opacity: number) => {
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: "#4a2f55",
        alphaMap: softDisc,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, FLOOR_Y + 0.008, z);
    blob.scale.set(sx, sz, 1);
    scene.add(blob);
    return blob;
  };

  // --- Light: one warm window plus a cool, low fill -----------------------
  const key = new THREE.DirectionalLight("#fff2df", 3.1);
  key.position.set(-6.5, 10, 8);
  key.target.position.set(0.3, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(quality === "high" ? 2048 : 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 32;
  key.shadow.radius = 5;
  key.shadow.intensity = 0.72;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight("#efe6ff", 0.9);
  fill.position.set(7, 3, 6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight("#ffe7cc", 0.85);
  rim.position.set(3, 7, -8);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight("#fff8ee", "#e9dbe6", 1.05));

  // --- Props --------------------------------------------------------------
  const yarnNormal = createYarnNormalMap();
  const yarn = createYarnMaterial(yarnNormal);
  const underlay = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const stitch = createStitchGeometry(quality);
  const kit: Kit = {
    stitch,
    yarn,
    underlay,
    size: quality === "high" ? 0.118 : 0.15,
  };

  const stage = new THREE.Group();
  scene.add(stage);

  const plinth = createPlinth(2.15, PLINTH_HEIGHT);
  stage.add(plinth);
  addContactShadow(0.12, 0.05, 5.6, 5.0, 0.42);

  const bunny = createBunny(kit);
  stage.add(bunny.root);
  const bunnyContact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: "#3b2360",
      alphaMap: softDisc,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  bunnyContact.rotation.x = -Math.PI / 2;
  bunnyContact.position.set(0, 0.006, 0.18);
  bunnyContact.scale.set(3.0, 3.1, 1);
  stage.add(bunnyContact);

  const bouquet = createBouquet(quality);
  bouquet.group.position.set(2.75, FLOOR_Y, -1.9);
  stage.add(bouquet.group);
  addContactShadow(2.8, -1.85, 2.6, 2.1, 0.38);

  const gift = createGift();
  gift.position.set(-3.05, FLOOR_Y, -1.5);
  gift.rotation.y = 0.5;
  stage.add(gift);
  addContactShadow(-3.05, -1.5, 3.3, 3.0, 0.4);

  const ballGold = createYarnBall(0.62, palette.gold, yarn, quality, 5, [
    new THREE.Vector3(0.3, -0.45, 0.45),
    new THREE.Vector3(0.75, -0.6, 0.85),
    new THREE.Vector3(1.4, -0.61, 0.82),
    new THREE.Vector3(1.75, -0.61, 1.35),
  ]);
  ballGold.position.set(-2.75, FLOOR_Y + 0.62, 1.15);
  stage.add(ballGold);
  addContactShadow(-2.75, 1.15, 2.2, 1.9, 0.42);

  const ballLilac = createYarnBall(0.42, "#a785dd", yarn, quality, 17);
  ballLilac.position.set(2.6, FLOOR_Y + 0.42, 0.75);
  stage.add(ballLilac);
  addContactShadow(2.6, 0.75, 1.5, 1.3, 0.38);

  const flowerA = createLooseFlower(kit, palette.petal, palette.gold, 1.05);
  flowerA.position.set(0.55, FLOOR_Y + 0.1, 3.05);
  stage.add(flowerA);
  addContactShadow(0.55, 3.05, 1.5, 1.3, 0.3);

  const flowerB = createLooseFlower(kit, palette.gold, palette.white, 0.72);
  flowerB.position.set(-1.25, FLOOR_Y + 0.08, 3.1);
  flowerB.rotation.z = 0.8;
  stage.add(flowerB);
  addContactShadow(-1.25, 3.1, 1, 0.9, 0.28);

  // Stray fibres drifting in the window light.
  const fibreCount = quality === "high" ? 60 : 28;
  const fibrePositions = new Float32Array(fibreCount * 3);
  const fibreSeeds = new Float32Array(fibreCount);
  for (let i = 0; i < fibreCount; i++) {
    fibrePositions[i * 3] = Math.random() * 14 - 7;
    fibrePositions[i * 3 + 1] = Math.random() * 7 - 0.4;
    fibrePositions[i * 3 + 2] = Math.random() * 7 - 3;
    fibreSeeds[i] = Math.random() * 100;
  }
  const fibreGeometry = new THREE.BufferGeometry();
  fibreGeometry.setAttribute("position", new THREE.BufferAttribute(fibrePositions, 3));
  const fibres = new THREE.Points(
    fibreGeometry,
    new THREE.PointsMaterial({
      color: "#fff4d8",
      size: 0.07,
      alphaMap: softDisc,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  scene.add(fibres);

  // --- Framing ------------------------------------------------------------
  let width = 1;
  let height = 1;
  let baseDistance = 18;
  // Only ever lowered, by adapt(), so a resize can't undo a slow device's downgrade.
  let pixelRatio = Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.75 : 1.35);

  const resize = () => {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = aspect;

    const stacked = window.matchMedia("(max-width: 1023px)").matches;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitWidth = stacked ? 9.7 : 15.5;
    baseDistance = Math.max(FIT_HEIGHT / 2 / tan, fitWidth / 2 / tan / aspect);

    if (stacked) {
      camera.clearViewOffset();
      container.style.removeProperty("--hero-set-x");
    } else {
      // Beside the copy, the set starts just past where the text column ends.
      const pixelsPerUnit = height / (2 * tan * baseDistance);
      const copyEnd = Math.max(0, (width - 1280) / 2) + 24 + Math.min(530, width * 0.47);
      const center = Math.min(copyEnd + SET_HALF_WIDTH * pixelsPerUnit - 50, width * 0.72);
      camera.setViewOffset(width, height, width / 2 - center, 0, width, height);
      container.style.setProperty("--hero-set-x", `${center}px`);
    }
    camera.updateProjectionMatrix();
  };
  resize();

  // --- Interaction --------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // Drag to turn the piece, the way a 3D product viewer does.
  let dragging = false;
  let lastX = 0;
  let yaw = 0;
  let yawVelocity = 0;
  let releasedAt = -10;

  const onDragStart = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = "true";
  };
  const onDragMove = (event: PointerEvent) => {
    if (!dragging) return;
    const delta = (event.clientX - lastX) * 0.011;
    lastX = event.clientX;
    yaw += delta;
    yawVelocity = delta * 60;
  };
  const onDragEnd = () => {
    if (!dragging) return;
    dragging = false;
    releasedAt = clockTime;
    delete canvas.dataset.dragging;
  };
  canvas.addEventListener("pointerdown", onDragStart);
  canvas.addEventListener("pointermove", onDragMove);
  canvas.addEventListener("pointerup", onDragEnd);
  canvas.addEventListener("pointercancel", onDragEnd);

  // --- Animation ----------------------------------------------------------
  const INTRO = 1.9;
  let clockTime = 0;
  let celebrateAt = -10;
  let scrollDepth = 0;

  const props: { object: THREE.Object3D; delay: number; scale: number }[] = [
    { object: plinth, delay: 0, scale: 1 },
    { object: ballGold, delay: 0.55, scale: 1 },
    { object: ballLilac, delay: 0.68, scale: 1 },
    { object: gift, delay: 0.8, scale: 1 },
    { object: bouquet.group, delay: 0.42, scale: 1 },
    { object: flowerA, delay: 1.0, scale: 1.05 },
    { object: flowerB, delay: 1.1, scale: 0.72 },
  ];

  const update = (dt: number) => {
    clockTime += dt;
    const t = clockTime;

    pointer.x = damp(pointer.x, pointer.tx, 3.2, dt);
    pointer.y = damp(pointer.y, pointer.ty, 3.2, dt);

    for (const { object, delay, scale } of props) {
      const k = easeOutBack(clamp01((t - delay) / 0.75));
      object.scale.setScalar(Math.max(k, 0.0001) * scale);
    }

    // The bunny drops onto the plinth and settles with a soft squash.
    const drop = clamp01((t - 0.35) / 0.8);
    const dropY = (1 - easeOutCubic(drop)) * 5.2;
    const landed = clamp01((t - 0.95) / 0.7);
    const landingSquash = landed > 0 && landed < 1 ? Math.sin(landed * Math.PI) * (1 - landed) * 0.2 : 0;

    // Hop and full spin on celebrate().
    const c = clamp01((t - celebrateAt) / 1.15);
    const hop = c < 1 ? Math.sin(Math.min(c / 0.62, 1) * Math.PI) * 1.05 : 0;
    const spin = c < 1 ? easeOutCubic(c) * Math.PI * 2 : 0;
    const cSquash = c > 0.6 && c < 1 ? Math.sin(((c - 0.6) / 0.4) * Math.PI) * 0.1 : 0;

    const breathe = Math.sin(t * 1.5) * 0.009;
    const squash = landingSquash + cSquash;
    bunny.root.position.y = dropY + hop;
    bunny.root.scale.set(1 + squash * 0.7 - breathe * 0.4, 1 - squash + breathe, 1 + squash * 0.7 - breathe * 0.4);
    bunnyContact.scale.set(3.0 - hop * 0.9, 3.1 - hop * 0.9, 1);
    (bunnyContact.material as THREE.MeshBasicMaterial).opacity = Math.max(0.5 - dropY * 0.2 - hop * 0.3, 0);

    // Turntable: free while dragged, then an easy sway once left alone.
    if (!dragging) {
      yaw += yawVelocity * dt;
      yawVelocity = damp(yawVelocity, 0, 3, dt);
      if (t - releasedAt > 2.4) {
        const nearestFront = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
        yaw = damp(yaw, nearestFront, 1.1, dt);
      }
    }
    const sway = Math.sin(t * 0.42) * 0.17;
    bunny.root.rotation.y = yaw + sway + spin + 0.02;

    // Head looks toward the cursor; the ears lag behind it, like soft toys do.
    bunny.head.rotation.y = pointer.x * 0.34 - sway * 0.3;
    bunny.head.rotation.x = pointer.y * 0.13 + 0.02;
    bunny.head.rotation.z = Math.sin(t * 0.8) * 0.018 - pointer.x * 0.04;

    const twitch = Math.pow(Math.max(Math.sin(t * 0.73), 0), 40) * Math.sin(t * 24) * 0.09;
    const flop = -(pointer.x * 0.05) + hop * 0.1;
    bunny.earLeft.rotation.z = 0.2 + Math.sin(t * 1.1) * 0.016 + flop + hop * 0.25;
    bunny.earRight.rotation.z = -0.2 - Math.sin(t * 1.1 + 0.6) * 0.016 + flop + twitch - hop * 0.25;
    bunny.earLeft.rotation.x = -0.1 - pointer.y * 0.04 - hop * 0.2;
    bunny.earRight.rotation.x = -0.1 - pointer.y * 0.04 - hop * 0.2;

    const wave = c < 1 ? Math.sin(c * Math.PI) * 0.75 : 0;
    bunny.armLeft.rotation.z = -0.78 - Math.sin(t * 1.5) * 0.012 - wave;
    bunny.armRight.rotation.z = 0.78 + Math.sin(t * 1.5) * 0.012 + wave;

    bouquet.sprigs.rotation.z = Math.sin(t * 0.9) * 0.012;
    bouquet.sprigs.rotation.x = Math.sin(t * 0.7 + 1) * 0.009;

    ballGold.rotation.y = Math.sin(t * 0.3) * 0.05;

    const positions = fibreGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < fibreCount; i++) {
      const s = fibreSeeds[i];
      let y = positions.getY(i) + dt * (0.05 + (s % 1) * 0.06);
      if (y > 6.8) y = -0.4;
      positions.setY(i, y);
      positions.setX(i, positions.getX(i) + Math.sin(t * 0.4 + s) * dt * 0.05);
    }
    positions.needsUpdate = true;

    // A slow dolly-in on arrival, then parallax with the cursor and scroll.
    const dolly = 1 - easeOutCubic(clamp01(t / INTRO));
    const distance = baseDistance + dolly * 3.2 + scrollDepth * 1.8;
    camera.position.set(pointer.x * 0.75, 2.5 - pointer.y * 0.28 + scrollDepth * 0.5, distance);
    camera.lookAt(pointer.x * 0.1, 2.0, 0);
  };

  // --- Loop, kept honest about the device it is running on ----------------
  let frame = 0;
  let last = 0;
  let visible = true;
  let stopped = false;
  let firstFrame = true;
  let sampleTime = 0;
  let sampleFrames = 0;

  const adapt = (dt: number) => {
    sampleTime += dt;
    sampleFrames++;
    if (sampleTime < 2) return;
    const fps = sampleFrames / sampleTime;
    sampleTime = 0;
    sampleFrames = 0;
    if (fps >= 34) return;
    if (pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    } else if (renderer.shadowMap.enabled && fps < 26) {
      // Freeze the sun's shadow: the one cost left that resolution can't shed.
      renderer.shadowMap.autoUpdate = false;
    }
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (!visible || stopped) {
      last = now;
      return;
    }
    // Long gaps (a hidden tab, a stalled load) must not fast-forward the intro.
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      onReady();
    } else if (clockTime > INTRO) {
      adapt(dt);
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(container);

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  intersection.observe(container);

  const onVisibility = () => {
    stopped = document.hidden;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onScroll = () => {
    scrollDepth = clamp01(window.scrollY / Math.max(height, 1));
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  frame = requestAnimationFrame(tick);

  return {
    celebrate() {
      // Ignored mid-hop, so a burst of clicks can't restart it from the air.
      if (clockTime - celebrateAt > 1.15) celebrateAt = clockTime;
    },
    dispose() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      canvas.removeEventListener("pointerdown", onDragStart);
      canvas.removeEventListener("pointermove", onDragMove);
      canvas.removeEventListener("pointerup", onDragEnd);
      canvas.removeEventListener("pointercancel", onDragEnd);

      const textures = new Set<THREE.Texture>([yarnNormal, softDisc, environment]);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (object instanceof THREE.InstancedMesh) object.dispose();
        const materials = mesh.material
          ? Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          : [];
        for (const material of materials) {
          const map = (material as THREE.MeshBasicMaterial).map;
          if (map) textures.add(map);
          material.dispose();
        }
      });
      textures.forEach((texture) => texture.dispose());
      stitch.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
