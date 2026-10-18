import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useClock } from "./clock";
import { fractalNoise } from "./noise";
import type { MeadowWorld } from "./simulation";
import { meadowTerrainHeight, nearestWall, wallHit } from "./world";

const PATCHES = [
  { x: 236, y: 564, tint: "#caa33f", width: 46, depth: 7, turn: 0.28 },
  { x: 311, y: 473, tint: "#e7dcb7", width: 15, depth: 5, turn: -0.5 },
  { x: 191, y: 522, tint: "#b86d88", width: 18, depth: 6, turn: 0.25 },
  { x: 217, y: 596, tint: "#ded8ba", width: 31, depth: 10, turn: 0.35 },
  { x: 351, y: 576, tint: "#9b8298", width: 24, depth: 8, turn: 0.28 },
];
const PER_PATCH = 112;
const FLOWER_COUNT = PER_PATCH * PATCHES.length;
const BUTTERFLIES = 8;

type Flower = {
  x: number;
  y: number;
  z: number;
  stem: number;
  size: number;
  tint: string;
  turn: number;
  petals: number;
  cup: number;
};

const flowerWall = wallHit();

function flowerAt(index: number): Flower {
  const patch = PATCHES[Math.floor(index / PER_PATCH)];
  const rnd = (k: number) => {
    const v = 43758.5453 * Math.sin(127.1 * index + 311.7 * k);
    return v - Math.floor(v);
  };
  const along = (rnd(1) - 0.5) * patch.width;
  const taper = Math.sqrt(Math.max(0, 1 - ((2 * along) / patch.width) ** 2));
  const across = (rnd(2) - 0.5) * patch.depth * taper + Math.sin(0.23 * along) * patch.depth * 0.18;
  let x = patch.x + Math.cos(patch.turn) * along - Math.sin(patch.turn) * across;
  let y = patch.y + Math.sin(patch.turn) * along + Math.cos(patch.turn) * across;
  nearestWall(x, y, flowerWall);
  if (flowerWall.distance < 1) {
    x = flowerWall.x + flowerWall.nx;
    y = flowerWall.y + flowerWall.ny;
  }
  const lush = fractalNoise(x / 3.1, y / 3.1, 713, 2);
  const stem = 0.4 + 0.55 * rnd(3);
  return {
    x,
    y,
    z: meadowTerrainHeight(x, y) + stem,
    stem,
    size: (0.18 + 0.14 * rnd(4)) * (0.35 + lush),
    tint: patch.tint,
    turn: rnd(5) * Math.PI * 2,
    petals: index % 4 === 0 ? 6 : 5,
    cup: 0.06 + 0.1 * rnd(6),
  };
}

const FLOWERS = Array.from({ length: FLOWER_COUNT }, (_, i) => flowerAt(i));

const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** Wind offset of a flower head (matches the vertex shader sway). */
function swayAt(x: number, y: number, stem: number, time: number, out: { x: number; y: number }) {
  const phase = Math.sin(0.75 * time + 0.035 * x + 0.024 * y);
  const gust = 0.07 + 0.04 * Math.sin(0.23 * time + 0.012 * x);
  out.x = stem * gust * phase;
  out.y = stem * gust * Math.sin(0.75 * time + 0.035 * x + 0.024 * y + 0.7) * 0.45;
  return out;
}

type Alarm = { at: number; x: number; y: number };
type ButterflyPose = { x: number; y: number; z: number; heading: number; bank: number; wing: number };

const swayScratch = { x: 0, y: 0 };

/** The flower a butterfly visits on its `visit`-th hop. */
const visitFlower = (b: number, visit: number) =>
  FLOWERS[(b % PATCHES.length) * PER_PATCH + ((29 * visit + 17 * b + 11) % PER_PATCH)];

