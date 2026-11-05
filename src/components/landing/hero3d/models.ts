import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  StitchBatch,
  ballProfile,
  lathe,
  yarnTube,
  type ColorFn,
  type Surface,
} from "./yarn";

export const palette = {
  cream: "#f4e4cb",
  petal: "#6c3ab0",
  dress: "#7445bb",
  lilac: "#c9b2ea",
  gold: "#e89c0c",
  blush: "#f19aa6",
  innerEar: "#f6b7b4",
  white: "#fbf4e8",
  thread: "#2a1a1e",
};

export type Kit = {
  stitch: THREE.BufferGeometry;
  yarn: THREE.Material;
  underlay: THREE.Material;
  size: number;
};

const batchOf = (kit: Kit) => new StitchBatch(kit.stitch, kit.yarn, kit.underlay, kit.size);

const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(s, s, s)
  );

function addFlower(
  batch: StitchBatch,
  matrix: THREE.Matrix4,
  petalColor: string,
  centerColor: string,
  petals = 6,
  size = 0.075
) {
  const petal = lathe(ballProfile(0.2, 0.26, 8), { sz: 0.42 });
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const local = at(Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0, 0, 0, -a);
    batch.add(petal, { color: petalColor, size, matrix: matrix.clone().multiply(local) });
  }
  const center = lathe(ballProfile(0.13, 0.13, 6), { sz: 0.55 });
  batch.add(center, {
    color: centerColor,
    size: size * 0.8,
    matrix: matrix.clone().multiply(at(0, 0, 0.07)),
  });
}

export type Bunny = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  earLeft: THREE.Group;
  earRight: THREE.Group;
  armLeft: THREE.Group;
  armRight: THREE.Group;
};

