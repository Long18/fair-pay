import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useClock } from "./clock";
import { MEADOW_BREEZE_GLSL } from "./shaders";
import { MEADOW_TREES, meadowTerrainHeight } from "./world";

type Vec3 = [number, number, number];

const ROOT_SLOPE_GLSL = /* glsl */ `
  transformed.y += dot(position.xz,rootSlope) * (1. - smoothstep(0.,1.2,position.y));
`;

/** Leaf clusters (cx, cy, cz, rx, ry, rz) of the oak crown. */
const CLUSTERS: [number, number, number, number, number, number][] = [
  [-3.1, 5.65, 0.5, 1.5, 1.1, 1.3],
  [-2.05, 6.9, -0.5, 1.65, 1.4, 1.6],
  [-0.6, 8, -0.9, 1.7, 1.35, 1.6],
  [1.05, 8.35, -0.2, 1.5, 1.3, 1.5],
  [2.9, 6.9, 1, 1.55, 1.35, 1.4],
  [3.1, 5.65, 1.5, 1.3, 1, 1.35],
  [1.1, 6.2, 2.5, 1.6, 1.25, 1.3],
  [-0.8, 6.1, 2.1, 1.65, 1.3, 1.4],
  [-2.4, 5.2, 1.7, 1.25, 1, 1.1],
  [-1.8, 6.3, -2.05, 1.4, 1.3, 1.2],
  [0.2, 6.7, -2.6, 1.4, 1.3, 1.1],
  [1.9, 6.2, -1.8, 1.4, 1.25, 1.4],
  [-0.2, 7, 0.4, 1.8, 1.55, 1.65],
  [1.3, 7.4, 1.3, 1.55, 1.4, 1.4],
];

const LEAF: Vec3[] = [
  [0, 0, 0],
  [-0.25, 0.02, 0.26],
  [0, 0.09, 0.34],
  [0.25, 0.02, 0.26],
  [0, 0.01, 0.68],
];
const LEAF_INDEX = [0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3];

