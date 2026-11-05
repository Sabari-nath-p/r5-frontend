import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/*
 * Crochet is modelled rather than textured: every stitch is its own little
 * loop of yarn, laid row by row over a surface the way a real amigurumi is
 * worked. That is what gives the toy its bumpy silhouette and the deep gaps
 * between stitches, which a flat normal map cannot fake up close.
 */

/** A closed surface: u runs around a row (0–1), v runs from row to row (0–1). */
export type Surface = (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;

export type ColorFn = (p: THREE.Vector3, target: THREE.Color) => void;

type LatheOptions = {
  /** Squash the surface sideways (x) or front to back (z). */
  sx?: number;
  sz?: number;
  /** Radial multiplier, for scalloped hems and ribbed vases. */
  radial?: (theta: number, y: number) => number;
  /** Final tweak to each point, for shapes a lathe alone cannot make. */
  warp?: (p: THREE.Vector3, theta: number) => void;
};

/** Turns a [radius, height] profile into a surface, smoothed through the points. */
export function lathe(profile: [number, number][], options: LatheOptions = {}): Surface {
  const { sx = 1, sz = 1, radial, warp } = options;
  const curve = new THREE.CatmullRomCurve3(
    profile.map(([r, y]) => new THREE.Vector3(r, y, 0)),
    false,
    "centripetal"
  );
  const samples = curve.getSpacedPoints(160);

  return (u, v, out) => {
    const t = THREE.MathUtils.clamp(v, 0, 1) * 160;
    const i = Math.min(Math.floor(t), 159);
    const f = t - i;
    const r = Math.max(0, samples[i].x + (samples[i + 1].x - samples[i].x) * f);
    const y = samples[i].y + (samples[i + 1].y - samples[i].y) * f;
    const theta = u * Math.PI * 2;
    const scale = radial ? radial(theta, y) : 1;
    out.set(Math.cos(theta) * r * scale * sx, y, Math.sin(theta) * r * scale * sz);
    if (warp) warp(out, theta);
    return out;
  };
}

/** Profile of a sphere-ish ball, ready for lathe(). */
export function ballProfile(rx: number, ry: number, steps = 10): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    points.push([Math.max(Math.cos(a) * rx, 0.001), Math.sin(a) * ry]);
  }
  return points;
}

/** Height map of a twisted plied yarn turned into a tangent-space normal map. */
export function createYarnNormalMap(): THREE.DataTexture {
  const width = 256;
  const height = 64;
  const heights = new Float32Array(width * height);
  const plies = 5;

  // Fibres stray from the twist, seeded so every load renders the same yarn.
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const fibres = Array.from({ length: 48 }, () => ({
    x: random() * width,
    y: random() * height,
    amount: 0.05 + random() * 0.1,
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const phase = (x / width) * plies + (y / height) * 2;
      let h = Math.abs(Math.sin(phase * Math.PI));
      h = Math.pow(h, 0.55);
      for (const fibre of fibres) {
        const dx = Math.min(Math.abs(x - fibre.x), width - Math.abs(x - fibre.x));
        const dy = Math.min(Math.abs(y - fibre.y), height - Math.abs(y - fibre.y));
        if (dx < 22 && dy < 1.4) h += fibre.amount * (1 - dx / 22);
      }
      heights[y * width + x] = h;
    }
  }

  const data = new Uint8Array(width * height * 4);
  const at = (x: number, y: number) =>
    heights[((y + height) % height) * width + ((x + width) % width)];
  const strength = 2.4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * width + x) * 4;
      data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createYarnMaterial(normalMap: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
    normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    // Sheen is the soft halo cotton fuzz gets along its edges.
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xfff3e6),
  });
}