/** The amigurumi hero: an upright-eared bunny in a purple dress. */
export function createBunny(kit: Kit): Bunny {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  // Dress and legs, one batch since they never move apart.
  const body = batchOf(kit);
  const skirt = lathe(
    [
      [1.1, 0.1],
      [1.12, 0.22],
      [1.0, 0.5],
      [0.76, 0.95],
      [0.57, 1.28],
      [0.48, 1.44],
      [0.28, 1.54],
      [0.02, 1.57],
    ],
    {
      sz: 0.94,
      // The scalloped hem real crochet dresses finish on.
      radial: (theta, y) => 1 + 0.055 * Math.cos(theta * 14) * Math.max(0, 1 - y / 0.42),
    }
  );
  body.add(skirt, { color: palette.dress });

  const collar = lathe(
    [
      [0.47, 1.39],
      [0.62, 1.42],
      [0.6, 1.5],
      [0.42, 1.55],
      [0.3, 1.56],
    ],
    { sz: 0.94 }
  );
  body.add(collar, { color: palette.white, size: kit.size * 0.72 });

  const legProfile = lathe(ballProfile(0.42, 0.37, 10), { sz: 1.32 });
  body.add(legProfile, { color: palette.cream, matrix: at(-0.5, 0.36, 0.92) });
  body.add(legProfile, { color: palette.cream, matrix: at(0.5, 0.36, 0.92) });

  const tail = lathe(ballProfile(0.27, 0.27, 8));
  body.add(tail, { color: palette.white, matrix: at(0, 0.6, -0.98), size: kit.size * 0.8 });

  addFlower(body, at(0.2, 0.92, 0.74, -0.28, 0.2, 0.2, 0.46), palette.gold, palette.white, 5, 0.042);
    torso.add(body.build());

  // Arms hang from the shoulder, so a wave only needs one rotation.
  const armProfile = lathe([
    [0.05, 0.02],
    [0.22, -0.04],
    [0.235, -0.36],
    [0.26, -0.72],
    [0.235, -0.92],
    [0.1, -1.03],
    [0.01, -1.05],
  ]);
  const armColor: ColorFn = (p, target) => {
    target.set(p.y > -0.52 ? palette.dress : palette.cream);
  };
  const makeArm = (side: 1 | -1) => {
    const group = new THREE.Group();
    group.position.set(side * 0.5, 1.28, 0.1);
    group.rotation.set(-0.38, 0, side * 0.78);
    const batch = batchOf(kit);
    batch.add(armProfile, { color: armColor });
    group.add(batch.build());
    torso.add(group);
    return group;
  };
  const armLeft = makeArm(-1);
  const armRight = makeArm(1);

  // Head, pivoting at the neck.
  const head = new THREE.Group();
  head.position.set(0, 1.46, 0);
  torso.add(head);

  const headCenter = new THREE.Vector3(0, 0.82, 0);
  const rx = 1.08;
  const ry = 0.94;
  const rz = 0.98;
  const facePoint = (x: number, y: number, lift = 0) => {
    const k = 1 - (x / rx) ** 2 - (y / ry) ** 2;
    const z = rz * Math.sqrt(Math.max(k, 0));
    return new THREE.Vector3(x, headCenter.y + y, z + lift);
  };

  const cheekL = facePoint(-0.58, -0.25);
  const cheekR = facePoint(0.58, -0.25);
  const cream = new THREE.Color(palette.cream);
  const blush = new THREE.Color(palette.blush);
  const headColor: ColorFn = (p, target) => {
    const d = Math.min(p.distanceTo(cheekL), p.distanceTo(cheekR));
    target.copy(cream).lerp(blush, THREE.MathUtils.smoothstep(0.24 - d, 0, 0.14) * 0.7);
  };

  const headBatch = batchOf(kit);
  const skull = lathe(ballProfile(rx, ry, 14), { sz: rz / rx });
  headBatch.add((u, v, out) => skull(u, v, out).add(headCenter), { color: headColor });
  head.add(headBatch.build());

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a0810,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const eyeGeometry = new THREE.SphereGeometry(0.15, 24, 18);
  const glintGeometry = new THREE.SphereGeometry(0.027, 10, 8);
  const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.copy(facePoint(side * 0.42, -0.02, 0.075));
    eye.scale.set(1, 1, 0.72);
    eye.castShadow = true;
    head.add(eye);

    // The catchlight is what makes safety eyes look alive at any viewing angle.
    const glint = new THREE.Mesh(glintGeometry, glintMaterial);
    glint.position.copy(eye.position).add(new THREE.Vector3(-0.05, 0.055, 0.092));
    head.add(glint);
  }

  const noseMaterial = new THREE.MeshPhysicalMaterial({
    color: palette.blush,
    roughness: 0.6,
    sheen: 1,
    sheenColor: new THREE.Color(0xffd9de),
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), noseMaterial);
  nose.position.copy(facePoint(0, -0.2, 0.065));
  nose.scale.set(1, 0.72, 0.6);
  head.add(nose);

  // Embroidered mouth, sewn on top of the stitches.
  const threadTubes = [
    [
      facePoint(-0.18, -0.34, 0.05),
      facePoint(-0.09, -0.42, 0.055),
      facePoint(0, -0.34, 0.06),
      facePoint(0.09, -0.42, 0.055),
      facePoint(0.18, -0.34, 0.05),
    ],
    [facePoint(0, -0.27, 0.055), facePoint(0, -0.34, 0.06)],
  ].map((points) => yarnTube(points, 0.018, palette.thread, 14, 5));
  const threads = new THREE.Mesh(mergeGeometries(threadTubes), kit.yarn);
  threadTubes.forEach((tube) => tube.dispose());
  head.add(threads);

  // Ears: a flattened lathe, cupped on the face side and lined in pink.
  const earProfile: [number, number][] = [
    [0.17, 0],
    [0.31, 0.32],
    [0.39, 0.82],
    [0.33, 1.32],
    [0.17, 1.72],
    [0.01, 1.86],
  ];
  const earWidthAt = (y: number) => {
    const t = THREE.MathUtils.clamp(y / 1.86, 0, 1);
    return Math.max(0.02, 0.39 * Math.sin(Math.PI * Math.pow(t, 0.72)) + 0.04);
  };
  const earSurface: Surface = lathe(earProfile, {
    sz: 0.46,
    warp: (p, theta) => {
      const s = Math.sin(theta);
      if (s > 0) {
        const c = Math.abs(Math.cos(theta));
        p.z *= c * c * 1.05 - 0.12;
      }
    },
  });
  const earCream = new THREE.Color(palette.cream);
  const earPink = new THREE.Color(palette.innerEar);
  const earColor: ColorFn = (p, target) => {
    const inner =
      p.z < 0.1 * earWidthAt(p.y) + 0.06 &&
      p.z > -0.09 &&
      Math.abs(p.x) < earWidthAt(p.y) * 0.66 &&
      p.y > 0.14 &&
      p.y < 1.6;
    target.copy(inner ? earPink : earCream);
  };
  const makeEar = (side: 1 | -1) => {
    const group = new THREE.Group();
    group.position.set(side * 0.44, headCenter.y + 0.72, -0.08);
    group.rotation.set(-0.1, 0, -side * 0.2);
    const batch = batchOf(kit);
    batch.add(earSurface, { color: earColor, size: kit.size * 0.86 });
    if (side === 1) {
      addFlower(batch, at(-0.04, 0.16, 0.2, -0.1, 0.1, 0.1, 0.82), palette.petal, palette.gold, 6, 0.07);
    }
    group.add(batch.build());
    head.add(group);
    return group;
  };
  const earLeft = makeEar(-1);
  const earRight = makeEar(1);

  return { root, torso, head, earLeft, earRight, armLeft, armRight };
}

