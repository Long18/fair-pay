import { sfx } from "../../audio/sfx";
import type { ShadowSprite, SpriteSheet } from "../shared/sprite-sheet";

export const PAPAYA_SHEET_SRC = "/pond-hero/papaya/papaya-bloom-grid-1254.webp";
export const PAPAYA_CELL = 1254;
export const PAPAYA_COLUMNS = 5;
export const PAPAYA_FRAMES = 15;
export const PAPAYA_LAST_FRAME = 14;

const FRAME_MS = [180, 130, 180, 105, 95, 105, 135, 150, 120, 130, 150, 145, 150, 160, 300];
const FRAME_START = new Float32Array(16);
for (let i = 0, t = 0; i < 15; i++) {
  FRAME_START[i] = t;
  t += FRAME_MS[i];
  FRAME_START[15] = t;
}
export const BLOOM_MS = FRAME_START[15];

export const BloomState = { closed: 0, opening: 1, open: 2, closing: 3 } as const;
export type BloomState = (typeof BloomState)[keyof typeof BloomState];

export type Papaya = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  state: BloomState;
  phaseMs: number;
  frame: number;
};

export function papayaCell(frame: number): [number, number, number] {
  return [(frame % PAPAYA_COLUMNS) * PAPAYA_CELL, ((frame / PAPAYA_COLUMNS) | 0) * PAPAYA_CELL, PAPAYA_CELL];
}

function frameAt(ms: number): number {
  if (ms <= 0) return 0;
  if (ms >= BLOOM_MS) return 14;
  for (let i = 0; i < 15; i++) if (ms < FRAME_START[i + 1]) return i;
  return 14;
}

export function isBlooming(papayas: Papaya[]): boolean {
  for (const p of papayas) {
    if (p.state === BloomState.opening || p.state === BloomState.closing) return true;
  }
  return false;
}

/** Plays the bloom at double speed; ticks a soft "unfurl" on every frame change. */
export function advanceBloom(papayas: Papaya[], dtMs: number, fieldWidth: number) {
  const step = 2 * dtMs;
  for (const p of papayas) {
    const prevFrame = p.frame;
    const opening = p.state === BloomState.opening;
    if (p.state === BloomState.opening) {
      p.phaseMs += step;
      if (p.phaseMs >= BLOOM_MS) {
        p.phaseMs = BLOOM_MS;
        p.frame = 14;
        p.state = BloomState.open;
      } else {
        p.frame = frameAt(p.phaseMs);
      }
    } else if (p.state === BloomState.closing) {
      p.phaseMs -= step;
      if (p.phaseMs <= 0) {
        p.phaseMs = 0;
        p.frame = 0;
        p.state = BloomState.closed;
      } else {
        p.frame = frameAt(p.phaseMs);
      }
    }
    if (p.frame !== prevFrame) sfx.unfurl(p.x / fieldWidth, p.phaseMs / BLOOM_MS, opening);
  }
}

export function hitPapaya(papayas: Papaya[], x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < papayas.length; i++) {
    const p = papayas[i];
    const r = 0.45 * p.size;
    const dx = x - p.x;
    const dy = y - p.y;
    const d = dx * dx + dy * dy;
    if (d < r * r && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

export function drawPapayas(
  ctx: CanvasRenderingContext2D,
  papayas: Papaya[],
  sheet: SpriteSheet,
  shadows: ShadowSprite[] | null,
  dpr: number,
  w: number,
  h: number,
) {
  if (shadows) {
    for (const p of papayas) {
      const reach = 1.25 * p.size * 0.7;
      if (p.x + reach < 0 || p.x - reach > w || p.y + reach < 0 || p.y - reach > h) continue;
      const size = 1.25 * p.size;
      const half = 0.5 * size;
      const drop = 0.06 * p.size;
      const cos = Math.cos(p.rotation) * dpr;
      const sin = Math.sin(p.rotation) * dpr;
      ctx.globalAlpha = 0.34 * p.opacity;
      ctx.setTransform(cos, sin, -sin, cos, dpr * p.x, dpr * (p.y + drop));
      ctx.drawImage(shadows[p.frame], -half, -half, size, size);
    }
  }
  for (const p of papayas) {
    const reach = 0.7 * p.size;
    if (p.x + reach < 0 || p.x - reach > w || p.y + reach < 0 || p.y - reach > h) continue;
    const half = 0.5 * p.size;
    const cos = Math.cos(p.rotation) * dpr;
    const sin = Math.sin(p.rotation) * dpr;
    ctx.globalAlpha = p.opacity;
    ctx.setTransform(cos, sin, -sin, cos, dpr * p.x, dpr * p.y);
    const [sx, sy, cell] = papayaCell(p.frame);
    ctx.drawImage(sheet, sx, sy, cell, cell, -half, -half, p.size, p.size);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
}
