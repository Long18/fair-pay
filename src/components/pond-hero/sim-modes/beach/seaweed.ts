import { seededRandom, type Ctx2D } from "./util";

export type Seaweed = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  colorIdx: number;
  seed: number;
  density: number;
};

type Strand = { sx: number; sy: number; cx1: number; cy1: number; ex: number; ey: number; lw: number; fade: number };

const SEAWEED_COLORS = [
  { a: "#8A8258", b: "#7E7850", c: "#96905E" },
  { a: "#8E8660", b: "#827A55", c: "#9A9468" },
  { a: "#807C58", b: "#747050", c: "#8C8860" },
  { a: "#888460", b: "#7C7855", c: "#949068" },
];

/** Strands bucketed by color so each clump needs only three strokeStyle changes. */
const buckets: Strand[][] = [[], [], []];

export function createSeaweed(w: number, h: number): Seaweed[] {
  const rand = seededRandom(161803);
  const out: Seaweed[] = [];
  for (let n = 0; n < 9; n++) {
    out.push({
      x: w * (0.06 + 0.88 * rand()),
      y: h * (0.42 + (rand() - 0.5) * 0.1),
      scaleX: 8 + 16 * rand(),
      scaleY: 4 + 6 * rand(),
      colorIdx: (rand() * SEAWEED_COLORS.length) | 0,
      seed: (99999 * rand()) | 0,
      density: (35 + 40 * rand()) | 0,
    });
  }
  return out;
}

export function drawSeaweed(ctx: Ctx2D, clumps: Seaweed[], time: number) {
  ctx.lineCap = "round";
  for (const clump of clumps) {
    const palette = SEAWEED_COLORS[clump.colorIdx % SEAWEED_COLORS.length];
    const rand = seededRandom(clump.seed);
    const colors = [palette.a, palette.b, palette.c];
    const sway = 1.5 * Math.sin(0.4 * time + clump.seed);
    buckets[0].length = 0;
    buckets[1].length = 0;
    buckets[2].length = 0;
    for (let i = 0; i < clump.density; i++) {
      const gx = (rand() + rand() + rand()) / 3 - 0.5;
      const gy = (rand() + rand() + rand()) / 3 - 0.5;
      const sx = gx * clump.scaleX * 2 + sway;
      const sy = gy * clump.scaleY * 2;
      const nx = sx / clump.scaleX;
      const ny = sy / clump.scaleY;
      const edge = Math.min(1, Math.max(0, (Math.sqrt(nx * nx + ny * ny) + (rand() - 0.5) * 0.4 - 0.3) / 0.7));
      const fade = 1 - edge * edge;
      if (fade < 0.05) continue;
      const wiggle = 1.2 * Math.sin(0.5 * time + 0.7 * i + 0.1 * clump.seed) * fade;
      const len = 2 + 4 * rand();
      const dir = rand() * Math.PI * 2;
      const ex = sx + Math.cos(dir) * len + wiggle;
      const ey = sy + Math.sin(dir) * len;
      const cx1 = (sx + ex) / 2 + (rand() - 0.5) * len;
      const cy1 = (sy + ey) / 2 + (rand() - 0.5) * len;
      const lw = (0.8 + 1.8 * rand()) * (0.5 + 0.5 * fade);
      buckets[(7 * i) % 3].push({ sx, sy, cx1, cy1, ex, ey, lw, fade });
    }
    ctx.save();
    ctx.translate(clump.x, clump.y);
    for (let b = 0; b < 3; b++) {
      const strands = buckets[b];
      if (strands.length === 0) continue;
      ctx.strokeStyle = colors[b];
      for (const s of strands) {
        ctx.globalAlpha = 0.5 * s.fade;
        ctx.lineWidth = s.lw;
        ctx.beginPath();
        ctx.moveTo(s.sx, s.sy);
        ctx.quadraticCurveTo(s.cx1, s.cy1, s.ex, s.ey);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