/** Round studio plinth with a softly eased edge. */
export function createPlinth(radius: number, height: number): THREE.Mesh {
  const points = [
    new THREE.Vector2(0, -height),
    new THREE.Vector2(radius - 0.02, -height),
    new THREE.Vector2(radius, -height + 0.03),
    new THREE.Vector2(radius, -0.09),
    new THREE.Vector2(radius - 0.025, -0.03),
    new THREE.Vector2(radius - 0.09, 0),
    new THREE.Vector2(0, 0),
  ];
  const geometry = new THREE.LatheGeometry(points, 96);
  const material = new THREE.MeshPhysicalMaterial({
    color: "#c5aeea",
    roughness: 0.5,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xf3e8ff),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A ball of yarn: bundles of strands wound round in shifting directions. */
export function createYarnBall(
  radius: number,
  color: string,
  yarn: THREE.Material,
  detail: "high" | "low",
  seedStart = 3,
  tail?: THREE.Vector3[]
): THREE.Group {
  let seed = seedStart;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const strandRadius = radius * 0.056;
  const bundles = detail === "high" ? 13 : 11;
  const strandsPerBundle = 8;
  const base = new THREE.Color(color);
  const tubes: THREE.BufferGeometry[] = [];

  for (let b = 0; b < bundles; b++) {
    const orientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    );
    const layer = radius * (0.9 + (b / bundles) * 0.12);
    const shade = base.clone().multiplyScalar(0.86 + (b / bundles) * 0.18);
    for (let s = 0; s < strandsPerBundle; s++) {
      const tilt = (s - strandsPerBundle / 2) * strandRadius * 2.05;
      const ring = Math.sqrt(Math.max(layer * layer - tilt * tilt, 0.01));
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(a) * ring, tilt, Math.sin(a) * ring).applyQuaternion(
            orientation
          )
        );
      }
      tubes.push(yarnTube(points, strandRadius, shade, 44, 5, true));
    }
  }
  if (tail) tubes.push(yarnTube(tail, strandRadius, base, 60, 5));

  const group = new THREE.Group();
  const merged = mergeGeometries(tubes);
  tubes.forEach((tube) => tube.dispose());
  const mesh = new THREE.Mesh(merged, yarn);
  mesh.receiveShadow = true;
  group.add(mesh);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.92, 24, 18),
    new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.3), roughness: 1 })
  );
  core.castShadow = true;
  group.add(core);
  return group;
}

