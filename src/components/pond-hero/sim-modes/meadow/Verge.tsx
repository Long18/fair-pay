import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { MEADOW_BANDS } from "./bands";
import { useClock } from "./clock";
import { fractalNoise, sineHash } from "./noise";
import { MEADOW_BREEZE_GLSL, REFLECTION_DETAIL_KEY } from "./shaders";
import { MEADOW_TREES, WALL_SEGMENTS, meadowPath, meadowTerrainHeight, pondRadius } from "./world";

type Habitat = "wall" | "tree" | "pasture";

type Tuft = {
  x: number;
  y: number;
  z: number;
  height: number;
  width: number;
  nx: number;
  nz: number;
  hue: number;
  turn: number;
  tone: number;
  habitat: Habitat;
};

function scatterTufts(): Tuft[] {
  const path = meadowPath();
  const tufts: Tuft[] = [];
  const tryPlant = (x: number, y: number, serial: number, habitat: Habitat) => {
    if (
      pondRadius(x, y) < 1.08 ||
      path.some((p) => Math.hypot(p.x - x, p.y - y) < p.width + 1.6) ||
      MEADOW_BANDS.some((b) => Math.hypot(b.points[0].x - x, b.points[0].y - y) < (b.motion === "turn" ? 7 : 16))
    )
      return;
    const lush = fractalNoise(x / 8, y / 8, 118, 2);
    const pasture = habitat === "pasture";
    if (pasture && fractalNoise(x / 24, y / 29, 319, 2) < 0.38) return;
    if (sineHash(serial, 7) > (pasture ? 0.18 + 0.78 * lush : 0.3 + 0.65 * lush)) return;
    tufts.push({
      x,
      y,
      z: meadowTerrainHeight(x, y),
      height: pasture ? 0.34 + 0.36 * lush + 0.12 * sineHash(serial, 3) : 0.48 + 0.34 * lush + 0.17 * sineHash(serial, 3),
      width: 0.68 + 0.5 * lush + 0.25 * sineHash(serial, 8),
      nx: (meadowTerrainHeight(x - 0.25, y) - meadowTerrainHeight(x + 0.25, y)) * 2,
      nz: (meadowTerrainHeight(x, y - 0.25) - meadowTerrainHeight(x, y + 0.25)) * 2,
      hue: fractalNoise(x / 19, y / 23, 823, 2),
      turn: sineHash(serial, 4) * Math.PI * 2,
      tone: 0.9 + 0.14 * sineHash(serial, 5),
      habitat,
    });
  };
  let serial = 0;
  for (const { from, to } of WALL_SEGMENTS) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    for (let t = 0.35; t < length; t += 0.7) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const along = Math.min(length, t + (sineHash(++serial, 1) - 0.5) * 0.6);
          const off = side * (0.65 + sineHash(serial, 2) ** 2 * 3.2);
          tryPlant(from[0] + (dx / length) * along - (dy / length) * off, from[1] + (dy / length) * along + (dx / length) * off, serial, "wall");
        }
      }
    }
  }
  for (const tree of MEADOW_TREES) {
    for (let k = 0; k < 110; k++) {
      const angle = sineHash(++serial, 1) * Math.PI * 2;
      const lobe = 0.82 + 0.18 * Math.sin(3 * angle + tree.turn);
      const r = (0.6 + sineHash(serial, 2) ** 0.85 * 4.2) * tree.scale * lobe;
      tryPlant(tree.x + Math.cos(angle) * r, tree.y + Math.sin(angle) * r, serial, "tree");
    }
  }
  for (let k = 0; k < 32e3; k++) {
    const x = 110 + 310 * sineHash(++serial, 11);
    const y = 420 + 220 * sineHash(serial, 12);
    const nearWall = WALL_SEGMENTS.some(({ from, to }) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - from[0] - t * dx, y - from[1] - t * dy) < 4;
    });
    if (nearWall) continue;
    if (MEADOW_TREES.some((tree) => Math.hypot(x - tree.x, y - tree.y) < 5 * tree.scale)) continue;
    tryPlant(x, y, serial, "pasture");
  }
  return tufts;
}

