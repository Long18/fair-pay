import { fractalNoise } from "../../gl/paper";
import type { Rgb } from "../shared/sim-frame";
import type { Circle, Rng } from "./types";
import {
  TAU,
  clampByte,
  fillCircle,
  fillEllipse,
  filmGrain,
  rgb,
  seeded,
} from "./util";

let holeCacheW = 0;
let holeCacheH = 0;
let holeCache: Circle[] = [];

/** The two colony entrances (deterministic per field size). */
export function antHoles(w: number, h: number): Circle[] {
  if (holeCacheW === w && holeCacheH === h) return holeCache;
  holeCacheW = w;
  holeCacheH = h;
  const rng = seeded(321);
  holeCache = [
    { x: w * (0.25 + 0.5 * rng()), y: h * (0.3 + 0.4 * rng()), r: 6 + 4 * rng() },
    { x: w * (0.6 + 0.25 * rng()), y: h * (0.55 + 0.3 * rng()), r: 4 + 3 * rng() },
  ];
  return holeCache;
}

export function holeIndexNear(x: number, y: number, w: number, h: number, radius = 18): number {
  const holes = antHoles(w, h);
  for (let i = 0; i < holes.length; i++) {
    const dx = x - holes[i].x;
    const dy = y - holes[i].y;
    if (dx * dx + dy * dy < radius * radius) return i;
  }
  return -1;
}

/** Wandering stroke that follows the noise field (cracks, faint ridges). */
function noiseStroke(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  startX: number,
  startY: number,
  steps: number,
  scale: number,
  step: number,
  offset: number,
) {
  let x = startX;
  let y = startY;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let s = 0; s < steps; s++) {
    const a = fractalNoise(x * scale + offset, y * scale) * TAU;
    x += Math.cos(a) * (step + rng() * step * 0.8);
    y += Math.sin(a) * (step + rng() * step * 0.8);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawHole(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  r: number,
  big: boolean,
) {
  const spread = big ? 3.5 : 2.8;
  const spoilCount = big ? 35 : 20;
  const spoilDir = rng() * TAU;
  const spoilArc = 0.8 + 0.4 * rng();
  for (let i = 0; i < spoilCount; i++) {
    const a = spoilDir + (rng() - 0.5) * Math.PI * spoilArc;
    const d = r * (0.8 + rng() * (spread - 0.5));
    const size = 0.5 + 1.5 * rng();
    const c = (125 + 35 * rng()) | 0;
    fillCircle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, size, rgb(c, 0.78 * c, 0.55 * c), 0.1 + 0.15 * rng());
  }
  const ring = (inner: number, outer: number, stops: [number, string][], alpha: number) => {
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, r * inner, x, y, r * outer);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * outer, 0, TAU);
    ctx.fill();
  };
  ring(
    0.6,
    spread,
    [
      [0, "rgba(150,122,85,0.9)"],
      [0.25, "rgba(140,112,75,0.6)"],
      [0.55, "rgba(130,105,68,0.25)"],
      [1, "rgba(120,95,60,0)"],
    ],
    big ? 0.35 : 0.25,
  );
  ring(
    0.45,
    1.4,
    [
      [0, "rgba(95,68,38,0.9)"],
      [0.5, "rgba(115,88,55,0.5)"],
      [0.8, "rgba(130,105,68,0.2)"],
      [1, "rgba(130,105,70,0)"],
    ],
    big ? 0.35 : 0.25,
  );
  fillEllipse(ctx, x - 0.3 * r, y - 0.35 * r, 0.6 * r, 0.25 * r, -0.4, "rgba(200,175,140,1)", 0.12);
  fillEllipse(ctx, x + 0.25 * r, y + 0.3 * r, 0.5 * r, 0.2 * r, -0.3, "rgba(30,18,8,1)", 0.18);
  ctx.globalAlpha = big ? 0.8 : 0.65;
  const pit = ctx.createRadialGradient(x, y, 0, x, y, 0.75 * r);
  pit.addColorStop(0, "rgba(8,3,1,1)");
  pit.addColorStop(0.3, "rgba(15,8,3,0.95)");
  pit.addColorStop(0.6, "rgba(30,18,8,0.7)");
  pit.addColorStop(0.85, "rgba(50,32,15,0.3)");
  pit.addColorStop(1, "rgba(70,48,25,0)");
  ctx.fillStyle = pit;
  ctx.beginPath();
  ctx.ellipse(x, y, 0.75 * r, 0.6 * r, 0.5 * rng() - 0.25, 0, TAU);
  ctx.fill();
  fillEllipse(ctx, x + 0.8, y + 0.6, 0.35 * r, 0.28 * r, 0.1, "rgba(4,1,0,1)", big ? 0.55 : 0.4);
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "rgba(160,130,90,1)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(x - 0.5, y - 0.5, 0.55 * r, -1.2, 0.8);
  ctx.stroke();
  for (let i = 0; i < (big ? 30 : 18); i++) {
    const a = rng() * TAU;
    const d = r * (0.5 + rng() * (spread - 0.3));
    fillCircle(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d,
      0.3 + 1.2 * rng(),
      rgb(120 + 40 * rng(), 95 + 30 * rng(), 65 + 25 * rng()),
      0.12 + 0.12 * rng(),
    );
  }
  for (let i = 0; i < (big ? 4 : 2); i++) {
    const a = rng() * TAU;
    const len = r * (3 + 4 * rng());
    ctx.globalAlpha = 0.04 + 0.03 * rng();
    ctx.strokeStyle = "rgba(100,75,45,1)";
    ctx.lineWidth = 1.5 + rng();
    let px = x + Math.cos(a) * r * 0.8;
    let py = y + Math.sin(a) * r * 0.8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let k = 0; k < 8; k++) {
      px += (Math.cos(a + (rng() - 0.5) * 0.6) * len) / 8;
      py += (Math.sin(a + (rng() - 0.5) * 0.6) * len) / 8;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

/** Faint dark crumbs scattered around a dropped item. */
function crumbScatter(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  radius: number,
  count: number,
) {
  ctx.fillStyle = "rgba(8,4,2,1)";
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU;
    const d = radius * (0.5 + 0.7 * rng());
    const size = 0.3 + 0.8 * rng();
    ctx.globalAlpha = 0.03 + 0.04 * rng();
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, size, 0, TAU);
    ctx.fill();
  }
}

