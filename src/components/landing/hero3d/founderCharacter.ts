import * as THREE from "three";

/*
 * The founder as a 3D cartoon, from layers built by scripts/founder-avatar. Each
 * layer is a relief mesh in portrait pixels, wearing its own artwork. Head and
 * hair share one rig: a vertex weight blends each point between the torso and
 * the turning head, so long hair bends with her rather than splitting from it.
 * Eyes are drawn live, on lid curves fitted to the portrait, so they look and blink.
 */

const ASSETS = "/images/founder";
/** Portrait pixels per scene unit. */
const PX = 100;

type Rect = [number, number, number, number];
type LayerInfo = { rect: Rect; step: number; cols: number; rows: number; offset: number };
type EyeInfo = {
  origin: [number, number];
  axis: [number, number];
  half: number;
  upSign: number;
  upper: number[];
  lower: number[];
  iris: [number, number];
  radius: number;
};
type Manifest = {
  size: [number, number];
  cx: number;
  jaw: number;
  headTop: number;
  pivot: [number, number, number];
  rimZ: number;
  layers: Record<"back" | "body" | "head" | "hair", LayerInfo>;
  eyes: EyeInfo[];
};

export type FounderCharacter = {
  object: THREE.Group;
  torso: THREE.Group;
  /** Figure height in scene units, from the top of her hair to the portrait's edge. */
  height: number;
  /** Where her head sits, in the character's own space. */
  headAnchor: THREE.Vector3;
  setHeadPose: (yaw: number, pitch: number, roll: number) => void;
  setGaze: (x: number, y: number) => void;
  setBlink: (amount: number) => void;
  setTime: (seconds: number) => void;
  dispose: () => void;
};

const VERTEX = /* glsl */ `
  attribute float aWeight;
  uniform mat4 uHead;
  uniform float uTime;
  uniform float uSway;
  varying vec2 vUv;
  varying vec3 vNormalNow;
  varying vec3 vNormalRest;

  void main() {
    vUv = uv;
    vec3 p = position;
    vec3 turned = (uHead * vec4(p, 1.0)).xyz;
    vec3 blended = mix(p, turned, aWeight);
    // The lower the hair, the more it drifts.
    float loose = (1.0 - aWeight) * uSway;
    blended.x += sin(uTime * 0.9 + position.y * 0.9) * 0.05 * loose;
    blended.z += sin(uTime * 0.7 + position.x * 0.8) * 0.04 * loose;
    vec3 n = normalize(mix(normal, mat3(uHead) * normal, aWeight));
    vNormalRest = normal;
    vNormalNow = normalMatrix * n;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(blended, 1.0);
  }
`;

/** Shading as a ratio against the rest pose: exactly 1 until a surface actually turns. */
const RELIGHT = /* glsl */ `
  float relight(vec3 now, vec3 rest) {
    const vec3 light = vec3(-0.3, 0.42, 0.86);
    float lit = 0.62 + 0.38 * max(dot(normalize(now), light), 0.0);
    float base = 0.62 + 0.38 * max(dot(normalize(rest), light), 0.0);
    return clamp(lit / base, 0.8, 1.06);
  }
`;

const LAYER_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec3 vNormalNow;
  varying vec3 vNormalRest;
  ${RELIGHT}
  void main() {
    vec4 color = texture2D(map, vUv);
    if (color.a < 0.004) discard;
    gl_FragColor = vec4(color.rgb * relight(vNormalNow, vNormalRest), color.a);
    #include <colorspace_fragment>
  }