function butterflyPose(b: number, time: number, out: ButterflyPose, alarm: Alarm): ButterflyPose {
  const lane = b === 5 ? 0 : b;
  const period = 22 + (lane % 5) * 0.85;
  const clock = Math.max(0, time) + 2.3 * lane;
  const visit = Math.floor(clock / period);
  const from = visitFlower(b, visit);
  const to = visitFlower(b, visit + 1);
  const flight = Math.max(0, ((clock % period) - 6) / (period - 6));
  const progress = ease(flight);
  const loft = Math.sin(Math.PI * progress);
  const swirl = 1.25 * time + 0.7 * b;
  const s0 = swayAt(from.x, from.y, from.stem, time, swayScratch);
  const fx = from.x + s0.x;
  const fy = from.y + s0.y;
  swayAt(to.x, to.y, to.stem, time, swayScratch);
  const tx = to.x + swayScratch.x;
  const ty = to.y + swayScratch.y;
  out.x = fx + (tx - fx) * progress + Math.sin(swirl) * loft * 2.1;
  out.y = fy + (ty - fy) * progress + Math.cos(swirl) * loft * 1.5;
  out.z =
    Math.max(from.z + (to.z - from.z) * progress + 0.09, meadowTerrainHeight(out.x, out.y) + 0.25) + 2.1 * loft;
  const flutter = ease(12 * flight) * ease((1 - flight) * 10);
  const rate = flight > 0 ? (6 * flight * (1 - flight)) / (period - 6) : 0;
  const loftRate = Math.PI * Math.cos(Math.PI * progress) * rate;
  const vx = (tx - fx) * rate + 2.1 * (1.25 * Math.cos(swirl) * loft + Math.sin(swirl) * loftRate);
  const vy = (ty - fy) * rate + 1.5 * (-(1.25 * Math.sin(swirl)) * loft + Math.cos(swirl) * loftRate);
  out.heading = Math.hypot(vx, vy) > 0.01 ? Math.atan2(vy, vx) : from.turn;
  out.bank = Math.sin(swirl + 0.7) * loft * 0.2;
  out.wing = 1.45 + (0.25 + 0.95 * Math.abs(Math.sin(time * (12.5 + (b % 3)) + b)) - 1.45) * flutter;
  const since = time - alarm.at;
  const startle = ease(since / 0.7) * (1 - ease((since - 1.8) / 3.2));
  out.x += alarm.x * startle;
  out.y += alarm.y * startle;
  out.z += 2.2 * startle;
  out.wing += (0.3 + 0.8 * Math.abs(Math.sin(16 * time + b)) - out.wing) * startle;
  out.bank += Math.sin(3 * time + b) * startle * 0.18;
  return out;
}

function startle(time: number, pose: ButterflyPose, x: number, y: number, alarm: Alarm): boolean {
  if (time - alarm.at < 10 || Math.hypot(pose.x - x, pose.y - y) > 5.5) return false;
  const away = Math.atan2(pose.y - y, pose.x - x);
  alarm.at = time;
  alarm.x = 2.6 * Math.cos(away);
  alarm.y = 2.6 * Math.sin(away);
  return true;
}

/** Wind-bend the instanced parts; `windStem` scales by stem length, `flowerBend` by height on the stem. */
function swayInstances(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  stems: Float32Array,
  time: { value: number },
  bendByHeight = false,
) {
  geometry.setAttribute("windStem", new THREE.InstancedBufferAttribute(stems, 1));
  const position = geometry.getAttribute("position");
  const bend = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) bend[i] = bendByHeight ? position.getY(i) ** 2 : 1;
  geometry.setAttribute("flowerBend", new THREE.BufferAttribute(bend, 1));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.flowerTime = time;
    shader.vertexShader = `uniform float flowerTime; attribute float windStem; attribute float flowerBend;
${shader.vertexShader}`.replace(
      "#include <project_vertex>",
      `
        vec3 root = instanceMatrix[3].xyz;
        float phase = flowerTime * .75 + root.x * .035 + root.z * .024;
        float gust = .07 + .04 * sin(flowerTime * .23 + root.x * .012);
        vec3 bend = vec3(sin(phase), 0., sin(phase + .7) * .45) * gust * windStem * flowerBend;
        transformed += vec3(dot(instanceMatrix[0].xyz, bend) / max(.0001, dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz)),
          dot(instanceMatrix[1].xyz, bend) / max(.0001, dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz)),
          dot(instanceMatrix[2].xyz, bend) / max(.0001, dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz)));
        #include <project_vertex>`,
    );
  };
}

