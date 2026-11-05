import * as THREE from "three";
import glyphs from "./headlineGlyphs.json";

/*
 * "HANDMADE CROCHET" as real extruded letters, with each face worked in rows of
 * crochet stitches. The stitches are drawn by the shader, so they stay sharp at
 * any size, and melt into a flat colour once they'd be too small to read.
 */

type Word = { width: number; commands: (string | number)[][] };

const STITCH_ROWS = 11;
const DEPTH = 0.15;
const BEVEL = 0.012;

const CAP_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CAP_FRAGMENT = /* glsl */ `
  uniform float capHeight;
  uniform vec3 yarn, yarnLight, gap;
  varying vec3 vLocal;

  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
  }

  // One V of yarn: two strands meeting at the base of the stitch.
  float strand(vec2 p, vec2 a, vec2 b, out float along) {
    vec2 ab = b - a;
    along = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return smoothstep(0.235, 0.11, segment(p, a, b));
  }

  void main() {
    vec2 uv = vLocal.xy / capHeight * ${STITCH_ROWS.toFixed(1)};
    float row = floor(uv.y);
    vec2 cell = vec2(fract(uv.x * 1.15 + 0.5 * mod(row, 2.0)), fract(uv.y)) - 0.5;
    float a1, a2;
    float left = strand(cell, vec2(-0.34, 0.34), vec2(0.02, -0.3), a1);
    float right = strand(cell, vec2(0.34, 0.34), vec2(-0.02, -0.3), a2);
    float body = max(left, right);
    float along = left > right ? a1 : a2;
    float twist = 0.5 + 0.5 * sin(along * 22.0);
    vec3 strandColor = mix(yarn, yarnLight, body * body * (0.45 + 0.35 * twist));
    vec3 stitched = mix(gap, strandColor, body);
    // Too small to read as stitches: settle on their average rather than shimmer.
    float size = max(fwidth(uv.x), fwidth(uv.y));
    vec3 color = mix(stitched, mix(gap, yarn, 0.85), smoothstep(0.28, 0.6, size));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const SIDE_VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  void main() {
    vNormalView = normalMatrix * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SIDE_FRAGMENT = /* glsl */ `
  uniform vec3 side;
  varying vec3 vNormalView;
  void main() {
    float d = dot(normalize(vNormalView), normalize(vec3(-0.4, 0.75, 0.5)));
    gl_FragColor = vec4(side * (0.62 + 0.55 * max(d, 0.0)), 1.0);
    #include <colorspace_fragment>
  }
`;

function wordGeometry(word: Word, capHeight: number): THREE.ExtrudeGeometry {
  const path = new THREE.ShapePath();
  for (const command of word.commands) {
    const [type, ...n] = command as [string, ...number[]];
    if (type === "M") path.moveTo(n[0], n[1]);
    else if (type === "L") path.lineTo(n[0], n[1]);
    else if (type === "Q") path.quadraticCurveTo(n[0], n[1], n[2], n[3]);
    else if (type === "C") path.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]);
  }
  const geometry = new THREE.ExtrudeGeometry(path.toShapes(), {
    depth: DEPTH * capHeight,
    bevelEnabled: true,
    bevelThickness: BEVEL * capHeight,
    bevelSize: BEVEL * capHeight,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geometry.translate(-word.width / 2, -capHeight / 2, -DEPTH * capHeight);
  return geometry;
}

export type Headline = {
  object: THREE.Group;
  /** Fits the letters to the space visible at their depth. */
  layout: (visibleWidth: number, visibleHeight: number, stacked: boolean) => void;
  dispose: () => void;
};

export function createHeadline(): Headline {
  const { capHeight } = glyphs;
  const first = glyphs.HANDMADE as Word;
  const second = glyphs.CROCHET as Word;
  const capMaterial = new THREE.ShaderMaterial({
    vertexShader: CAP_VERTEX,
    fragmentShader: CAP_FRAGMENT,
    uniforms: {
      capHeight: { value: capHeight },
      yarn: { value: new THREE.Color("#6d3fba") },
      yarnLight: { value: new THREE.Color("#8b63d2") },
      gap: { value: new THREE.Color("#4f2a94") },
    },
  });
  const sideMaterial = new THREE.ShaderMaterial({
    vertexShader: SIDE_VERTEX,
    fragmentShader: SIDE_FRAGMENT,
    uniforms: { side: { value: new THREE.Color("#2c1550") } },
  });
  const make = (word: Word) => new THREE.Mesh(wordGeometry(word, capHeight), [capMaterial, sideMaterial]);
  const firstMesh = make(first);
  const secondMesh = make(second);
  const object = new THREE.Group();
  object.add(firstMesh, secondMesh);

  return {
    object,
    layout: (visibleWidth, visibleHeight, stacked) => {
      const gap = capHeight * 0.3;
      if (stacked) {
        const scale = Math.min((visibleWidth * 0.9) / first.width, (visibleHeight * 0.13) / capHeight);
        const worldCap = capHeight * scale;
        const lineGap = worldCap * 0.16;
        firstMesh.position.set(0, (worldCap + lineGap) / 2 / scale, 0);
        secondMesh.position.set(0, -(worldCap + lineGap) / 2 / scale, 0);
        object.scale.setScalar(scale);
        object.position.y = visibleHeight / 2 - visibleHeight * 0.03 - worldCap - lineGap / 2;
      } else {
        const total = first.width + gap + second.width;
        const scale = Math.min((visibleWidth * 0.9) / total, (visibleHeight * 0.3) / capHeight);
        firstMesh.position.set(-total / 2 + first.width / 2, 0, 0);
        secondMesh.position.set(total / 2 - second.width / 2, 0, 0);
        object.scale.setScalar(scale);
        object.position.y = visibleHeight / 2 - visibleHeight * 0.035 - (capHeight * scale) / 2;
      }
    },
    dispose: () => {
      firstMesh.geometry.dispose();
      secondMesh.geometry.dispose();
      capMaterial.dispose();
      sideMaterial.dispose();
    },
  };
}
