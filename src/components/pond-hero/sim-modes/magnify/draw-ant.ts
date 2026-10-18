import type { Ant } from "./types";

const TAU = 2 * Math.PI;

const LEGS = [
  { attachY: -0.18, restAngle: -0.7, len: 0.38 },
  { attachY: -0.18, restAngle: 0.7, len: 0.38 },
  { attachY: -0.1, restAngle: -1.45, len: 0.4 },
  { attachY: -0.1, restAngle: 1.45, len: 0.4 },
  { attachY: -0.02, restAngle: -2.25, len: 0.36 },
  { attachY: -0.02, restAngle: 2.25, len: 0.36 },
];
/** Tripod gait: legs 0, 3, 4 swing together, the rest in antiphase. */
const TRIPOD_A = new Set([0, 3, 4]);

const HAIR_SIN = new Float32Array(64);
const HAIR_COS = new Float32Array(64);
const HAIR_OFFSET = new Float32Array(64);
const HAIR_SIZE = new Float32Array(64);
{
  let seed = 31337;
  const rng = () => (seed = (16807 * seed + 13) % 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    HAIR_SIN[i] = Math.sin(a);
    HAIR_COS[i] = Math.cos(a);
    HAIR_OFFSET[i] = (rng() - 0.3) * 0.9;
    HAIR_SIZE[i] = 0.22 + 0.18 * rng();
  }
}

function lerpRgb(t: number, r0: number, g0: number, b0: number, r1: number, g1: number, b1: number): string {
  return `rgb(${(r0 + (r1 - r0) * t) | 0}, ${(g0 + (g1 - g0) * t) | 0}, ${(b0 + (b1 - b0) * t) | 0})`;
}

function gloss(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  const g = ctx.createRadialGradient(x - 0.3 * rx, y - 0.35 * ry, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, "rgba(255, 245, 225, 0.18)");
  g.addColorStop(0.4, "rgba(255, 240, 215, 0.05)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** Adds tiny bristle dots around an ellipse outline to the current path. */
function hairs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  size: number,
  offset: number,
) {
  const n = Math.min(Math.round((rx + ry) * 2.2), 64 - offset);
  for (let k = 0; k < n; k++) {
    const i = (offset + k) % 64;
    const o = HAIR_OFFSET[i] * size;
    const px = x + HAIR_COS[i] * (rx + o);
    const py = y + HAIR_SIN[i] * (ry + o);
    const r = HAIR_SIZE[i] * size;
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, TAU);
  }
}