/** Tints a tube's vertices so yarn darkens where it dives under its neighbours. */
function bakeOcclusion(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const shade = 0.58 + 0.42 * THREE.MathUtils.smoothstep(position.getZ(i), -0.16, 0.26);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 0.97;
    colors[i * 3 + 2] = shade * 0.96;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** One single-crochet stitch: the V of the post plus the loop lying across its top. */
export function createStitchGeometry(detail: "high" | "low"): THREE.BufferGeometry {
  const tubular = detail === "high" ? 10 : 6;
  const radial = detail === "high" ? 6 : 4;
  const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  const post = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      v3(-0.5, 0.34, -0.12),
      v3(-0.3, 0.06, 0.2),
      v3(0, -0.42, 0.27),
      v3(0.3, 0.06, 0.2),
      v3(0.5, 0.34, -0.12),
    ]),
    tubular,
    0.25,
    radial
  );
  const top = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      v3(-0.62, 0.3, -0.1),
      v3(-0.28, 0.42, 0.22),
      v3(0.28, 0.42, 0.22),
      v3(0.62, 0.3, -0.1),
    ]),
    Math.ceil(tubular * 0.7),
    0.27,
    radial
  );

  const merged = mergeGeometries([post, top]);
  post.dispose();
  top.dispose();
  bakeOcclusion(merged);
  return merged;
}

type AddOptions = {
  color: THREE.ColorRepresentation | ColorFn;
  /** Width of a stitch in scene units. Defaults to the batch size. */
  size?: number;
  matrix?: THREE.Matrix4;
  /** Skip the end caps of a surface, usually hidden inside something else. */
  from?: number;
  to?: number;
};

const scratch = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  c: new THREE.Vector3(),
  p: new THREE.Vector3(),
  t: new THREE.Vector3(),
  b2: new THREE.Vector3(),
  n: new THREE.Vector3(),
  center: new THREE.Vector3(),
  color: new THREE.Color(),
  matrix: new THREE.Matrix4(),
  scale: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  twist: new THREE.Quaternion(),
};

/**
 * Collects stitched surfaces that move together into a single draw call, along
 * with a dark solid underlay. The underlay fills the gaps between stitches and
 * casts the shadows, so the thousands of stitches never enter the shadow pass.
 */
export class StitchBatch {
  private matrices: number[] = [];
  private colors: number[] = [];
  private underlays: THREE.BufferGeometry[] = [];
  private seed = 1;

  constructor(
    private readonly stitch: THREE.BufferGeometry,
    private readonly material: THREE.Material,
    private readonly underlayMaterial: THREE.Material,
    private readonly stitchSize: number
  ) {}

  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  add(surface: Surface, options: AddOptions) {
    const { matrix, from = 0.002, to = 0.998 } = options;
    const size = options.size ?? this.stitchSize;
    const colorFn: ColorFn =
      typeof options.color === "function"
        ? options.color
        : ((fixed) => (_p: THREE.Vector3, target: THREE.Color) => target.copy(fixed))(
            new THREE.Color(options.color)
          );

    const { a, b, c, p, t, b2, n, center, color, scale, quaternion, twist } = scratch;
    const rowHeight = size * 0.8;
    const e = 0.0015;

    // Decide once which way is "out": poles are too degenerate to judge alone.
    let outward = 0;
    for (let i = 0; i < 12; i++) {
      const u = i / 12;
      center.set(0, 0, 0);
      for (let j = 0; j < 12; j++) center.add(surface(j / 12, 0.5, a));
      center.multiplyScalar(1 / 12);
      surface(u, 0.5, p);
      t.subVectors(surface(u + e, 0.5, a), surface(u - e, 0.5, b));
      b2.subVectors(surface(u, 0.5 + e, a), surface(u, 0.5 - e, b));
      n.crossVectors(t, b2);
      outward += n.dot(a.subVectors(p, center));
    }
    const flip = outward < 0 ? -1 : 1;

    let v = from;
    let row = 0;
    while (v < to) {
      // Space rows by real distance, so stitches stay square on any shape.
      let speed = 0;
      for (let i = 0; i < 8; i++) {
        speed += a.subVectors(surface(i / 8, v + e, b), surface(i / 8, v - e, c)).length();
      }
      speed = speed / 8 / (2 * e);

      // Likewise around the row: u is not arc length on a squashed ellipse.
      const samples = 48;
      const arcs = new Float32Array(samples + 1);
      surface(0, v, a);
      for (let i = 1; i <= samples; i++) {
        surface(i / samples, v, b);
        arcs[i] = arcs[i - 1] + a.distanceTo(b);
        a.copy(b);
      }
      const circumference = arcs[samples];
      const count = Math.max(Math.round(circumference / size), 3);
      const width = circumference / count;
      const phase = row % 2 === 0 ? 0 : 0.5;

      if (circumference > size * 0.35) {
        let cursor = 0;
        for (let i = 0; i < count; i++) {
          const target = ((i + phase) / count) * circumference;
          while (cursor < samples - 1 && arcs[cursor + 1] < target) cursor++;
          const span = arcs[cursor + 1] - arcs[cursor] || 1;
          const u = (cursor + (target - arcs[cursor]) / span) / samples;

          surface(u, v, p);
          t.subVectors(surface(u + e, v, a), surface(u - e, v, b)).normalize();
          b2.subVectors(surface(u, v + e, a), surface(u, v - e, b)).normalize();
          n.crossVectors(t, b2);
          if (n.lengthSq() < 1e-6) continue;
          n.normalize();
          if (flip < 0) {
            n.negate();
            t.negate();
          }
          b2.crossVectors(n, t).normalize();

          // Hand-made means uneven: tension and angle drift a little per stitch.
          scratch.matrix.makeBasis(t, b2, n);
          quaternion.setFromRotationMatrix(scratch.matrix);
          twist.setFromAxisAngle(n, (this.random() - 0.5) * 0.14);
          quaternion.premultiply(twist);
          const tension = 0.97 + this.random() * 0.08;
          scale.set(
            Math.min(width, size * 1.25) * 1.02 * tension,
            rowHeight * 1.34 * tension,
            size * 0.92
          );
          p.addScaledVector(n, size * 0.02 * (this.random() - 0.5));

          colorFn(p, color);
          const drift = 0.965 + this.random() * 0.07;

          scratch.matrix.compose(p, quaternion, scale);
          if (matrix) scratch.matrix.premultiply(matrix);
          this.matrices.push(...scratch.matrix.elements);
          this.colors.push(color.r * drift, color.g * drift, color.b * drift);
        }
      }

      v += rowHeight / Math.max(speed, 0.001);
      row++;
    }

    this.underlays.push(this.buildUnderlay(surface, colorFn, size, flip, matrix));
  }

