import type { Rng } from "./types";

export const TAU = 2 * Math.PI;

/** Park–Miller style LCG used by the original for deterministic scenery. */
export function seeded(seed: number): Rng {
  let s = seed;
  return () => (s = (16807 * s + 13) % 0x7fffffff) / 0x7fffffff;
}

export function filmGrain(intensity: number, popThreshold: number, popAmp: number): number {
  const r = Math.random();
  if (r < 0.6 * popThreshold) return popAmp * (0.5 + 0.5 * Math.random()) * intensity;
  if (r < popThreshold) return -(popAmp * (0.3 + 0.4 * Math.random()) * intensity);
  return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * intensity * 2;
}

export function rgb(r: number, g: number, b: number): string {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function angleDiff(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Turn `from` toward `to` along the shortest arc by fraction `k` (clamped to 1). */
export function turnToward(from: number, to: number, k: number): number {
  return from + angleDiff(from, to) * Math.min(k, 1);
}

export function fillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function fillEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
  ctx.fill();
}

export function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.sqrt((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2);
}

/** Lens radius for a w×h field. */
export function lensRadius(w: number, h: number): number {
  return 0.22 * Math.min(w, h);
}
