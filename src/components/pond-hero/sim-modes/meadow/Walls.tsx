import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PAINTED, WOOD, ball, paint, rod, type Part } from "./paint";
import {
  GATE_DIR,
  GATE_LEFT,
  GATE_RIGHT,
  GATE_WIDTH,
  MEADOW_ROCKS,
  MEADOW_TROUGH,
  WALL_SEGMENTS,
  meadowTerrainHeight,
} from "./world";

const STONES = ["#a49d87", "#b1a892", "#969980", "#b9ad95"];
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const ground = meadowTerrainHeight;

function propParts(): Part[] {
  const parts: Part[] = [];
  for (const { from, to } of WALL_SEGMENTS) {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.ceil(length / 1.35);
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    for (let course = 0; course < 3; course++) {
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5 + (course % 2 ? 0.25 : 0)) / count;
        if (t > 1) continue;
        const x = from[0] + (to[0] - from[0]) * t;
        const y = from[1] + (to[1] - from[1]) * t;
        parts.push([
          box((length / count) * 0.95, 0.48, 0.8 - 0.12 * course),
          STONES[(k + course) % STONES.length],
          PAINTED,
          [x, ground(x, y) + 0.24 + 0.45 * course, y],
          [0, -angle + 0.025 * Math.sin(3 * k), 0.04 * Math.sin(4 * k)],
        ]);
        if (course === 2 && k % 3 === 0) {
          parts.push([ball(0.45, 6, 3), "#79845b", PAINTED, [x, ground(x, y) + 1.34, y], undefined, [1, 0.2, 0.6]]);
        }
      }
    }
  }
  for (const [x, y, r] of MEADOW_ROCKS) {
    const h = ground(x, y);
    parts.push(
      [new THREE.IcosahedronGeometry(r, 1), STONES[Math.floor(x) % 4], PAINTED, [x, h + 0.4 * r, y], [0, x, 0.15], [1, 0.65, 0.8]],
      [ball(0.8 * r, 7, 4), "#7c895a", PAINTED, [x - 0.15, h + 0.93 * r, y], undefined, [1, 0.16, 0.7]],
    );
  }
  for (const [x, y] of [GATE_LEFT, GATE_RIGHT]) {
    parts.push([rod(0.26, 2.4, 6), "#837158", WOOD, [x, ground(x, y) + 1.2, y]]);
  }
  const hinge = { x: GATE_LEFT[0], y: GATE_LEFT[1] };
  for (const rail of [0.65, 1.45]) {
    parts.push([
      box(GATE_WIDTH, 0.17, 0.18),
      "#958166",
      WOOD,
      [hinge.x + (GATE_DIR.x * GATE_WIDTH) / 2, ground(hinge.x, hinge.y) + rail, hinge.y + (GATE_DIR.y * GATE_WIDTH) / 2],
      [0, -3.05, 0],
    ]);
  }
  for (const along of [0.15, GATE_WIDTH / 2, GATE_WIDTH - 0.15]) {
    parts.push([
      box(0.16, 1.5, 0.18),
      "#796951",
      WOOD,
      [hinge.x + GATE_DIR.x * along, ground(hinge.x, hinge.y) + 1.05, hinge.y + GATE_DIR.y * along],
      [0, -3.05, 0],
    ]);
  }
  const { x: tx, y: ty } = MEADOW_TROUGH;
  const th = ground(tx, ty);
  parts.push(
    [box(3.8, 0.25, 1.65), "#827f6d", PAINTED, [tx, th + 0.15, ty]],
    [box(3.35, 0.06, 1.16), "#607f76", PAINTED, [tx, th + 0.65, ty]],
  );
  for (const s of [-1, 1]) {
    parts.push(
      [box(3.8, 0.9, 0.23), "#b1a58e", PAINTED, [tx, th + 0.55, ty + 0.77 * s]],
      [box(0.25, 0.9, 1.4), "#a39780", PAINTED, [tx + 1.8 * s, th + 0.55, ty]],
    );
  }
  for (const [x, y, lean] of [
    [201, 522.5, 0.12],
    [199.8, 523.1, -0.15],
  ]) {
    parts.push(
      [ball(0.72, 8, 6), "#b8a47c", [0.94, 0, 0.3, 0], [x, ground(x, y) + 0.65, y], [0, 0, lean], [0.8, 1.15, 0.7]],
      [rod(0.14, 0.17, 6), "#8f7d5c", WOOD, [x, ground(x, y) + 1.42, y]],
    );
  }
  return parts;
}

export function Walls({ paint: material }: { paint: THREE.Material }) {
  const mesh = useMemo(() => {
    const instanced = new THREE.InstancedMesh(paint(propParts()), material, 1);
    instanced.setMatrixAt(0, new THREE.Matrix4());
    instanced.castShadow = instanced.receiveShadow = true;
    return instanced;
  }, [material]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} dispose={null} />;
}