export function drawAnt(ctx: CanvasRenderingContext2D, ant: Ant) {
  if (!ant.alive || (ant.enteringHole >= 0 && ant.enterProgress >= 1)) return;
  const emerge = ant.emergeTimer > 0 ? Math.max(0.15, 1 - ant.emergeTimer / 0.6) : 1;
  const enter = ant.enteringHole >= 0 ? Math.max(0.05, 1 - ant.enterProgress) : 1;
  const l = 16 * ant.size * (emerge * enter);
  const bp = ant.burnProgress;
  const char = bp > 0.7 ? Math.min(1, ((bp - 0.7) / 0.3) ** 2) : 0;
  const limb =
    char > 0
      ? lerpRgb(ant.shade, 32 + 180 * char, 18 + 80 * char, 12 + 20 * char, 55 + 160 * char, 35 + 60 * char, 22 + 10 * char)
      : lerpRgb(ant.shade, 32, 18, 12, 55, 35, 22);
  const body =
    char > 0
      ? lerpRgb(ant.shade, 48 + 190 * char, 30 + 130 * char, 20 + 80 * char, 70 + 170 * char, 48 + 120 * char, 30 + 70 * char)
      : lerpRgb(ant.shade, 48, 30, 20, 70, 48, 30);
  const s = ant.size;

  ctx.save();
  ctx.translate(ant.x, ant.y);
  ctx.rotate(ant.angle + 0.5 * Math.PI);

  ctx.fillStyle = "#0a0804";
  ctx.globalAlpha = 0.04;
  ctx.beginPath();
  ctx.ellipse(1.5, 2, 0.32 * l, 0.58 * l, 0.05, 0, TAU);
  ctx.moveTo(1.3 + 0.24 * l, 1.7);
  ctx.ellipse(1.3, 1.7, 0.24 * l, 0.5 * l, 0.05, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.ellipse(1.2, 1.5, 0.16 * l, 0.4 * l, 0.05, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  const swing = 0.32 * Math.sin(ant.legPhase);
  ctx.strokeStyle = limb;
  ctx.lineWidth = 0.7 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const leg = LEGS[i];
    const phase = TRIPOD_A.has(i) ? swing : -swing;
    const ox = i % 2 === 0 ? -0.1 * l * 0.6 : 0.1 * l * 0.6;
    const oy = leg.attachY * l;
    const femurA = leg.restAngle + phase;
    const femur = leg.len * l * 0.5;
    const tibia = leg.len * l * 0.55;
    const kx = ox + Math.sin(femurA) * femur;
    const ky = oy - Math.cos(femurA) * femur * 0.3;
    const tibiaA = femurA + (i % 2 === 0 ? -0.4 : 0.4);
    const fx = kx + Math.sin(tibiaA) * tibia;
    const fy = ky - Math.cos(tibiaA) * tibia * 0.15;
    ctx.moveTo(ox, oy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
  }
  ctx.stroke();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0.3 * l, 0.16 * l, 0.2 * l, 0, 0, TAU);
  ctx.moveTo(0.1 * l, -0.12 * l);
  ctx.ellipse(0, -0.12 * l, 0.1 * l, 0.16 * l, 0, 0, TAU);
  ctx.moveTo(0.14 * l, -0.38 * l);
  ctx.ellipse(0, -0.38 * l, 0.14 * l, 0.14 * l, 0, 0, TAU);
  ctx.moveTo(0.04 * l, 0.1 * l);
  ctx.arc(0, 0.1 * l, 0.04 * l, 0, TAU);
  ctx.fill();
  gloss(ctx, 0, 0.3 * l, 0.16 * l, 0.2 * l);
  gloss(ctx, 0, -0.12 * l, 0.1 * l, 0.16 * l);
  gloss(ctx, 0, -0.38 * l, 0.14 * l, 0.14 * l);

  ctx.fillStyle = limb;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  hairs(ctx, 0, 0.3 * l, 0.16 * l, 0.2 * l, s, 0);
  hairs(ctx, 0, -0.12 * l, 0.1 * l, 0.16 * l, s, 13);
  hairs(ctx, 0, -0.38 * l, 0.14 * l, 0.14 * l, s, 26);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#0a0600";
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = (0.24 + 0.09 * i) * l;
    const hw = (0.16 - 0.03 * i) * l;
    ctx.moveTo(-hw, y);
    ctx.quadraticCurveTo(0, y + 0.4 * s, hw, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = limb;
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  ctx.arc(-0.14 * l * 0.4, -0.52 * l, 0.14 * l * 0.4, 0.2, 1.8);
  ctx.moveTo(0.14 * l * 0.4 + 0.037449836007442235 * l * 0.4, -0.52 * l + 0.13489814595840702 * l * 0.4);
  ctx.arc(0.14 * l * 0.4, -0.52 * l, 0.14 * l * 0.4, 1.3, 2.9);
  ctx.stroke();

  const eyeY = -0.38 * l - 0.14 * l * 0.15;
  ctx.fillStyle = "#050302";
  ctx.beginPath();
  ctx.arc(-0.14 * l * 0.6, eyeY, 0.6 * s, 0, TAU);
  ctx.moveTo(0.14 * l * 0.6 + 0.6 * s, eyeY);
  ctx.arc(0.14 * l * 0.6, eyeY, 0.6 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(-0.14 * l * 0.6 - 0.2, eyeY - 0.3, 0.25 * s, 0, TAU);
  ctx.moveTo(0.14 * l * 0.6 - 0.2 + 0.25 * s, eyeY - 0.3);
  ctx.arc(0.14 * l * 0.6 - 0.2, eyeY - 0.3, 0.25 * s, 0, TAU);
  ctx.fill();

  const sway = 0.15 * Math.sin(0.7 * ant.legPhase);
  const scan = ant.state === "scanning" ? 0.35 * Math.sin(2 * ant.legPhase) : 0;
  ctx.strokeStyle = body;
  ctx.lineWidth = 0.5 * s;
  const baseY = -0.492 * l;
  const scape = 2.88 * s;
  const flagellum = 3.52 * s;
  const leftBaseX = -0.14 * l * 0.3;
  const rightBaseX = 0.14 * l * 0.3;
  const la = -0.5 + sway - scan;
  const lkx = leftBaseX + Math.sin(la) * scape;
  const lky = baseY - Math.cos(la) * scape;
  const lta = la - 0.8;
  const ltx = lkx + Math.sin(lta) * flagellum;
  const lty = lky - Math.cos(lta) * flagellum;
  const ra = 0.5 - sway + scan;
  const rkx = rightBaseX + Math.sin(ra) * scape;
  const rky = baseY - Math.cos(ra) * scape;
  const rta = ra + 0.8;
  const rtx = rkx + Math.sin(rta) * flagellum;
  const rty = rky - Math.cos(rta) * flagellum;
  ctx.beginPath();
  ctx.moveTo(leftBaseX, baseY);
  ctx.lineTo(lkx, lky);
  ctx.lineTo(ltx, lty);
  ctx.moveTo(rightBaseX, baseY);
  ctx.lineTo(rkx, rky);
  ctx.lineTo(rtx, rty);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(ltx, lty, 0.35 * s, 0, TAU);
  ctx.moveTo(rtx + 0.35 * s, rty);
  ctx.arc(rtx, rty, 0.35 * s, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const TRAIL_BUCKETS: [number, number, number][][] = [[], [], [], []];
const TRAIL_ALPHA = [0.01, 0.03, 0.05, 0.07];

/** Pheromone trail dots, batched into four alpha buckets. */
export function drawTrail(ctx: CanvasRenderingContext2D, ant: Ant) {
  if (ant.trail.length < 2) return;
  ctx.fillStyle = "rgba(75, 55, 30, 1)";
  for (const bucket of TRAIL_BUCKETS) bucket.length = 0;
  for (const dot of ant.trail) {
    const a = Math.max(0, 1 - dot.age / 4.5) * dot.strength * 0.08;
    if (a < 0.003) continue;
    TRAIL_BUCKETS[Math.min(3, (50 * a) | 0)].push([dot.x, dot.y, 0.6 + 0.5 * dot.strength]);
  }
  for (let b = 0; b < 4; b++) {
    if (TRAIL_BUCKETS[b].length === 0) continue;
    ctx.globalAlpha = TRAIL_ALPHA[b];
    ctx.beginPath();
    for (const [x, y, r] of TRAIL_BUCKETS[b]) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Scorch halo, glow, smoke wisps and white-hot core as an ant heats up. */
export function drawBurnGlow(ctx: CanvasRenderingContext2D, ant: Ant) {
  if (!ant.alive || ant.burnProgress <= 0) return;
  const bp = ant.burnProgress;
  const time = performance.now() / 1e3;
  ctx.save();
  ctx.translate(ant.x, ant.y);
  const haloR = 8 + 6 * bp;
  const haloA = 0.45 * bp;
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
  halo.addColorStop(0, `rgba(25, 12, 3, ${haloA})`);
  halo.addColorStop(0.5, `rgba(55, 30, 10, ${0.5 * haloA})`);
  halo.addColorStop(1, "rgba(80, 50, 25, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, TAU);
  ctx.fill();
  if (bp > 0.15) {
    const k = (bp - 0.15) / 0.85;
    const strength = k < 0.5 ? 0.6 * k : 0.3 + (k - 0.5) * 1.4;
    const flicker = 0.9 + 0.1 * Math.sin(6 * time + time * bp * 8);
    const r = 5 + 5 * bp;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255, 200, 100, ${strength * flicker * 0.8})`);
    g.addColorStop(0.4, `rgba(255, 150, 50, ${strength * flicker * 0.35})`);
    g.addColorStop(1, "rgba(255, 100, 20, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }
  if (bp > 0.3) {
    const alpha = (bp - 0.3) * 0.35;
    const wisps = bp > 0.6 ? 2 : 1;
    ctx.lineCap = "round";
    for (let n = 0; n < wisps; n++) {
      const seed = 2.7 * n + 40 * ant.shade;
      const x0 = (n - (wisps - 1) * 0.5) * 2.5;
      const c1 = 1.5 * Math.sin(1.8 * time + seed);
      const c2 = 2 * Math.sin(2.5 * time + seed + 1.5);
      const hgt = 14 + 22 * bp;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(140, 130, 118, 0.8)";
      ctx.lineWidth = 0.6 + 0.4 * bp;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.bezierCurveTo(x0 + c1, -(0.33 * hgt), x0 + c2, -(0.66 * hgt), x0 + c1 + 0.5 * c2, -hgt);
      ctx.stroke();
      if (bp > 0.5) {
        ctx.globalAlpha = (bp - 0.5) * 0.12;
        ctx.lineWidth = 2 + 2 * bp;
        ctx.strokeStyle = "rgba(150, 140, 128, 0.4)";
        ctx.beginPath();
        ctx.moveTo(x0, -2);
        ctx.bezierCurveTo(x0 + 1.2 * c1, -(0.33 * hgt), x0 + 1.3 * c2, -(0.66 * hgt), x0 + 1.5 * c1 + 0.7 * c2, -(1.1 * hgt));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  if (bp > 0.5) {
    const k = (bp - 0.5) * 2;
    const strength = k * k * 1.5;
    const flicker = 0.85 + 0.12 * Math.sin(12 * time) + 0.05 * Math.sin(19 * time);
    const r = 3 + 5 * strength;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255, 240, 180, ${0.85 * strength * flicker})`);
    g.addColorStop(0.35, `rgba(255, 180, 60, ${0.5 * strength * flicker})`);
    g.addColorStop(1, "rgba(255, 100, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }
  if (bp > 0.7) {
    const k = (bp - 0.7) / 0.3;
    const strength = k * k * k;
    const r = 3 + 5 * strength;
    ctx.globalAlpha = 0.85 * strength * (0.9 + 0.1 * Math.sin(20 * time));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, "rgba(255, 255, 245, 0.95)");
    g.addColorStop(0.3, "rgba(255, 240, 180, 0.6)");
    g.addColorStop(0.7, "rgba(255, 200, 80, 0.2)");
    g.addColorStop(1, "rgba(255, 150, 40, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
