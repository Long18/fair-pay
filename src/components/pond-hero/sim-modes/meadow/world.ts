import { fractalNoise } from "./noise";

export type Point = { x: number; y: number };

/* ------------------------------------------------------------------ pond */

export const MEADOW_POND = { x: 310, y: 552, rx: 15, ry: 13, level: 23.5 };

export function pondEdge(angle: number): number {
  return 1 + 0.1 * Math.sin(3 * angle + 0.4) + 0.055 * Math.sin(5 * angle - 1.2);
}

/** 1 on the shoreline, < 1 inside the pond. */
export function pondRadius(x: number, y: number): number {
  const dx = (x - MEADOW_POND.x) / MEADOW_POND.rx;
  const dy = (y - MEADOW_POND.y) / MEADOW_POND.ry;
  return Math.hypot(dx, dy) / pondEdge(Math.atan2(dy, dx));
}

export function pondDepth(x: number, y: number): number {
  const r = pondRadius(x, y);
  return r < 1 ? 1.1 * (1 - r * r) : 0;
}

function pondFloor(x: number, y: number, ground: number): number {
  if (Math.abs(x - MEADOW_POND.x) > 4.1 * MEADOW_POND.rx || Math.abs(y - MEADOW_POND.y) > 4.1 * MEADOW_POND.ry)
    return ground;
  const r = pondRadius(x, y);
  if (r >= 3.5) return ground;
  const blend = Math.min(1, Math.max(0, (r - 1.05) / 2.45));
  const basin =
    r <= 1
      ? MEADOW_POND.level - 1.1 + 1.1 * r * r
      : MEADOW_POND.level + 1.1 * (1 - Math.exp(-2 * (r - 1)));
  return basin + (ground - basin) * blend * blend * (3 - 2 * blend);
}

/** Merge a dense band of samples around the pond into a terrain axis. */
export function pondAxis(axis: number[], center: number, radius: number): number[] {
  return [
    ...new Set([
      ...axis,
      ...Array.from({ length: 81 }, (_, i) => center - 1.4 * radius + (i / 80) * radius * 2.8),
    ]),
  ].sort((a, b) => a - b);
}

export const POND_RIPPLE_GLSL = /* glsl */ `
  float pondRipple(float distance, float age) {
    if (age < 0.) return 0.;
    return exp(-pow((distance - age * 3.2) / .35, 2.)) * exp(-age * 1.6);
  }
`;

/* --------------------------------------------------------------- terrain */

export const MEADOW_BOUNDS = { left: -1100, top: -1300, width: 3800, height: 2650 };
export const MEADOW_CENTER: Point = { x: 265, y: 510 };
export const MEADOW_WIDTH = 320;
export const MEADOW_SUBJECT_SCALE = 1.25;

const HILLS = [
  [186, 458, 16, 84, 76, -0.32],
  [315, 455, 15, 81, 80, 0.35],
  [208, 570, 14, 90, 68, 0.18],
  [354, 557, 17, 66, 85, -0.25],
  [269, 518, -10, 59, 90, 0.2],
].map(([x, y, rise, rx, ry, turn]) => ({ x, y, rise, rx, ry, cos: Math.cos(turn), sin: Math.sin(turn) }));

export function meadowHeight(x: number, y: number): number {
  let h = 5 + 3 * fractalNoise(x / 80, y / 80, 41, 3);
  h += 7 * Math.exp(-Math.pow((x - 200) / 43, 2)) + 8 * Math.exp(-Math.pow((x - 310) / 48, 2));
  const wx = x + (fractalNoise(x / 95, y / 95, 83, 2) - 0.5) * 18;
  const wy = y + (fractalNoise(x / 95, y / 95, 97, 2) - 0.5) * 18;
  for (const hill of HILLS) {
    const dx = wx - hill.x;
    const dy = wy - hill.y;
    const u = (dx * hill.cos + dy * hill.sin) / hill.rx;
    const v = (-dx * hill.sin + dy * hill.cos) / hill.ry;
    h += hill.rise * Math.exp(-(u * u + v * v));
  }
  return h;
}

export function meadowTerrainHeight(x: number, y: number): number {
  return pondFloor(x, y, meadowHeight(x, y));
}

/** Terrain sample positions: coarse outside the 320-unit meadow, dense inside. */
export function meadowAxis(start: number, end: number, center: number): number[] {
  const inner0 = center - 320;
  const inner1 = center + 320;
  return Array.from({ length: 193 }, (_, i) =>
    i <= 32
      ? start + ((inner0 - start) * i) / 32
      : i <= 160
        ? inner0 + ((inner1 - inner0) * (i - 32)) / 128
        : inner1 + ((end - inner1) * (i - 160)) / 32,
  );
}

const GRASS_DRY = [163, 156, 79];
const GRASS_LUSH = [83, 130, 59];
const GRASS_DEEP = [49, 111, 80];
const GRASS_SHORE = [104, 111, 72];