/** One of three oak variants: a leafy crown (vertex-coloured) and a merged trunk + branches. */
function buildOak(variant: number) {
  const trunkParts: THREE.BufferGeometry[] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const stretchX = [1.09, 0.91, 1.02][variant % 3];
  const stretchY = [0.91, 1.03, 0.95][variant % 3];
  const shear = [-0.09, 0.13, -0.03][variant % 3];
  const shape = (p: Vec3) =>
    new THREE.Vector3(p[0] * stretchX + p[1] * shear, p[1] * stretchY, p[2] * (variant % 3 === 1 ? 0.9 : 1.04));
  const branch = (from: Vec3, to: Vec3, r0: number, r1: number) => {
    const a = shape(from);
    const b = shape(to);
    const span = b.clone().sub(a);
    const piece = new THREE.CylinderGeometry(r1, r0, span.length(), 9);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize()));
    piece.translate(...(a.add(b).multiplyScalar(0.5).toArray() as Vec3));
    trunkParts.push(piece);
  };

  const trunk = new THREE.LatheGeometry(
    (
      [
        [0.56, -0.34],
        [0.54, -0.12],
        [0.5, 0.1],
        [0.45, 0.4],
        [0.415, 0.9],
        [0.39, 1.6],
        [0.34, 3.2],
      ] as [number, number][]
    ).map(([x, y]) => new THREE.Vector2(x, y)),
    12,
  );
  const trunkPos = trunk.getAttribute("position");
  for (let i = 0; i < trunkPos.count; i++) {
    const y = trunkPos.getY(i);
    const lean = Math.max(0, y) / 3.2;
    const p = shape([trunkPos.getX(i) + 0.18 * lean, y, trunkPos.getZ(i) + 0.06 * lean]);
    trunkPos.setXYZ(i, p.x, p.y, p.z);
  }
  trunk.computeVertexNormals();
  trunkParts.push(trunk);
  branch([0.18, 3.2, 0.06], [0.05, 6.8, -0.2], 0.34, 0.12);
  branch([0.16, 2.9, 0.08], [-2.7, 5.8, 0.55], 0.28, 0.07);
  branch([0.15, 3.5, 0], [2.6, 6.4, 1.3], 0.25, 0.06);
  branch([0.15, 4.3, 0], [0.8, 7, -2.1], 0.22, 0.05);

  let state = 81037 + 7907 * variant;
  const rand = () => (state = (Math.imul(state, 1664525) + 0x3c6ef35f) >>> 0) / 0x100000000;
  const leaf = new THREE.Object3D();
  const v = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const tone = new THREE.Color();
  const shadeDeep = new THREE.Color("#345f42");
  const shadeSun = new THREE.Color("#91ae65");

  for (const [bx, by, bz, rx, ry, rz] of CLUSTERS) {
    const cx = bx + (rand() - 0.5) * 0.5;
    const cy = by + (rand() - 0.5) * 0.45;
    const cz = bz + (rand() - 0.5) * 0.5;
    const fork: Vec3 = [0.76 * cx, cy - 0.75, 0.76 * cz];
    branch([0.12, 4.7, 0], fork, 0.085, 0.025);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + cx;
      branch(fork, [cx + Math.cos(a) * rx * 0.7, cy + 0.3, cz + Math.sin(a) * rz * 0.7], 0.035, 0.008);
    }

    const blob = new THREE.IcosahedronGeometry(1, 2);
    const blobPos = blob.getAttribute("position");
    const blobNrm = blob.getAttribute("normal");
    const base = positions.length / 3;
    for (let i = 0; i < blobPos.count; i++) {
      const x = blobPos.getX(i);
      const y = blobPos.getY(i);
      const z = blobPos.getZ(i);
      const lumpy = 1 + 0.055 * Math.sin(11 * x + 8 * z + cy);
      v.copy(shape([cx + x * rx * 0.83 * lumpy, cy + y * ry * 0.8 * lumpy, cz + z * rz * 0.83 * lumpy]));
      positions.push(v.x, v.y, v.z);
      nrm.set(blobNrm.getX(i) / rx, blobNrm.getY(i) / ry, blobNrm.getZ(i) / rz).normalize();
      normals.push(nrm.x, nrm.y, nrm.z);
      tone.copy(shadeDeep).lerp(shadeSun, 0.24 + 0.25 * Math.max(0, y) + (cy - 5) * 0.045);
      colors.push(tone.r, tone.g, tone.b);
    }
    if (blob.index) for (const i of blob.index.array) indices.push(base + i);
    else for (let i = 0; i < blobPos.count; i++) indices.push(base + i);
    blob.dispose();

    for (let k = 0; k < 110; k++) {
      const a = rand() * Math.PI * 2;
      const up = 2 * rand() - 1;
      const reach = 0.78 + 0.26 * rand();
      const ring = Math.sqrt(1 - up * up);
      leaf.position.copy(
        shape([cx + Math.cos(a) * ring * reach * rx, cy + up * reach * ry, cz + Math.sin(a) * ring * reach * rz]),
      );
      leaf.rotation.set((rand() - 0.5) * 1.15, rand() * Math.PI * 2, (rand() - 0.5) * 1.05);
      leaf.scale.setScalar(0.65 + 0.45 * rand());
      leaf.updateMatrix();
      const first = positions.length / 3;
      const light = 0.38 + (cy - 5) * 0.08 + 0.2 * Math.max(0, up) + (rand() - 0.5) * 0.09;
      nrm.set(Math.cos(a) * ring * 0.55, 0.75 + 0.25 * up, Math.sin(a) * ring * 0.55).normalize();
      for (const [lx, ly, lz] of LEAF) {
        v.set(lx, ly, lz).applyMatrix4(leaf.matrix);
        positions.push(v.x, v.y, v.z);
        normals.push(nrm.x, nrm.y, nrm.z);
        tone.copy(shadeDeep).lerp(shadeSun, Math.min(0.95, light + ly));
        colors.push(tone.r, tone.g, tone.b);
      }
      for (const i of LEAF_INDEX) indices.push(first + i);
    }
  }

  const crownGeometry = new THREE.BufferGeometry();
  crownGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  crownGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  crownGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  crownGeometry.setIndex(indices);
  crownGeometry.computeBoundingBox();
  const trunkGeometry = mergeGeometries(trunkParts);
  trunkParts.forEach((g) => g.dispose());
  return { crownGeometry, trunkGeometry };
}

