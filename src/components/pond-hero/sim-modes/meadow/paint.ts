import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MILL_HUB, type FigureKind } from "./bands";

/** Per-part finish: roughness (negative = self-lit), metalness, cloth pleat, rim. */
export type Finish = [number, number, number, number];

export const CLOTH: Finish = [0.88, 0, 1, 0];
export const PAINTED: Finish = [0.5, 0, 0, 0];
export const FUR: Finish = [0.95, 0, 0.5, 0];
export const HAIR: Finish = [0.7, 0, 0, 0];
export const WOOD: Finish = [0.72, 0, 0, 0];

type Vec3 = [number, number, number];

/** [geometry, sRGB colour, finish, position, YXZ rotation, scale] */
export type Part = [THREE.BufferGeometry, string, Finish, Vec3, Vec3?, Vec3?];

export const ball = (r: number, w = 9, h = 6) => new THREE.SphereGeometry(r, w, h);
export const limb = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 1, 6);
export const rod = (r: number, len: number, seg = 7) => new THREE.CylinderGeometry(r, r, len, seg);
export const turned = (profile: [number, number][], seg = 10) =>
  new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Bake parts into one indexed geometry carrying `color` + `finish` vertex attributes. */
export function paint(parts: Part[]): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const baked = parts.map(([geometry, color, finish, position, rotation = [0, 0, 0], scale = [1, 1, 1]]) => {
    if (!geometry.index) {
      geometry.setIndex(Array.from({ length: geometry.getAttribute("position").count }, (_, i) => i));
    }
    geometry.deleteAttribute("uv");
    geometry.applyMatrix4(
      matrix.compose(new THREE.Vector3(...position), quat.setFromEuler(euler.set(...rotation)), new THREE.Vector3(...scale)),
    );
    const tone = new THREE.Color(color);
    const count = geometry.getAttribute("position").count;
    const colors = new Float32Array(3 * count);
    const finishes = new Float32Array(4 * count);
    for (let i = 0; i < count; i += 1) {
      colors.set([tone.r, tone.g, tone.b], 3 * i);
      finishes.set(finish, 4 * i);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("finish", new THREE.BufferAttribute(finishes, 4));
    return geometry;
  });
  const merged = mergeGeometries(baked, false);
  baked.forEach((g) => g.dispose());
  return merged;
}