`;

function eyeShader(eye: EyeInfo, index: number): string {
  const f = (n: number) => n.toFixed(5);
  const poly = (c: number[]) =>
    `(${f(c[0])} + u * (${f(c[1])} + u * (${f(c[2])} + u * (${f(c[3])} + u * ${f(c[4])}))))`;
  return /* glsl */ `
    vec3 drawEye${index}(vec3 color, vec2 photo) {
      vec2 r = photo - vec2(${f(eye.origin[0])}, ${f(eye.origin[1])});
      vec2 axis = vec2(${f(eye.axis[0])}, ${f(eye.axis[1])});
      float u = clamp(dot(r, axis) / ${f(eye.half)}, -1.0, 1.0);
      float real = dot(r, axis) / ${f(eye.half)};
      float raw = dot(r, vec2(-axis.y, axis.x));
      float side = ${f(eye.upSign)};
      float v = raw * side;
      float upperOpen = ${poly(eye.upper)} * side;
      float lower = ${poly(eye.lower)} * side;
      float upper = mix(upperOpen, lower + 0.4, blink);
      float aa = fwidth(v) * 1.1;
      float within = step(abs(real), 1.0);
      float inside = within * smoothstep(-aa, aa, upper - v) * smoothstep(-aa, aa, v - lower);

      vec3 eye = mix(sclera, sclera * vec3(0.8, 0.75, 0.73), smoothstep(upper - 7.0, upper, v));
      vec2 centre = vec2(${f(eye.iris[0])}, ${f(eye.iris[1])}) + gaze * vec2(${f(eye.half * 0.3)}, ${f(eye.radius * 0.28)});
      float dist = length(photo - centre);
      float rAa = fwidth(dist) * 1.1;
      float radius = ${f(eye.radius * 1.03)};
      eye = mix(eye, irisDark, smoothstep(radius + rAa, radius - rAa, dist));
      eye = mix(eye, irisWarm, smoothstep(radius * 0.8 + rAa, radius * 0.8 - rAa, dist));
      eye = mix(eye, irisDark, smoothstep(radius * 0.5 + rAa, radius * 0.5 - rAa, dist));
      vec2 glint = centre + vec2(-radius * 0.34, -radius * 0.38);
      eye = mix(eye, vec3(1.0), smoothstep(radius * 0.26 + rAa, radius * 0.26 - rAa, length(photo - glint)));
      color = mix(color, eye, inside);

      // A clean lash line that travels with the lid, and a fine line under the eye.
      float thick = mix(2.8, 6.4, smoothstep(-0.5, 0.9, real));
      float lash = step(abs(real), 1.04) * smoothstep(-aa, aa, v - upper) * smoothstep(-aa, aa, upper + thick - v);
      color = mix(color, lashColor, lash);
      float under = within * (1.0 - blink) * smoothstep(1.1 + aa, 1.1 - aa, abs(v - lower));
      return mix(color, lashColor, under * 0.55);
    }
  `;
}

function buildGeometry(
  info: LayerInfo,
  depths: ArrayBuffer,
  manifest: Manifest,
  axisY: number,
  cameraDistance: number,
  weightAt: (py: number) => number
) {
  const [x0, y0, x1, y1] = info.rect;
  const grid = new Int16Array(depths, info.offset, info.cols * info.rows);
  const [width, height] = manifest.size;
  const count = info.cols * info.rows;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const weights = new Float32Array(count);
  for (let row = 0; row < info.rows; row++) {
    for (let col = 0; col < info.cols; col++) {
      const i = row * info.cols + col;
      const px = Math.min(x0 + col * info.step, width);
      const py = Math.min(y0 + row * info.step, height);
      const raw = grid[i];
      const z = (raw === -32768 ? manifest.rimZ : raw / 4) / PX;
      // Slid along the camera ray, so perspective reproduces the flat drawing at rest.
      const k = (cameraDistance - z) / cameraDistance;
      positions[i * 3] = ((px - manifest.cx) / PX) * k;
      positions[i * 3 + 1] = axisY + ((height - py) / PX - axisY) * k;
      positions[i * 3 + 2] = z;
      uvs[i * 2] = (px - x0) / (x1 - x0);
      uvs[i * 2 + 1] = (py - y0) / (y1 - y0);
      weights[i] = weightAt(py);
    }
  }
  const index: number[] = [];
  for (let row = 0; row < info.rows - 1; row++) {
    for (let col = 0; col < info.cols - 1; col++) {
      const a = row * info.cols + col;
      const [b, c, d] = [a + 1, a + info.cols, a + info.cols + 1];
      if ([a, b, c, d].some((i) => grid[i] === -32768)) continue;
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("aWeight", new THREE.BufferAttribute(weights, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export async function createFounderCharacter(
  anisotropy: number,
  cameraDistance: number,
  framing: number
): Promise<FounderCharacter> {
  const [manifest, depths] = await Promise.all([
    fetch(`${ASSETS}/avatar.json`).then((r) => r.json() as Promise<Manifest>),
    fetch(`${ASSETS}/avatar.bin`).then((r) => r.arrayBuffer()),
  ]);
  const loader = new THREE.TextureLoader();
  const load = async (name: string) => {
    const texture = await loader.loadAsync(`${ASSETS}/${name}.webp`);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };
  const [backMap, bodyMap, headMap, hairMap] = await Promise.all([
    load("back"),
    load("body"),
    load("head"),
    load("hair"),
  ]);

  const [, height] = manifest.size;
  const figureHeight = (height - manifest.headTop) / PX;
  const axisY = figureHeight / framing / 2;
  const { jaw } = manifest;

  const pivot = new THREE.Vector3(0, (height - manifest.pivot[1]) / PX, manifest.pivot[2] / PX);
  const shared = {
    uHead: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
  };

  const layer = (
    info: LayerInfo,
    map: THREE.Texture,
    weightAt: (py: number) => number,
    sway: number,
    order: number
  ) => {
    const mesh = new THREE.Mesh(
      buildGeometry(info, depths, manifest, axisY, cameraDistance, weightAt),
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: LAYER_FRAGMENT,
        uniforms: { ...shared, uSway: { value: sway }, map: { value: map } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    return mesh;
  };

  const hairWeight = (py: number) => 1 - smooth(jaw - 80, jaw + 190, py);
  const back = layer(manifest.layers.back, backMap, hairWeight, 0, 1);
  const body = layer(manifest.layers.body, bodyMap, (py) => 0.4 * (1 - smooth(jaw - 40, jaw + 90, py)), 0, 2);
  const hair = layer(manifest.layers.hair, hairMap, hairWeight, 1, 4);

  const faceUniforms = {
    ...shared,
    uSway: { value: 0 },
    map: { value: headMap },
    headRect: {
      value: new THREE.Vector4(
        manifest.layers.head.rect[0],
        manifest.layers.head.rect[1],
        manifest.layers.head.rect[2] - manifest.layers.head.rect[0],
        manifest.layers.head.rect[3] - manifest.layers.head.rect[1]
      ),
    },
    gaze: { value: new THREE.Vector2() },
    blink: { value: 0 },
    sclera: { value: new THREE.Color("#f8f1ea") },
    irisDark: { value: new THREE.Color("#1c0e09") },
    irisWarm: { value: new THREE.Color("#4b2a19") },
    lashColor: { value: new THREE.Color("#120a08") },
  };
  const head = new THREE.Mesh(
    buildGeometry(manifest.layers.head, depths, manifest, axisY, cameraDistance, () => 1),
    new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec4 headRect;
        uniform vec2 gaze;
        uniform float blink;
        uniform vec3 sclera, irisDark, irisWarm, lashColor;
        varying vec2 vUv;
        varying vec3 vNormalNow;
        varying vec3 vNormalRest;
        ${RELIGHT}
        ${manifest.eyes.map(eyeShader).join("\n")}
        void main() {
          vec4 color = texture2D(map, vUv);
          if (color.a < 0.004) discard;
          vec2 photo = headRect.xy + vUv * headRect.zw;
          vec3 rgb = drawEye1(drawEye0(color.rgb, photo), photo);
          gl_FragColor = vec4(rgb * relight(vNormalNow, vNormalRest), color.a);
          #include <colorspace_fragment>
        }
      `,
      uniforms: faceUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    })
  );
  head.renderOrder = 3;
  head.frustumCulled = false;

  const torso = new THREE.Group();
  torso.add(back, body, head, hair);
  const object = new THREE.Group();
  object.add(torso);

  const euler = new THREE.Euler();
  const rotation = new THREE.Matrix4();
  const toPivot = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z);
  const fromPivot = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);

  return {
    object,
    torso,
    height: figureHeight,
    headAnchor: new THREE.Vector3(0, (height - manifest.eyes[0].iris[1]) / PX, 0),
    setHeadPose: (yaw, pitch, roll) => {
      rotation.makeRotationFromEuler(euler.set(pitch, yaw, roll, "YXZ"));
      shared.uHead.value.copy(toPivot).multiply(rotation).multiply(fromPivot);
    },
    setGaze: (x, y) => faceUniforms.gaze.value.set(x, y),
    setBlink: (amount) => {
      faceUniforms.blink.value = amount;
    },
    setTime: (seconds) => {
      shared.uTime.value = seconds;
    },
    dispose: () => {
      for (const mesh of [back, body, head, hair]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      [backMap, bodyMap, headMap, hairMap].forEach((texture) => texture.dispose());
    },
  };
}