/** A kraft gift box tied in lilac satin. */
export function createGift(): THREE.Group {
  const group = new THREE.Group();
  const w = 1.7;
  const h = 1.15;
  const d = 1.5;

  const box = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 4, 0.04),
    new THREE.MeshStandardMaterial({ color: "#d9b98f", roughness: 0.82 })
  );
  box.position.y = h / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const satin = new THREE.MeshPhysicalMaterial({
    color: "#a98bdc",
    roughness: 0.36,
    sheen: 1,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color(0xeee0ff),
    side: THREE.DoubleSide,
  });

  const strapA = new THREE.Mesh(new RoundedBoxGeometry(0.24, h + 0.02, d + 0.02, 2, 0.008), satin);
  strapA.position.y = h / 2;
  const strapB = new THREE.Mesh(new RoundedBoxGeometry(w + 0.02, h + 0.02, 0.24, 2, 0.008), satin);
  strapB.position.y = h / 2;
  group.add(strapA, strapB);

  // Bow loops are flattened ribbons rather than round tubes.
  const loop = (side: number) => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(side * 0.28, 0.25, 0.05),
        new THREE.Vector3(side * 0.62, 0.26, 0),
        new THREE.Vector3(side * 0.6, 0.05, -0.02),
        new THREE.Vector3(side * 0.22, 0.03, -0.02),
        new THREE.Vector3(0, 0.02, 0),
      ],
      false
    );
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.1, 8), satin);
    mesh.scale.z = 1.4;
    mesh.position.y = h;
    mesh.castShadow = true;
    return mesh;
  };
  group.add(loop(1), loop(-1));

  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), satin);
  knot.position.y = h + 0.05;
  knot.scale.set(1, 0.8, 1);
  knot.castShadow = true;
  group.add(knot);

  return group;
}