function buildFlowers() {
  const time = { value: 0 };
  const petalGeometry = new THREE.SphereGeometry(1, 6, 3);
  const discGeometry = new THREE.SphereGeometry(1, 5, 3);
  const stemGeometry = new THREE.CylinderGeometry(0.018, 0.026, 1, 3).translate(0, 0.5, 0);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: "#596b37", roughness: 1 });
  const petalMaterial = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const discMaterial = new THREE.MeshStandardMaterial({ color: "#8c702c", roughness: 1 });
  const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, FLOWER_COUNT);
  const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, 6 * FLOWER_COUNT);
  const discs = new THREE.InstancedMesh(discGeometry, discMaterial, FLOWER_COUNT);
  petals.receiveShadow = stems.receiveShadow = discs.receiveShadow = true;
  const stemLengths = new Float32Array(FLOWER_COUNT);
  const petalStems = new Float32Array(6 * FLOWER_COUNT);

  const wingGeometry = new THREE.SphereGeometry(1, 6, 4);
  const wingMaterial = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const wings = new THREE.InstancedMesh(wingGeometry, wingMaterial, 2 * BUTTERFLIES);
  const bodyGeometry = new THREE.SphereGeometry(1, 5, 3);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#46392e", roughness: 1 });
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, BUTTERFLIES);
  for (const mesh of [wings, bodies]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
  }

  const placer = new THREE.Object3D();
  const tone = new THREE.Color();
  for (let i = 0; i < FLOWER_COUNT; i++) {
    const f = flowerAt(i);
    stemLengths[i] = f.stem;
    placer.position.set(f.x, f.z - f.stem, f.y);
    placer.scale.set(1, f.stem, 1);
    placer.rotation.set(0, 0, 0);
    placer.updateMatrix();
    stems.setMatrixAt(i, placer.matrix);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI * 2) / f.petals + f.turn;
      placer.position.set(f.x + Math.cos(a) * f.size * 0.72, f.z, f.y + Math.sin(a) * f.size * 0.72);
      const size = k < f.petals ? f.size : 0;
      placer.rotation.set(0, -a, f.cup);
      placer.scale.set(0.85 * size, 0.035 + 0.12 * size, 0.48 * size);
      placer.updateMatrix();
      petals.setMatrixAt(6 * i + k, placer.matrix);
      petals.setColorAt(6 * i + k, tone.set(f.tint).multiplyScalar(0.82 + (i % 4) * 0.045));
      petalStems[6 * i + k] = f.stem;
    }
    placer.rotation.set(0, f.turn, 0);
    placer.position.set(f.x, f.z + 0.035, f.y);
    placer.scale.set(0.35 * f.size, 0.045, 0.35 * f.size);
    placer.updateMatrix();
    discs.setMatrixAt(i, placer.matrix);
  }
  swayInstances(stemGeometry, stemMaterial, stemLengths, time, true);
  swayInstances(petalGeometry, petalMaterial, petalStems, time);
  swayInstances(discGeometry, discMaterial, stemLengths, time);
  for (let b = 0; b < BUTTERFLIES; b++) {
    for (let side = 0; side < 2; side++) {
      wings.setColorAt(2 * b + side, tone.set(b % 3 === 0 ? "#b98536" : b % 3 === 1 ? "#d5c99b" : "#ab7655"));
    }
  }
  const meshes = [petals, stems, discs, wings, bodies];
  return {
    meshes,
    wings,
    bodies,
    object: placer,
    time,
    alarms: Array.from({ length: BUTTERFLIES }, (): Alarm => ({ at: -100, x: 0, y: 0 })),
    pose: { x: 0, y: 0, z: 0, heading: 0, bank: 0, wing: 0 } as ButterflyPose,
    dispose() {
      for (const m of meshes) m.dispose();
      for (const g of [petalGeometry, stemGeometry, discGeometry, wingGeometry, bodyGeometry]) g.dispose();
      for (const m of [stemMaterial, petalMaterial, discMaterial, wingMaterial, bodyMaterial]) m.dispose();
    },
  };
}

type FlowerField = ReturnType<typeof buildFlowers>;

/** Sway the blooms and fly the butterflies; landing or carried sheep startle nearby ones. */
function updateField(field: FlowerField, world: MeadowWorld, time: number, delta: number) {
  field.time.value = time;
  for (let b = 0; b < BUTTERFLIES; b++) {
    const alarm = field.alarms[b];
    const pose = butterflyPose(b, time, field.pose, alarm);
    if (delta > 0 && time - alarm.at >= 10) {
      for (let i = 0; i < world.members.length; i++) {
        const m = world.members[i];
        if (
          m.member.kind === "sheep" &&
          !(m.pose.z > 10) &&
          (i === world.drag.index || m.falling || (m.landAge >= 0 && m.landAge < 0.3)) &&
          startle(time, pose, m.pose.x, m.pose.y, alarm)
        )
          break;
      }
    }
    for (let side = -1; side <= 1; side += 2) {
      const span = 0.3 * Math.cos(pose.wing);
      field.object.position.set(
        pose.x + Math.sin(pose.heading) * side * span,
        pose.z + 0.3 * Math.sin(pose.wing),
        pose.y - Math.cos(pose.heading) * side * span,
      );
      field.object.rotation.set(0, Math.PI / 2 - pose.heading, side * pose.wing + pose.bank);
      field.object.scale.set(0.33, 0.025, 0.48);
      field.object.updateMatrix();
      field.wings.setMatrixAt(2 * b + (side + 1) / 2, field.object.matrix);
    }
    field.object.position.set(pose.x, pose.z + 0.045, pose.y);
    field.object.rotation.set(0, Math.PI / 2 - pose.heading, pose.bank);
    field.object.scale.set(0.045, 0.055, 0.24);
    field.object.updateMatrix();
    field.bodies.setMatrixAt(b, field.object.matrix);
  }
  field.wings.instanceMatrix.needsUpdate = field.bodies.instanceMatrix.needsUpdate = true;
}

/** Wildflower drifts with butterflies hopping between blooms. */
export function Flowers({ world }: { world: MeadowWorld }) {
  const field = useMemo(() => buildFlowers(), []);
  useEffect(() => () => field.dispose(), [field]);
  useClock((time, delta) => updateField(field, world, time, delta));
  return (
    <>
      {field.meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} dispose={null} />
      ))}
    </>
  );
}
