import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useClock } from "./clock";
import type { MeadowWorld } from "./simulation";
import { MEADOW_POND, pondEdge } from "./world";

/** [angle, radius fraction, size, turn] for each lily pad. */
const PADS: [number, number, number, number][] = [
  [0.38, 0.74, 1.05, 2.2],
  [0.59, 0.84, 1.28, 0.6],
  [0.82, 0.67, 1.45, 3.4],
  [1.08, 0.82, 1.1, 4.7],
  [1.24, 0.64, 0.93, 1.3],
];
const TAU = 2 * Math.PI;

function padAt(index: number) {
  const [angle, frac, size, turn] = PADS[index];
  const r = pondEdge(angle) * frac;
  return {
    x: MEADOW_POND.x + Math.cos(angle) * MEADOW_POND.rx * r,
    y: MEADOW_POND.y + Math.sin(angle) * MEADOW_POND.ry * r,
    size,
    turn,
  };
}

const PERCHES = [padAt(0), padAt(4)];
const ease = (t: number) => t * t * (3 - 2 * t);
const padHeight = (index: number, time: number) => MEADOW_POND.level + 0.09 + 0.018 * Math.sin(1.15 * time + 1.7 * index);

type FlyPose = { x: number; y: number; z: number; heading: number; pitch: number; wing: number; perched: boolean };

/** Dragonfly `d` rests on its pad, then loops out over the water and back. */
function dragonflyPose(d: number, time: number, out: FlyPose) {
  const perch = PERCHES[d];
  const period = d ? 31 : 25;
  const rest = d ? 15 : 10;
  const clock = (((time + 9 * d) % period) + period) % period;
  const flight = Math.max(0, (clock - rest) / (period - rest));
  const loop = flight * TAU + 0.8 * d;
  const reach = Math.sin(Math.PI * flight) ** 2;
  const radius = d ? 3.3 : 4.1;
  const ox = -radius * Math.cos(loop);
  const oy = -(0.7 * radius) * Math.sin(loop);
  const hover = ease(Math.min(1, 6 * flight)) * ease(Math.min(1, (1 - flight) * 6));
  out.x = perch.x + reach * ox;
  out.y = perch.y + reach * oy;
  out.z = padHeight(4 * +!!d, time) + 0.22 + hover * (0.55 + 0.9 * Math.sin(Math.PI * flight) ** 6);
  out.perched = clock <= rest;
  if (out.perched) {
    out.heading = perch.turn;
  } else {
    const reachRate = Math.PI * Math.sin(TAU * flight);
    const vx = reachRate * ox + reach * radius * Math.sin(loop) * TAU;
    out.heading = Math.atan2(reachRate * oy - reach * radius * 0.7 * Math.cos(loop) * TAU, vx);
  }
  out.pitch = out.perched ? -0.06 : 0.1 * Math.sin(flight * TAU);
  out.wing = out.perched ? 0.05 : 0.14 + 0.22 * Math.sin(time * (d ? 95 : 108));
}

function buildLilies() {
  const root = new THREE.Group();
  const pads: THREE.Group[] = [];
  const flies: THREE.Group[] = [];
  const wings: THREE.Group[] = [];
  const padGeometry = new THREE.CircleGeometry(1, 28, 0.14, 2 * Math.PI - 0.28).rotateX(-Math.PI / 2);
  const petalGeometry = new THREE.SphereGeometry(1, 8, 5);
  const bodyGeometry = new THREE.SphereGeometry(1, 7, 4);
  const wingGeometry = new THREE.SphereGeometry(1, 8, 3);
  const materials = [
    new THREE.MeshStandardMaterial({ color: "#426d42", roughness: 0.62, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#294e36", roughness: 0.85, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#e4dfbf", roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: "#b69b3f", roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#347b79", roughness: 0.45, metalness: 0.14 }),
    new THREE.MeshStandardMaterial({ color: "#71603c", roughness: 0.55, metalness: 0.08 }),
    new THREE.MeshStandardMaterial({ color: "#c0c7b4", transparent: true, opacity: 0.47, roughness: 0.42, depthWrite: false }),
  ];
  for (let i = 0; i < PADS.length; i++) {
    const pad = padAt(i);
    const group = new THREE.Group();
    group.position.set(pad.x, padHeight(i, 0), pad.y);
    group.rotation.y = pad.turn;
    const top = new THREE.Mesh(padGeometry, materials[0]);
    top.scale.set(pad.size, 1, 0.85 * pad.size);
    top.receiveShadow = true;
    const under = new THREE.Mesh(padGeometry, materials[1]);
    under.position.y = -0.025;
    under.scale.set(1.025 * pad.size, 1, 0.875 * pad.size);
    group.add(under, top);
    if (i === 2) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeometry, materials[2]);
        petal.position.set(0.23 * Math.cos(a), 0.19, 0.23 * Math.sin(a));
        petal.scale.set(0.38, 0.085, 0.14);
        petal.rotation.y = -a;
        group.add(petal);
      }
      const heart = new THREE.Mesh(bodyGeometry, materials[3]);
      heart.position.y = 0.24;
      heart.scale.set(0.15, 0.11, 0.15);
      group.add(heart);
    }
    pads.push(group);
    root.add(group);
  }
  for (let d = 0; d < 2; d++) {
    const fly = new THREE.Group();
    const body = new THREE.Mesh(bodyGeometry, materials[4 + d]);
    body.scale.set(0.43, 0.065, 0.075);
    fly.add(body);
    const head = new THREE.Mesh(bodyGeometry, materials[1]);
    head.position.x = 0.31;
    head.scale.set(0.085, 0.075, 0.105);
    fly.add(head);
    for (const side of [-1, 1]) {
      const pair = new THREE.Group();
      for (let k = 0; k < 2; k++) {
        const wing = new THREE.Mesh(wingGeometry, materials[6]);
        wing.position.set(0.09 - 0.18 * k, 0.015, 0.3 * side);
        wing.rotation.y = side * (0.2 - 0.36 * k);
        wing.scale.set(0.15, 0.018, 0.39);
        pair.add(wing);
      }
      fly.add(pair);
      wings.push(pair);
    }
    flies.push(fly);
    root.add(fly);
  }
  const pose: FlyPose = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, wing: 0, perched: true };
  return {
    root,
    update(time: number) {
      for (let i = 0; i < pads.length; i++) {
        pads[i].position.y = padHeight(i, time);
        pads[i].rotation.z = 0.012 * Math.sin(0.7 * time + 1.3 * i);
      }
      for (let d = 0; d < flies.length; d++) {
        dragonflyPose(d, time, pose);
        flies[d].position.set(pose.x, pose.z, pose.y);
        flies[d].rotation.set(0, -pose.heading, pose.pitch);
        wings[2 * d].rotation.x = pose.wing;
        wings[2 * d + 1].rotation.x = -pose.wing;
      }
    },
    dispose() {
      padGeometry.dispose();
      petalGeometry.dispose();
      bodyGeometry.dispose();
      wingGeometry.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}

/** Bobbing lily pads (one in bloom) and two dragonflies. */
export function Lilies({ world, still }: { world: MeadowWorld; still: boolean }) {
  const lilies = useMemo(() => buildLilies(), []);
  useEffect(() => () => lilies.dispose(), [lilies]);
  useClock(() => lilies.update(still ? 0 : world.time));
  return <primitive object={lilies.root} dispose={null} />;
}