/** Unlit grass pigment (0–255 sRGB) at a map position with terrain height `h`. */
export function meadowGrass(x: number, y: number, h: number, out: number[] = [0, 0, 0]): number[] {
  const dryness = Math.min(1, Math.max(0, (h - 12) / 22));
  const broad = fractalNoise(x / 86, y / 110, 73, 2);
  const streak = fractalNoise(x / 32 + 0.6 * broad, y / 65, 131, 3);
  const deep = Math.min(
    0.85,
    Math.max(0, (fractalNoise(x / 65 + 1.2 * broad, y / 94 - 0.8 * broad, 211, 3) - 0.36) * 2.4 + (1 - dryness) * 0.26),
  );
  const dry = Math.min(0.72, Math.max(0, 0.62 * dryness + (streak - 0.5) * 0.48 + (broad - 0.5) * 0.18));
  for (let c = 0; c < 3; c += 1) {
    const green = GRASS_LUSH[c] + (GRASS_DEEP[c] - GRASS_LUSH[c]) * deep;
    out[c] = green + (GRASS_DRY[c] - green) * dry;
  }
  const shore = 0.55 * Math.max(0, Math.min(1, (1.045 - pondRadius(x, y)) / 0.065));
  for (let c = 0; c < 3; c += 1) out[c] += (GRASS_SHORE[c] - out[c]) * shore;
  return out;
}

/* ----------------------------------------------------------- footpath */

const PATH_POINTS: [number, number][] = [
  [30, 615], [65, 601], [101, 586], [130, 568], [151, 557], [185, 539], [207, 523],
  [231, 512], [262, 521], [287, 505], [305, 469], [331, 433], [357, 399], [387, 363],
  [417, 327], [447, 291], [477, 255], [507, 219], [537, 183], [567, 147],
];

export type PathSample = { x: number; y: number; width: number };

/** Catmull–Rom sampled footpath. */
export function meadowPath(): PathSample[] {
  const out: PathSample[] = [];
  for (let seg = 0; seg < PATH_POINTS.length - 1; seg += 1) {
    const p0 = PATH_POINTS[Math.max(0, seg - 1)];
    const p1 = PATH_POINTS[seg];
    const p2 = PATH_POINTS[seg + 1];
    const p3 = PATH_POINTS[Math.min(PATH_POINTS.length - 1, seg + 2)];
    for (let k = 0; k < 24; k += 1) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      const axis = (c: 0 | 1) =>
        0.5 *
        (2 * p1[c] +
          (-p0[c] + p2[c]) * t +
          (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
          (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
      out.push({ x: axis(0), y: axis(1), width: 1.3 + 0.22 * Math.sin((seg + t) * 4.1) });
    }
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  out.push({ x: last[0], y: last[1], width: 1.3 });
  return out;
}

export const PATH_FIELD = { left: 0, top: 100, width: 640, height: 560, size: 1024 };

/** R8 wear field (0–255) for the footpath, sampled over PATH_FIELD. */
export function meadowPathField(path: PathSample[] = meadowPath()): Uint8Array {
  const { left, top, width, height, size } = PATH_FIELD;
  const field = new Uint8Array(size * size);
  const cellX = width / (size - 1);
  const cellY = height / (size - 1);
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const reach = Math.max(a.width, b.width) + 0.75;
    const x0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - reach - left) / cellX));
    const x1 = Math.min(size - 1, Math.ceil((Math.max(a.x, b.x) + reach - left) / cellX));
    const y0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - reach - top) / cellY));
    const y1 = Math.min(size - 1, Math.ceil((Math.max(a.y, b.y) + reach - top) / cellY));
    for (let row = y0; row <= y1; row += 1) {
      for (let col = x0; col <= x1; col += 1) {
        const px = left + col * cellX;
        const py = top + row * cellY;
        const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / len2)) : 0;
        const dist = Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
        const k = Math.min(1, Math.max(0, (a.width + (b.width - a.width) * t + 0.65 - dist) / 1.2));
        const v = Math.round(255 * k * k * (3 - 2 * k));
        const idx = row * size + col;
        field[idx] = Math.max(field[idx], v);
      }
    }
  }
  return field;
}

/* ------------------------------------------------------------- props */

export const MEADOW_ROCKS: [number, number, number][] = [
  [192, 492, 1.7],
  [194, 495, 1],
  [334, 558, 2.1],
  [338, 559, 1.25],
  [339, 556, 0.8],
];

export type MeadowTree = { x: number; y: number; scale: number; turn: number };

export const MEADOW_TREES: MeadowTree[] = [
  { x: 193, y: 590, scale: 2.15, turn: 0.3 },
  { x: 206, y: 610, scale: 1.35, turn: 1.8 },
  { x: 177, y: 489, scale: 1.18, turn: 2.6 },
  { x: 345, y: 449, scale: 1.3, turn: 1.2 },
  { x: 356, y: 459, scale: 0.92, turn: 2.1 },
  { x: 349, y: 565, scale: 1.42, turn: 0.8 },
  { x: 359, y: 570, scale: 0.98, turn: 2.8 },
];