/** MeshStandardMaterial driven per-vertex by the `finish` attribute. */
export function createPaintMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ envMapIntensity: 1.1 });
  material.vertexColors = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: new THREE.Color("#000000") };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec4 finish;\nvarying vec4 vFinish;\nvarying vec3 vFigure;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFinish = finish;\nvFigure = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 rimColor;\nvarying vec4 vFinish;\nvarying vec3 vFigure;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float pleat = .5 + .5 * sin(atan(vFigure.z, vFigure.x) * 9.0 + vFigure.y * 1.3);
        float weave = .5 + .5 * sin(vFigure.x * 70.0) * sin(vFigure.y * 70.0 + vFigure.z * 70.0);
        float hem = smoothstep(1.9, .9, vFigure.y);
        diffuseColor.rgb *= 1.0 - vFinish.z * (.3 * pleat * pleat + .08 * weave + .12 * hem);`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nroughnessFactor = abs(vFinish.x);\nmetalnessFactor = vFinish.y;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * max(-vFinish.x, 0.0) + rimColor * vFinish.w * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.2);",
      );
  };
  material.customProgramCacheKey = () => "miniature-#000000";
  return material;
}

/* ---------------------------------------------------------------- figures */

const FLEECE = "#ece6d6";
const FACE = "#2a2522";
const mirrored = <T,>(fn: (side: number) => T[]): T[] => [-1, 1].flatMap(fn);

function sheepParts(): Part[] {
  return [
    [ball(0.45, 8, 6), FLEECE, FUR, [0, 0.78, 0], undefined, [1.4, 1, 1]],
    ...(
      [
        [0.3, 0.98, 0.12],
        [-0.3, 0.96, -0.1],
        [0, 1.08, 0],
      ] as Vec3[]
    ).map((p): Part => [ball(0.3, 7, 5), FLEECE, FUR, p]),
    [ball(0.17, 7, 5), FACE, HAIR, [0.7, 0.96, 0], undefined, [1.3, 1, 0.9]],
    ...mirrored((s): Part[] => [[limb(0.04, 0.12), FACE, HAIR, [0.66, 1.1, 0.17 * s], [1.2 * s, 0, 0]]]),
    ...mirrored((s) => mirrored((t): Part[] => [[limb(0.05, 0.36), FACE, HAIR, [0.36 * s, 0.26, 0.15 * t]]])),
  ];
}

const STONE = "#a99e86";
const STONE_LIGHT = "#bcb19b";
const TIMBER = "#89745b";
const TIMBER_DARK = "#71563d";
const DOOR = "#40392f";
const IRON = "#8f8875";

/** Cap profile radius at height `h` above the tower top. */
const capRadius = (h: number) =>
  h <= 0.36 ? 1.19 - (0.16 * h) / 0.36 : h <= 1.02 ? 1.03 - (0.35 * (h - 0.36)) / 0.66 : 0.68 - (0.61 * (h - 1.02)) / 0.55;

function millParts(): Part[] {
  const parts: Part[] = [
    [turned([[1.34, 0], [1.34, 0.23], [1.25, 0.36]], 24), STONE, PAINTED, [0, 0, 0]],
    [turned([[1.25, 0.23], [1.18, 1.8], [1.04, 3.6], [0.93, 5.12], [0.001, 5.13]], 24), "#d8ceb7", PAINTED, [0, 0, 0]],
    [rod(1.04, 0.12, 24), TIMBER, WOOD, [0, 5.08, 0]],
    [turned([[1.19, 0], [1.03, 0.36], [0.68, 1.02], [0.07, 1.57], [0.001, 1.59]], 24), "#655748", WOOD, [0, 5.12, 0]],
    [ball(0.09), IRON, PAINTED, [0, 6.74, 0]],
    [rod(0.13, 0.82, 10), TIMBER_DARK, WOOD, [0, MILL_HUB.up, MILL_HUB.south - 0.36], [Math.PI / 2, 0, 0]],
  ];
  for (let course = 0; course < 4; course++) {
    for (let k = 0; k < 12; k++) {
      const angle = ((k + (course % 2) * 0.5) * Math.PI) / 6;
      if (course > 1 && (k + course) % 4 !== 0) continue;
      const y = 0.42 + 0.29 * course;
      const r = 1.25 - 0.045 * y;
      if (Math.abs(Math.sin(angle)) < 0.4 && Math.cos(angle) > 0) continue;
      parts.push([
        box(0.54, 0.24, 0.06),
        (k + course) % 3 ? STONE_LIGHT : STONE,
        PAINTED,
        [Math.sin(angle) * r, y, Math.cos(angle) * r],
        [0, angle, 0],
      ]);
    }
  }
  const arch = new THREE.Shape();
  arch.moveTo(-0.29, 0);
  arch.lineTo(0.29, 0);
  arch.lineTo(0.29, 0.78);
  arch.absarc(0, 0.78, 0.29, 0, Math.PI, false);
  arch.closePath();
  parts.push([
    new THREE.ExtrudeGeometry(arch, { depth: 0.06, bevelEnabled: false, curveSegments: 8 }),
    DOOR,
    WOOD,
    [0, 0.12, 1.24],
  ]);
  for (const s of [-1, 1]) parts.push([box(0.13, 0.85, 0.14), STONE, PAINTED, [0.37 * s, 0.53, 1.25]]);
  for (let k = 0; k < 7; k++) {
    const a = (k * Math.PI) / 6;
    parts.push([
      box(0.15, 0.16, 0.14),
      STONE_LIGHT,
      PAINTED,
      [0.37 * Math.cos(a), 0.9 + 0.37 * Math.sin(a), 1.24],
      [0, 0, a - Math.PI / 2],
    ]);
  }
  for (const x of [-0.18, 0, 0.18]) parts.push([box(0.11, 0.82, 0.025), TIMBER_DARK, WOOD, [x, 0.55, 1.31]]);
  parts.push(
    [box(0.52, 0.07, 0.04), IRON, PAINTED, [0, 0.38, 1.34]],
    [box(0.52, 0.07, 0.04), IRON, PAINTED, [0, 0.81, 1.34]],
    [box(0.84, 0.13, 0.45), STONE, PAINTED, [0, 0.065, 1.47]],
  );
  for (const [height, facing] of [
    [2.55, 0],
    [3.85, -Math.PI / 2],
    [2.7, Math.PI / 2],
  ]) {
    const r = 1.26 - 0.065 * height;
    const at = (x: number, y: number, z: number): Vec3 => [
      Math.sin(facing) * z + Math.cos(facing) * x,
      y,
      Math.cos(facing) * z - Math.sin(facing) * x,
    ];
    parts.push(
      [box(0.42, 0.61, 0.07), DOOR, WOOD, at(0, height, r), [0, facing, 0]],
      [box(0.57, 0.09, 0.2), STONE, PAINTED, at(0, height - 0.34, r + 0.04), [0, facing, 0]],
      [box(0.04, 0.55, 0.035), TIMBER_DARK, WOOD, at(0, height, r + 0.06), [0, facing, 0]],
    );
    for (const s of [-1, 1]) {
      parts.push([box(0.16, 0.61, 0.055), TIMBER_DARK, WOOD, at(0.34 * s, height, r - 0.01), [0, facing + 0.25 * s, 0]]);
    }
  }
  for (let k = 0; k < 4; k++) {
    const y = 5.27 + 0.3 * k;
    parts.push([
      new THREE.TorusGeometry(capRadius(y - 5.12) + 0.012, 0.025, 3, 24),
      TIMBER,
      WOOD,
      [0, y, 0],
      [Math.PI / 2, 0, 0],
    ]);
  }
  for (let k = 0; k < 12; k++) {
    for (const [lo, hi] of [
      [0.04, 0.36],
      [0.36, 1.02],
      [1.02, 1.55],
    ]) {
      const a = (k * Math.PI) / 6;
      const from = new THREE.Vector3(Math.sin(a) * (capRadius(lo) + 0.02), 5.12 + lo, Math.cos(a) * (capRadius(lo) + 0.02));
      const to = new THREE.Vector3(Math.sin(a) * (capRadius(hi) + 0.02), 5.12 + hi, Math.cos(a) * (capRadius(hi) + 0.02));
      const span = to.clone().sub(from);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const rib = rod(0.018, span.length(), 4).applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize()),
      );
      parts.push([rib, TIMBER, WOOD, mid.toArray() as Vec3]);
    }
  }
  return parts;
}

function sailsParts(): Part[] {
  const parts: Part[] = [
    [rod(0.23, 0.25, 12), TIMBER_DARK, WOOD, [0, 0, 0], [Math.PI / 2, 0, 0]],
    [rod(0.11, 0.08, 10), IRON, PAINTED, [0, 0, 0.17], [Math.PI / 2, 0, 0]],
  ];
  for (let arm = 0; arm < 4; arm++) {
    const a = (arm * Math.PI) / 2 + 0.3;
    const at = (x: number, y: number, z = 0): Vec3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
    parts.push(
      [box(0.13, 3.8, 0.13), TIMBER_DARK, WOOD, at(0, 1.95), [0, 0, a]],
      [box(0.69, 2.5, 0.025), "#e5d6b5", CLOTH, at(0.46, 2.4, -0.04), [0, 0, a]],
      [box(0.08, 2.68, 0.08), TIMBER_DARK, WOOD, at(0.89, 2.4), [0, 0, a]],
    );
    for (let k = 0; k < 6; k++) {
      parts.push([box(0.94, 0.065, 0.08), k % 2 ? TIMBER : TIMBER_DARK, WOOD, at(0.44, 1.09 + 0.52 * k, 0.015), [0, 0, a]]);
    }
    for (const y of [1.72, 2.7]) parts.push([box(0.68, 0.025, 0.014), STONE_LIGHT, CLOTH, at(0.46, y, -0.02), [0, 0, a]]);
  }
  return parts;
}

export function figureGeometry(kind: FigureKind): THREE.BufferGeometry {
  return paint(kind === "sheep" ? sheepParts() : kind === "mill" ? millParts() : sailsParts());
}