/** Ribbed ceramic vase with a loose bunch of daisies and lavender. */
export function createBouquet(detail: "high" | "low"): {
  group: THREE.Group;
  sprigs: THREE.Group;
} {
  const group = new THREE.Group();
  let seed = 21;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const vaseSurface = lathe([
    [0.001, 0],
    [0.58, 0],
    [0.76, 0.34],
    [0.82, 0.8],
    [0.68, 1.3],
    [0.46, 1.62],
    [0.44, 1.78],
  ]);
  const segU = 96;
  const segV = 36;
  const positions: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= segV; j++) {
    for (let i = 0; i <= segU; i++) {
      vaseSurface(i / segU, j / segV, p);
      // Fluted ribs, fading out toward the neck.
      const fade = 1 - THREE.MathUtils.smoothstep(p.y, 1.2, 1.6);
      const rib = 1 + 0.028 * Math.abs(Math.sin((i / segU) * Math.PI * 14)) * fade;
      positions.push(p.x * rib, p.y, p.z * rib);
      if (j < segV && i < segU) {
        const k = j * (segU + 1) + i;
        indices.push(k, k + segU + 1, k + 1, k + 1, k + segU + 1, k + segU + 2);
      }
    }
  }
  const vaseGeometry = new THREE.BufferGeometry();
  vaseGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  vaseGeometry.setIndex(indices);
  vaseGeometry.computeVertexNormals();
  const vase = new THREE.Mesh(
    vaseGeometry,
    new THREE.MeshPhysicalMaterial({
      color: "#faf5ec",
      roughness: 0.46,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      side: THREE.DoubleSide,
    })
  );
  // It catches no shadows: the bunny's, thrown across glazed ceramic, read as a stain.
  vase.castShadow = true;
  group.add(vase);

  const sprigs = new THREE.Group();
  sprigs.position.y = 1.7;
  group.add(sprigs);

  const stemTubes: THREE.BufferGeometry[] = [];
  const daisyHeads: THREE.Matrix4[] = [];
  const budHeads: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
  const stems = detail === "high" ? 26 : 16;
  const lavender = [new THREE.Color("#7b4fc4"), new THREE.Color("#9a78d6")];

  for (let i = 0; i < stems; i++) {
    const a = random() * Math.PI * 2;
    const spread = 0.35 + random() * 1.25;
    const rise = 1.5 + random() * 1.9;
    const tip = new THREE.Vector3(Math.cos(a) * spread, rise, Math.sin(a) * spread * 0.7);
    const mid = new THREE.Vector3(tip.x * 0.32, rise * 0.55, tip.z * 0.32);
    stemTubes.push(
      yarnTube([new THREE.Vector3(tip.x * 0.04, -0.25, tip.z * 0.04), mid, tip], 0.012, "#7d8a4e", 10, 4)
    );

    if (i % 3 === 2) {
      // A lavender spike: small buds climbing the last stretch of stem.
      const up = tip.clone().sub(mid).normalize();
      for (let b = 0; b < 12; b++) {
        const along = tip.clone().addScaledVector(up, b * 0.042 - 0.12);
        const off = b * 2.4;
        along.x += Math.cos(off) * 0.04;
        along.z += Math.sin(off) * 0.04;
        budHeads.push({
          matrix: new THREE.Matrix4().compose(
            along,
            new THREE.Quaternion(),
            new THREE.Vector3(0.04, 0.052, 0.04)
          ),
          color: lavender[b % 2],
        });
      }
    } else {
      // Daisy heads face up and outward, toward the room.
      const facing = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(tip.x * 0.4, 0.75, 0.75 + tip.z * 0.25).normalize()
      );
      const s = 0.8 + random() * 0.55;
      daisyHeads.push(new THREE.Matrix4().compose(tip, facing, new THREE.Vector3(s, s, s)));
    }
  }

  const stemMesh = new THREE.Mesh(
    mergeGeometries(stemTubes),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
  );
  stemTubes.forEach((tube) => tube.dispose());
  sprigs.add(stemMesh);

  const petalsPerHead = 13;
  const petalGeometry = new THREE.SphereGeometry(1, 8, 6);
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    new THREE.MeshStandardMaterial({ color: "#fffaf1", roughness: 0.62, side: THREE.DoubleSide }),
    daisyHeads.length * petalsPerHead
  );
  const centers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.052, 10, 8),
    new THREE.MeshStandardMaterial({ color: palette.gold, roughness: 0.75 }),
    daisyHeads.length
  );
  const petalMatrix = new THREE.Matrix4();
  daisyHeads.forEach((head, h) => {
    centers.setMatrixAt(h, new THREE.Matrix4().multiplyMatrices(head, new THREE.Matrix4().makeScale(1, 0.6, 1)));
    for (let k = 0; k < petalsPerHead; k++) {
      const a = (k / petalsPerHead) * Math.PI * 2;
      petalMatrix.compose(
        new THREE.Vector3(Math.cos(a) * 0.105, 0.002, Math.sin(a) * 0.105),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a),
        new THREE.Vector3(0.082, 0.008, 0.033)
      );
      petals.setMatrixAt(h * petalsPerHead + k, new THREE.Matrix4().multiplyMatrices(head, petalMatrix));
    }
  });
  sprigs.add(petals, centers);

  const buds = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    budHeads.length
  );
  budHeads.forEach(({ matrix, color }, i) => {
    buds.setMatrixAt(i, matrix);
    buds.setColorAt(i, color);
  });
  sprigs.add(buds);

  return { group, sprigs };
}

/** A loose crocheted flower, the sort left beside a finished piece. */
export function createLooseFlower(kit: Kit, petal: string, center: string, scale: number): THREE.Group {
  const batch = batchOf(kit);
  addFlower(batch, new THREE.Matrix4(), petal, center, 6, 0.058);
  const group = batch.build();
  group.scale.setScalar(scale);
  group.rotation.x = -Math.PI / 2 + 0.06;
  return group;
}