export const MEADOW_TROUGH = { x: 195, y: 526, halfWidth: 1.9, halfDepth: 0.85 };

/* ------------------------------------------------------- dry-stone walls */

export const GATE_LEFT: [number, number] = [172.5, 541.6];
export const GATE_RIGHT: [number, number] = [183.5, 544.5];
/** Direction of the open gate leaf from the left post. */
export const GATE_DIR = { x: -0.9958083245390612, y: 0.0914646422324372 };
export const GATE_WIDTH = Math.hypot(GATE_RIGHT[0] - GATE_LEFT[0], GATE_RIGHT[1] - GATE_LEFT[1]);

export type Segment = { from: [number, number]; to: [number, number] };

const toSegments = (pts: [number, number][]): Segment[] =>
  pts.slice(1).map((to, i) => ({ from: pts[i], to }));

export const WALL_SEGMENTS: Segment[] = [
  ...toSegments([[30, 526], [85, 529], [135, 535], GATE_LEFT]),
  ...toSegments([
    GATE_RIGHT, [193, 547], [216, 553.5], [242, 560], [277, 570], [314, 581],
    [355, 594], [402, 612], [456, 634], [510, 656],
  ]),
];

const BARRIERS: Segment[] = [
  ...WALL_SEGMENTS,
  {
    from: GATE_LEFT,
    to: [GATE_LEFT[0] + GATE_DIR.x * GATE_WIDTH, GATE_LEFT[1] + GATE_DIR.y * GATE_WIDTH],
  },
];

export type WallHit = { x: number; y: number; nx: number; ny: number; distance: number };

export const wallHit = (): WallHit => ({ x: 0, y: 0, nx: 0, ny: 0, distance: Infinity });

/** Closest point on any wall (including the open gate leaf) with outward normal. */
export function nearestWall(x: number, y: number, out: WallHit): WallHit {
  out.distance = Infinity;
  for (const { from, to } of BARRIERS) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / len2));
    const px = from[0] + t * dx;
    const py = from[1] + t * dy;
    const dist = Math.hypot(x - px, y - py);
    if (dist >= out.distance) continue;
    out.x = px;
    out.y = py;
    out.distance = dist;
    out.nx = dist > 1e-4 ? (x - px) / dist : -dy / Math.sqrt(len2);
    out.ny = dist > 1e-4 ? (y - py) / dist : dx / Math.sqrt(len2);
  }
  return out;
}

const wallScratch = wallHit();

export function keepOffWalls<T extends Point>(x: number, y: number, out: T): T {
  for (let i = 0; i < 3; i++) {
    nearestWall(x, y, wallScratch);
    if (wallScratch.distance >= 2.1) break;
    x = wallScratch.x + 2.1 * wallScratch.nx;
    y = wallScratch.y + 2.1 * wallScratch.ny;
  }
  out.x = x;
  out.y = y;
  return out;
}

export const treeRadius = (scale: number) => 0.65 * scale + 1.25;

/** Push a point out of tree trunks; true when it moved. */
export function keepOffTrees<T extends Point>(x: number, y: number, out: T): boolean {
  let moved = false;
  for (const tree of MEADOW_TREES) {
    const dx = x - tree.x;
    const dy = y - tree.y;
    const dist = Math.hypot(dx, dy);
    const reach = treeRadius(tree.scale) + 0.2;
    if (dist >= reach) continue;
    x = tree.x + (dist > 1e-4 ? dx / dist : 1) * reach;
    y = tree.y + (dist > 1e-4 ? dy / dist : 0) * reach;
    moved = true;
  }
  out.x = x;
  out.y = y;
  return moved;
}

/* ------------------------------------------------------------ camera */

export type CameraRig = {
  fov: number;
  distance: number;
  turn: number;
  scale: number;
  pivot: Point;
};

/** Perspective rig that frames the 320-unit meadow across the canvas width. */
export function meadowRig(viewport: { width: number; height: number }): CameraRig {
  const rectHeight = (MEADOW_WIDTH * viewport.height) / Math.max(1, viewport.width);
  const rect = {
    x: MEADOW_CENTER.x - MEADOW_WIDTH / 2,
    y: MEADOW_CENTER.y - rectHeight / 2,
    width: MEADOW_WIDTH,
    height: rectHeight,
  };
  const tilt = ((54 - 20 * Math.min(Math.max((rect.width - 500) / 1800, 0), 1)) * Math.PI) / 180;
  const perspective = 1.3 * Math.max(viewport.width, viewport.height);
  const h = Math.max(viewport.height, 1);
  return {
    fov: (2 * Math.atan(h / 2 / perspective) * 180) / Math.PI,
    distance: perspective,
    turn: Math.PI / 2 - tilt,
    scale: Math.max(viewport.width, 1) / rect.width,
    pivot: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
  };
}

/** Light offset from the meadow centre (map x, height, map y). */
export const SUN_OFFSET: [number, number, number] = [-480, 230, 240];