  private buildUnderlay(
    surface: Surface,
    colorFn: ColorFn,
    size: number,
    flip: number,
    matrix?: THREE.Matrix4
  ) {
    const { a, b, p, t, b2, n, color } = scratch;
    const segU = 40;
    const segV = 28;
    const e = 0.002;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j <= segV; j++) {
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        const v = j / segV;
        surface(u, v, p);
        t.subVectors(surface(u + e, v, a), surface(u - e, v, b));
        b2.subVectors(
          surface(u, Math.min(v + e, 1), a),
          surface(u, Math.max(v - e, 0), b)
        );
        n.crossVectors(t, b2);
        if (n.lengthSq() > 1e-10) p.addScaledVector(n.normalize(), -flip * size * 0.2);
        colorFn(p, color);
        if (matrix) p.applyMatrix4(matrix);
        positions.push(p.x, p.y, p.z);
        colors.push(color.r * 0.46, color.g * 0.42, color.b * 0.44);
      }
    }
    for (let j = 0; j < segV; j++) {
      for (let i = 0; i < segU; i++) {
        const k = j * (segU + 1) + i;
        indices.push(k, k + segU + 1, k + 1, k + 1, k + segU + 1, k + segU + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    const count = this.colors.length / 3;

    const mesh = new THREE.InstancedMesh(this.stitch, this.material, count);
    mesh.instanceMatrix.array.set(this.matrices);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.colors), 3);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);

    const merged = mergeGeometries(this.underlays);
    this.underlays.forEach((geometry) => geometry.dispose());
    const underlay = new THREE.Mesh(merged, this.underlayMaterial);
    underlay.castShadow = true;
    underlay.receiveShadow = true;
    group.add(underlay);

    return group;
  }
}

/** A length of yarn as a tube, with its UVs stretched to keep the twist even. */
export function yarnTube(
  points: THREE.Vector3[],
  radius: number,
  color: THREE.ColorRepresentation,
  tubular = 40,
  radial = 6,
  closed = false
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const geometry = new THREE.TubeGeometry(curve, tubular, radius, radial, closed);
  const uv = geometry.getAttribute("uv");
  const repeat = curve.getLength() / (radius * 8);
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeat);

  const tint = new THREE.Color(color);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