/** Candy, wrapped sweet, crumb, paper scrap and husk. Returns the round candy (ants steer around it). */
function drawLitter(ctx: CanvasRenderingContext2D, w: number, h: number): Circle {
  const rng = seeded(1337);
  const m = Math.min(w, h);
  const shadow = "#0a0804";
  let obstacle: Circle;

  {
    const n = 0.032 * m + rng() * m * 0.008;
    const x = w * (0.68 + 0.15 * rng());
    const y = h * (0.22 + 0.15 * rng());
    const rot = rng() * TAU;
    obstacle = { x, y, r: 1.2 * n };
    const red = rng() > 0.5;
    const c = red ? [175, 30, 25] : [30, 70, 150];
    const dark = red ? [120, 15, 12] : [15, 40, 100];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(1.5, 2.5, 1.3 * n, 1.1 * n, 0.08, 0, TAU);
    ctx.fill();
    crumbScatter(ctx, rng, 1, 2, 1.5 * n, 20);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = rgb(dark[0] + 10, dark[1] + 8, dark[2] + 8);
    ctx.beginPath();
    for (let t = 0; t <= 42; t++) {
      const a = (t / 42) * TAU;
      const rr = t % 2 === 0 ? 1.08 * n : 0.92 * n;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.6;
    const body = ctx.createRadialGradient(-(0.15 * n), -(0.15 * n), 0, 0, 0, 0.9 * n);
    body.addColorStop(0, rgb(c[0] + 40, c[1] + 30, c[2] + 30));
    body.addColorStop(0.5, rgb(c[0] + 10, c[1] + 5, c[2] + 5));
    body.addColorStop(1, rgb(c[0] - 20, c[1] - 10, c[2] - 10));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, 0.88 * n, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = rgb(dark[0] + 25, dark[1] + 18, dark[2] + 18);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 0.82 * n, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    const dish = ctx.createRadialGradient(0.1 * n, 0.1 * n, 0.1 * n, 0, 0, 0.75 * n);
    dish.addColorStop(0, "rgba(0,0,0,0.4)");
    dish.addColorStop(0.6, "rgba(0,0,0,0.1)");
    dish.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dish;
    ctx.beginPath();
    ctx.arc(0, 0, 0.75 * n, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = rgb(220, 215, 200);
    ctx.beginPath();
    ctx.arc(0, 0, 0.5 * n, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = rgb(180, 175, 160);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 0.5 * n, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.ellipse(-(0.3 * n), -(0.35 * n), 0.35 * n, 0.12 * n, -0.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "rgba(70,50,30,1)";
    ctx.beginPath();
    ctx.ellipse(0.3 * n, 0.2 * n, 0.5 * n, 0.3 * n, 0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  {
    const n = 0.045 * m + rng() * m * 0.015;
    const t = n * (0.35 + 0.15 * rng());
    const c = rng() > 0.5 ? [195, 170, 45] : [170, 40, 120];
    ctx.save();
    ctx.translate(w * (0.12 + 0.2 * rng()), h * (0.72 + 0.15 * rng()));
    ctx.rotate(rng() * Math.PI - 0.5 * Math.PI);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(1.5, 2, 0.55 * n, 0.8 * t, 0.1, 0, TAU);
    ctx.fill();
    crumbScatter(ctx, rng, 1, 1.5, 0.6 * n, 15);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = rgb(c[0], c[1], c[2]);
    ctx.beginPath();
    ctx.moveTo(-(0.5 * n), -(0.4 * t) + 2 * rng());
    ctx.lineTo(-(0.35 * n), -(0.5 * t));
    ctx.lineTo(0.35 * n, -(0.48 * t) + 1.5 * rng());
    ctx.lineTo(0.5 * n, -(0.3 * t) + 2 * rng());
    ctx.lineTo(0.48 * n, 0.4 * t);
    ctx.lineTo(0.3 * n, 0.5 * t);
    ctx.lineTo(-(0.32 * n), 0.48 * t);
    ctx.lineTo(-(0.5 * n), 0.35 * t);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = rgb(c[0] + 40, c[1] + 30, c[2] + 30);
    ctx.fillRect(-(0.3 * n), -(0.15 * t), 0.6 * n, 0.12 * t);
    ctx.fillRect(-(0.3 * n), 0.08 * t, 0.6 * n, 0.12 * t);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const x1 = (rng() - 0.5) * n * 0.9;
      const y1 = (rng() - 0.5) * t * 0.9;
      const x2 = x1 + (rng() - 0.5) * n * 0.4;
      const y2 = y1 + (rng() - 0.5) * t * 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "rgba(255,255,240,1)";
    ctx.beginPath();
    ctx.ellipse(-(0.1 * n), -(0.1 * t), 0.15 * n, 0.2 * t, 0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = rgb(c[0] - 20, c[1] - 15, c[2] - 10);
    ctx.beginPath();
    ctx.ellipse(-(0.48 * n), 0, 0.08 * n, 0.6 * t, -0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.48 * n, 0, 0.08 * n, 0.55 * t, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  {
    const x = w * (0.42 + 0.2 * rng());
    const y = h * (0.38 + 0.2 * rng());
    const s = 0.016 * m + rng() * m * 0.008;
    fillEllipse(ctx, x + 1, y + 1.2, 1.4 * s, 0.9 * s, 0.3 * rng(), shadow, 0.08);
    crumbScatter(ctx, rng, x + 0.5, y + 0.8, 1.6 * s, 12);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = rgb(210 + 25 * rng(), 155 + 25 * rng(), 170 + 15 * rng());
    ctx.beginPath();
    const start = rng() * TAU;
    for (let t = 0; t < 8; t++) {
      const a = start + (t / 8) * TAU;
      const rr = s * (0.8 + 0.4 * rng());
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.65;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    fillEllipse(ctx, x, y - 0.1 * s, 0.6 * s, 0.35 * s, 0.2, rgb(225 + 20 * rng(), 180 + 15 * rng(), 190 + 10 * rng()), 0.2);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(140,90,100,1)";
    ctx.lineWidth = 0.8;
    for (let t = 0; t < 4; t++) {
      const ly = y - 0.3 * s + t * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(x - 0.7 * s, ly + rng());
      ctx.lineTo(x + 0.7 * s, ly + rng());
      ctx.stroke();
    }
    for (let t = 0; t < 6; t++) {
      fillCircle(
        ctx,
        x + (rng() - 0.5) * s * 1.6,
        y + (rng() - 0.5) * s,
        0.3 + 0.6 * rng(),
        "rgba(55,35,20,1)",
        0.1 + 0.06 * rng(),
      );
    }
  }

  {
    const n = 0.035 * m + rng() * m * 0.012;
    const t = n * (0.7 + 0.4 * rng());
    ctx.save();
    ctx.translate(w * (0.55 + 0.25 * rng()), h * (0.62 + 0.2 * rng()));
    ctx.rotate(rng() * Math.PI - 0.5 * Math.PI);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(1.5, 2, 0.55 * n, 0.45 * t, 0.1, 0, TAU);
    ctx.fill();
    crumbScatter(ctx, rng, 1, 1.5, 0.6 * n, 14);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = rgb(238 + 12 * rng(), 232 + 10 * rng(), 218 + 10 * rng());
    ctx.beginPath();
    ctx.moveTo(2 * rng(), 0);
    ctx.lineTo(0.4 * n, -2 * rng());
    ctx.lineTo(0.7 * n, 2 * rng());
    ctx.lineTo(n, 3 * rng());
    ctx.lineTo(n + 2 * rng(), 0.3 * t);
    ctx.lineTo(n - 3 * rng(), 0.5 * t);
    ctx.lineTo(n + rng(), 0.7 * t);
    ctx.lineTo(n - 2 * rng(), t);
    ctx.lineTo(0.5 * n, t + 2 * rng());
    ctx.lineTo(3 * rng(), t - 2 * rng());
    ctx.lineTo(-(2 * rng()), 0.6 * t);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "rgba(100,130,190,1)";
    ctx.lineWidth = 0.4;
    const rule = t / 6;
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(2, k * rule);
      ctx.lineTo(n - 2, k * rule);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(200,80,80,1)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0.18 * n, 1);
    ctx.lineTo(0.18 * n, t - 1);
    ctx.stroke();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "rgba(50,50,60,1)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    let sx = 0.25 * n;
    let sy = 1.5 * rule;
    ctx.moveTo(sx, sy);
    for (let k = 0; k < 12; k++) {
      sx += 2 + 2 * rng();
      sy += (rng() - 0.5) * 2;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "rgba(160,140,80,1)";
    ctx.fillRect(0, 0, n, t);
    ctx.restore();
  }

  {
    const x = w * (0.28 + 0.15 * rng());
    const y = h * (0.18 + 0.15 * rng());
    const s = 0.014 * m + rng() * m * 0.005;
    const rot = rng() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    fillEllipse(ctx, 0.5, 0.8, 0.6 * s, 0.25 * s, 0, shadow, 0.08);
    crumbScatter(ctx, rng, 0.5, 0.8, 0.7 * s, 10);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = rgb(45 + 15 * rng(), 35 + 10 * rng(), 25 + 8 * rng());
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.5 * s, 0.2 * s, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(200,195,180,1)";
    ctx.lineWidth = 0.08 * s;
    ctx.beginPath();
    ctx.moveTo(-(0.4 * s), 0);
    ctx.lineTo(0.4 * s, 0);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = rgb(50 + 15 * rng(), 40 + 10 * rng(), 28 + 8 * rng());
    ctx.beginPath();
    ctx.ellipse(0.15 * s, 0.15 * s, 0.4 * s, 0.18 * s, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  return obstacle;
}

function drawGroundDetail(ctx: CanvasRenderingContext2D, w: number, h: number): Circle {
  const pebbleRng = seeded(42);
  ctx.lineCap = "round";

  const speckRng = seeded(999);
  const specks = Math.round(w * h * 8e-4);
  for (let i = 0; i < specks; i++) {
    const x = speckRng() * w;
    const y = speckRng() * h;
    const r = 0.3 + 1.2 * speckRng();
    const c = 75 + 65 * speckRng();
    fillCircle(ctx, x, y, r, rgb(c + 10, 0.82 * c, 0.6 * c), 0.06 + 0.08 * speckRng());
  }

  const blotchRng = seeded(555);
  for (let i = 0; i < 6; i++) {
    const x = blotchRng() * w;
    const y = blotchRng() * h;
    const r = 15 + 35 * blotchRng();
    ctx.globalAlpha = 0.04 + 0.03 * blotchRng();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(60,42,25,0.8)");
    g.addColorStop(0.6, "rgba(70,50,30,0.3)");
    g.addColorStop(1, "rgba(80,58,35,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  const crackRng = seeded(666);
  for (let i = 0; i < 5; i++) {
    const x = crackRng() * w;
    const y = crackRng() * h;
    ctx.globalAlpha = 0.04 + 0.03 * crackRng();
    ctx.strokeStyle = rgb(65 + 25 * crackRng(), 45 + 20 * crackRng(), 28 + 15 * crackRng());
    ctx.lineWidth = 0.4 + 0.8 * crackRng();
    noiseStroke(ctx, crackRng, x, y, 12 + ((8 * crackRng()) | 0), 0.02, 3, 50 * i);
  }

  const pebbles = Math.round(w * h * 18e-5);
  for (let i = 0; i < pebbles; i++) {
    const x = pebbleRng() * w;
    const y = pebbleRng() * h;
    const r = 0.8 + 5.5 * pebbleRng();
    const c = 80 + 80 * pebbleRng();
    const alpha = 0.1 + 0.2 * pebbleRng();
    const tint = pebbleRng();
    fillEllipse(
      ctx,
      x,
      y,
      r,
      r * (0.55 + 0.45 * pebbleRng()),
      pebbleRng() * Math.PI,
      rgb(
        c + (tint > 0.5 ? 10 : -8) + 15 * Number(tint > 0.8),
        0.9 * c + (tint > 0.7 ? 5 : -3),
        0.75 * c - 6 * Number(tint > 0.5),
      ),
      alpha,
    );
    fillEllipse(ctx, x + 0.6, y + 1, 0.95 * r, 0.55 * r, pebbleRng() * Math.PI, "rgba(25,16,8,1)", 0.3 * alpha);
    if (r > 2) {
      fillEllipse(ctx, x - 0.2 * r, y - 0.25 * r, 0.3 * r, 0.2 * r, -0.3, "rgba(255,250,240,0.9)", 0.4 * alpha);
    }
  }

  const twigRng = seeded(789);
  for (let i = 0; i < 5; i++) {
    const x = twigRng() * w;
    const y = twigRng() * h;
    const a = twigRng() * Math.PI;
    const len = 8 + 18 * twigRng();
    const c = 70 + 40 * twigRng();
    ctx.globalAlpha = 0.12 + 0.08 * twigRng();
    ctx.strokeStyle = rgb(c, 0.7 * c, 0.45 * c);
    ctx.lineWidth = 0.8 + 1.2 * twigRng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
    if (twigRng() > 0.4) {
      const at = 0.4 + 0.4 * twigRng();
      const bx = x + Math.cos(a) * len * at;
      const by = y + Math.sin(a) * len * at;
      const ba = a + (twigRng() > 0.5 ? 0.6 : -0.6) + 0.3 * twigRng();
      ctx.lineWidth = 0.5 + 0.5 * twigRng();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * len * 0.35, by + Math.sin(ba) * len * 0.35);
      ctx.stroke();
    }
  }

  const seedRng = seeded(456);
  for (let i = 0; i < 3; i++) {
    const x = seedRng() * w;
    const y = seedRng() * h;
    const a = seedRng() * Math.PI;
    const rx = 4 + 6 * seedRng();
    const ry = 2 + 3 * seedRng();
    const c = 100 + 55 * seedRng();
    fillEllipse(ctx, x, y, rx, ry, a, rgb(c + 15, 0.75 * c, 0.4 * c), 0.1 + 0.08 * seedRng());
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = rgb(0.6 * c, 0.45 * c, 0.25 * c);
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * rx * 0.8, y - Math.sin(a) * rx * 0.8);
    ctx.lineTo(x + Math.cos(a) * rx * 0.8, y + Math.sin(a) * rx * 0.8);
    ctx.stroke();
  }

  const holes = antHoles(w, h);
  const holeRng = seeded(321);
  for (let i = 0; i < 6; i++) holeRng();
  drawHole(ctx, holeRng, holes[0].x, holes[0].y, holes[0].r, true);
  drawHole(ctx, holeRng, holes[1].x, holes[1].y, holes[1].r, false);

  const litter = document.createElement("canvas");
  litter.width = w;
  litter.height = h;
  const litterCtx = litter.getContext("2d");
  let obstacle: Circle = { x: 0, y: 0, r: 0 };
  if (litterCtx) {
    obstacle = drawLitter(litterCtx, w, h);
    ctx.save();
    ctx.filter = "blur(1.2px)";
    ctx.globalAlpha = 0.7;
    ctx.drawImage(litter, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(litter, 0, 0);
    ctx.restore();
  }

  const ridgeRng = seeded(888);
  ctx.strokeStyle = "rgba(80,55,32,1)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.025;
    noiseStroke(ctx, ridgeRng, ridgeRng() * w, ridgeRng() * h, 20, 0.015, 5, 80 * i);
  }

  const hairlineRng = seeded(123);
  ctx.strokeStyle = "rgb(55,40,25)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.055;
    noiseStroke(
      ctx,
      hairlineRng,
      hairlineRng() * w,
      hairlineRng() * h,
      8 + ((10 * hairlineRng()) | 0),
      0.03,
      6,
      100 * i,
    );
  }

  return obstacle;
}

/**
 * Paint the static sandy ground (rounded noisy edge fading into `backdrop`,
 * holes, litter, light). Returns the round candy ants avoid.
 */
export function renderGround(canvas: HTMLCanvasElement, w: number, h: number, backdrop: Rgb): Circle {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  canvas.width = pw;
  canvas.height = ph;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx || pw <= 0 || ph <= 0) return { x: 0, y: 0, r: 0 };

  const img = ctx.createImageData(pw, ph);
  const data = img.data;
  const margin = 0.005 * Math.min(pw, ph);
  const cx = pw / 2;
  const cy = ph / 2;
  const innerW = cx - margin;
  const innerH = cy - margin;
  const corner = 0.28 * Math.min(innerW, innerH);
  const edgeNoise = 0.06 * Math.min(pw, ph) * 0.28;
  const fade = 0.18 * Math.min(pw, ph);

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = (y * pw + x) * 4;
      const dx = Math.abs(x - cx) - (innerW - corner);
      const dy = Math.abs(y - cy) - (innerH - corner);
      let sdf =
        Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0) - corner;
      sdf += (2 * fractalNoise(x, y) - 1) * edgeNoise;
      if (sdf > 0) {
        data[idx] = backdrop.r;
        data[idx + 1] = backdrop.g;
        data[idx + 2] = backdrop.b;
        data[idx + 3] = 255;
        continue;
      }
      const n1 = fractalNoise(0.006 * x + 100, 0.006 * y + 100);
      const n2 = fractalNoise(0.018 * x + 200, 0.018 * y + 200);
      const n3 = fractalNoise(0.045 * x + 300, 0.045 * y + 300);
      const n4 = fractalNoise(0.1 * x + 400, 0.1 * y + 400);
      const damp = fractalNoise(0.01 * x + 500, 0.01 * y + 500);
      const v = 0.4 * n1 + 0.3 * n2 + 0.2 * n3 + 0.1 * n4;
      let r: number;
      let g: number;
      let b: number;
      if (v < 0.35) {
        const k = v / 0.35;
        r = 125 + 35 * k;
        g = 98 + 37 * k;
        b = 68 + 32 * k;
      } else if (v < 0.65) {
        const k = (v - 0.35) / 0.3;
        r = 160 + 35 * k;
        g = 135 + 37 * k;
        b = 100 + 38 * k;
      } else {
        const k = (v - 0.65) / 0.35;
        r = 195 + 23 * k;
        g = 172 + 28 * k;
        b = 138 + 30 * k;
      }
      if (damp > 0.55) {
        const k = ((damp - 0.55) / 0.45) * 0.25;
        r = r * (1 - k) + 178 * k;
        g = g * (1 - k) + 128 * k;
        b = b * (1 - k) + 85 * k;
      }
      const relief =
        18 *
        ((fractalNoise((x - 1) * 0.008 + 700, 0.008 * y + 700) -
          fractalNoise((x + 1) * 0.008 + 700, 0.008 * y + 700)) *
          0.5 +
          (fractalNoise(0.008 * x + 700, (y - 1) * 0.008 + 700) -
            fractalNoise(0.008 * x + 700, (y + 1) * 0.008 + 700)) *
            0.5);
      r += relief;
      g += 0.9 * relief;
      b += 0.75 * relief;
      const jitter = (Math.random() - 0.5) * 10;
      r += jitter;
      g += 0.85 * jitter;
      b += 0.65 * jitter;
      const grain = filmGrain(9, 0.015, 1.2);
      r += grain;
      g += grain;
      b += grain;
      if (-sdf < fade) {
        const k = -sdf / fade;
        const s = k * k * (3 - 2 * k);
        const inv = 1 - s;
        r = r * s + backdrop.r * inv;
        g = g * s + backdrop.g * inv;
        b = b * s + backdrop.b * inv;
      }
      data[idx] = clampByte(r);
      data[idx + 1] = clampByte(g);
      data[idx + 2] = clampByte(b);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  const obstacle = drawGroundDetail(ctx, w, h);
  ctx.globalAlpha = 1;

  const sun = ctx.createRadialGradient(0.2 * w, 0.15 * h, 0.02 * w, 0.35 * w, 0.35 * h, 0.6 * w);
  sun.addColorStop(0, "rgba(255, 248, 220, 0.12)");
  sun.addColorStop(0.3, "rgba(255, 242, 200, 0.07)");
  sun.addColorStop(0.6, "rgba(255, 238, 190, 0.03)");
  sun.addColorStop(1, "rgba(255, 235, 180, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "rgba(255, 245, 215, 1)";
  ctx.fillRect(0, 0, w, h);
  const leak = ctx.createRadialGradient(0.08 * w, 0.08 * h, 0, 0.08 * w, 0.08 * h, 0.4 * w);
  leak.addColorStop(0, "rgba(255, 250, 230, 0.08)");
  leak.addColorStop(0.4, "rgba(255, 245, 215, 0.04)");
  leak.addColorStop(1, "rgba(255, 240, 200, 0)");
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  return obstacle;
}