function buildGroves() {
  const time = { value: 0 };
  const crownMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const crownDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  crownMaterial.onBeforeCompile = crownDepth.onBeforeCompile = (shader) => {
    shader.uniforms.meadowTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float meadowTime;\n" + MEADOW_BREEZE_GLSL)
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed=vec3(position);
        vec2 place=(instanceMatrix*vec4(position,1.)).xz;
        vec2 bend=vec2(.22,.08)*meadowBreeze(place,meadowTime)*smoothstep(2.8,9.5,position.y);
        transformed.x+=dot(instanceMatrix[0].xz,bend)/dot(instanceMatrix[0].xz,instanceMatrix[0].xz);
        transformed.z+=dot(instanceMatrix[2].xz,bend)/dot(instanceMatrix[2].xz,instanceMatrix[2].xz);`,
      );
  };
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#74644c", roughness: 1 });
  const trunkDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  trunkMaterial.onBeforeCompile = trunkDepth.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 rootSlope;")
      .replace("#include <begin_vertex>", "vec3 transformed=vec3(position);\n" + ROOT_SLOPE_GLSL);
  };
  const placer = new THREE.Object3D();
  const tint = new THREE.Color();
  const groves = Array.from({ length: 3 }, (_, variant) => {
    const oak = buildOak(variant);
    const trees = MEADOW_TREES.filter((_, i) => i % 3 === variant);
    const slopes = new Float32Array(2 * trees.length);
    oak.trunkGeometry.setAttribute("rootSlope", new THREE.InstancedBufferAttribute(slopes, 2));
    const crown = new THREE.InstancedMesh(oak.crownGeometry, crownMaterial, trees.length);
    const trunk = new THREE.InstancedMesh(oak.trunkGeometry, trunkMaterial, trees.length);
    trees.forEach((tree, i) => {
      placer.position.set(tree.x, meadowTerrainHeight(tree.x, tree.y), tree.y);
      placer.rotation.y = tree.turn;
      placer.scale.setScalar(tree.scale);
      placer.updateMatrix();
      crown.setMatrixAt(i, placer.matrix);
      trunk.setMatrixAt(i, placer.matrix);
      crown.setColorAt(i, tint.setRGB(0.97 + 0.015 * variant, 1, 0.95 + 0.02 * variant));
      const sx = (meadowTerrainHeight(tree.x + 0.2, tree.y) - meadowTerrainHeight(tree.x - 0.2, tree.y)) / 0.4;
      const sz = (meadowTerrainHeight(tree.x, tree.y + 0.2) - meadowTerrainHeight(tree.x, tree.y - 0.2)) / 0.4;
      slopes.set([sx * Math.cos(tree.turn) - sz * Math.sin(tree.turn), sx * Math.sin(tree.turn) + sz * Math.cos(tree.turn)], 2 * i);
    });
    crown.customDepthMaterial = crownDepth;
    trunk.customDepthMaterial = trunkDepth;
    crown.castShadow = trunk.castShadow = true;
    crown.receiveShadow = trunk.receiveShadow = true;
    return { ...oak, crown, trunk };
  });
  return {
    groves,
    setTime(t: number) {
      time.value = t;
    },
    dispose() {
      for (const g of groves) {
        g.crown.dispose();
        g.trunk.dispose();
        g.crownGeometry.dispose();
        g.trunkGeometry.dispose();
      }
      crownMaterial.dispose();
      crownDepth.dispose();
      trunkMaterial.dispose();
      trunkDepth.dispose();
    },
  };
}

export function Trees() {
  const groves = useMemo(() => buildGroves(), []);
  useClock(groves.setTime);
  useEffect(() => () => groves.dispose(), [groves]);
  return (
    <>
      {groves.groves.map((g) => (
        <group key={g.crown.uuid}>
          <primitive object={g.crown} dispose={null} />
          <primitive object={g.trunk} dispose={null} />
        </group>
      ))}
    </>
  );
}
