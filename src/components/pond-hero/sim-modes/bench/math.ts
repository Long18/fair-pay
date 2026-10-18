export const TAU = 2 * Math.PI;

export type Rng = () => number;

/** mulberry32 — seeded so the park layout is identical on every load. */
export function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function hash2(x: number, y: number): number {
  let a = (x | 0) * 0x165667b1 + (y | 0) * 0x27d4eb2f;
  a = (a ^ (a >> 13)) * 0x4bf19f61;
  return ((a ^ (a >> 16)) & 0x7fffffff) / 0x7fffffff;
}

export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + hash2(ix + 1, iy + 1)) * u * v;
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Signed shortest turn from angle `from` to angle `to`. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const pickFrom = <T>(items: readonly T[], r: Rng): T => items[(r() * items.length) | 0];

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}

export function ctx2d(cv: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return ctx;
}

export const dprCap = () => (typeof devicePixelRatio === "number" ? Math.min(devicePixelRatio, 2) : 1);