/** Seven fanned blades; `tip` (0 root → 1 tip) drives bending and fwidth fade. */
function tuftGeometry() {
  const positions: number[] = [];
  const colors: number[] = [];
  const tips: number[] = [];
  const indices: number[] = [];
  const base = new THREE.Color("#7b914e");
  const top = new THREE.Color("#b0bc7d");
  const tone = new THREE.Color();
  for (let blade = 0; blade < 7; blade++) {
    const angle = 2.39996 * blade;
    const height = 0.62 + (blade % 4) * 0.1;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const offset = 0.09 + (blade % 3) * 0.065;
    const arch = 0.28 + 0.12 * Math.sin(1.7 * blade);
    const first = positions.length / 3;
    for (let row = 0; row < 4; row++) {
      const t = row / 3;
      const half = 0.09 * (1 - t) ** 0.8;
      const lean = arch * t * t;
      const twist = 0.07 * Math.sin(2.3 * blade) * t * t;
      for (const side of row === 3 ? [0] : [-1, 1]) {
        const across = half * side + twist;
        const out = offset + lean;
        positions.push(cos * across + sin * out, height * t, -sin * across + cos * out);
        tone.copy(base).lerp(top, 0.12 + t * t * 0.7);
        colors.push(tone.r, tone.g, tone.b);
        tips.push(t);
      }
      if (row) {
        const a = first + (row - 1) * 2;
        const b = a + 2;
        indices.push(a, a + 1, b);
        if (row < 3) indices.push(a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("tip", new THREE.Float32BufferAttribute(tips, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildVerge() {
  const tufts = scatterTufts();
  const geometry = tuftGeometry();
  const time = { value: 0 };
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    forceSinglePass: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vergeTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float vergeTime;\nattribute float tip;\nvarying float vGrassTip;\n" + MEADOW_BREEZE_GLSL,
      )
      .replace(
        "#include <begin_vertex>",
        `
          vec3 transformed = vec3(position);
          vGrassTip = tip;
          float breeze = meadowBreeze(instanceMatrix[3].xz, vergeTime);
          float height = length(instanceMatrix[1].xyz);
          vec2 bend = vec2(.48, .17) * breeze * height * tip * tip;
          transformed.x += dot(instanceMatrix[0].xz, bend) / dot(instanceMatrix[0].xz, instanceMatrix[0].xz);
          transformed.z += dot(instanceMatrix[2].xz, bend) / dot(instanceMatrix[2].xz, instanceMatrix[2].xz);
        `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vGrassTip;")
      .replace(
        "#include <alphatest_fragment>",
        `
          diffuseColor.a *= smoothstep(.65, 1.8, 1. / max(fwidth(vGrassTip), .001));
          #include <alphatest_fragment>
        `,
      )
      .replace(
        "#include <lights_lambert_pars_fragment>",
        THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
          "float dotNL = saturate( dot( geometryNormal, directLight.direction ) );",
          "float dotNL = .22 + .78 * abs( dot( geometryNormal, directLight.direction ) );",
        ),
      );
  };
  const mesh = new THREE.InstancedMesh(geometry, material, tufts.length);
  const placer = new THREE.Object3D();
  const tone = new THREE.Color();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const spin = new THREE.Quaternion();
  tufts.forEach((tuft, i) => {
    placer.position.set(tuft.x, tuft.z, tuft.y);
    normal.set(tuft.nx, 1, tuft.nz).normalize();
    placer.quaternion.setFromUnitVectors(up, normal).multiply(spin.setFromAxisAngle(up, tuft.turn));
    placer.scale.set(tuft.width, tuft.height, tuft.width);
    placer.updateMatrix();
    mesh.setMatrixAt(i, placer.matrix);
    mesh.setColorAt(i, tone.setRGB(tuft.tone * (0.92 + 0.14 * tuft.hue), tuft.tone, tuft.tone * (0.92 - 0.12 * tuft.hue)));
  });
  mesh.computeBoundingSphere();
  if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.6;
  mesh.receiveShadow = true;
  mesh.userData[REFLECTION_DETAIL_KEY] = true;
  return {
    mesh,
    setTime(t: number) {
      time.value = t;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

export function Verge() {
  const verge = useMemo(() => buildVerge(), []);
  useEffect(() => () => verge.dispose(), [verge]);
  useClock(verge.setTime);
  return <primitive object={verge.mesh} dispose={null} />;
}
