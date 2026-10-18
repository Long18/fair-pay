import { pondPoint, type Park } from "./layout";
import { seeded, TAU } from "./math";
import { project, pt, shadowOf, SUN_X, SUN_Y, type Projector } from "./projection";

const P0 = pt();
const P1 = pt();
const P2 = pt();
const P3 = pt();

/** Bench-local frame: u along the seat, v across it, z up; all in metres. */
function benchFrame(x: number, y: number, face: number, m: number, shadow: boolean): Projector {
  const c = Math.cos(face);
  const s = Math.sin(face);
  const ns = -s;
  return (u, v, z, out) => {
    const wx = x + (ns * u + c * v) * m;
    const wy = y + (c * u + s * v) * m;
    return shadow ? shadowOf(wx, wy, z * m, out) : project(wx, wy, z * m, out);
  };
}

function quad(ctx: CanvasRenderingContext2D, p: Projector, u0: number, u1: number, v0: number, z0: number, v1: number, z1: number) {
  p(u0, v0, z0, P0);
  p(u1, v0, z0, P1);
  p(u1, v1, z1, P2);
  p(u0, v1, z1, P3);
  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.lineTo(P1.x, P1.y);
  ctx.lineTo(P2.x, P2.y);
  ctx.lineTo(P3.x, P3.y);
  ctx.closePath();
  ctx.fill();
}

function bar(ctx: CanvasRenderingContext2D, p: Projector, u: number, v0: number, z0: number, v1: number, z1: number) {
  p(u, v0, z0, P0);
  p(u, v1, z1, P1);
  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.lineTo(P1.x, P1.y);
  ctx.stroke();
}

const SEAT_SLATS = [-0.2, -0.115, -0.03, 0.055, 0.14];
const BACK_SLATS = [0.56, 0.68, 0.8];
const backV = (z: number) => -0.27 - (z - 0.5) * 0.28;

function benchFrameBars(ctx: CanvasRenderingContext2D, p: Projector) {
  for (const u of [-0.95 + 0.06, 0, 0.95 - 0.06]) {
    bar(ctx, p, u, 0.19, 0, 0.2, 0.44);
    bar(ctx, p, u, -0.2, 0, -0.22, 0.44);
    bar(ctx, p, u, -0.22, 0.44, backV(0.9), 0.9);
    if (u) {
      bar(ctx, p, u, -0.24, 0.66, 0.2, 0.64);
      bar(ctx, p, u, 0.2, 0.64, 0.2, 0.44);
    }
  }
}

function benchShadow(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, m: number) {
  const p = benchFrame(x, y, face, m, true);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 0.05 * m;
  ctx.lineCap = "round";
  for (const v of SEAT_SLATS) quad(ctx, p, -0.95, 0.95, v, 0.45, v + 0.065, 0.45);
  for (const z of BACK_SLATS) quad(ctx, p, -0.95, 0.95, backV(z), z, backV(z + 0.08), z + 0.08);
  benchFrameBars(ctx, p);
}

function benchSprite(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, m: number) {
  const p = benchFrame(x, y, face, m, false);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgb(34, 42, 38)";
  ctx.lineWidth = 0.05 * m;
  benchFrameBars(ctx, p);
  SEAT_SLATS.forEach((v, i) => {
    ctx.fillStyle = `rgb(${188 + (i % 2) * 8}, ${154 + (i % 2) * 6}, 112)`;
    quad(ctx, p, -0.95, 0.95, v, 0.45, v + 0.065, 0.45);
    ctx.fillStyle = "rgba(90, 60, 36, 0.35)";
    quad(ctx, p, -0.95, 0.95, v + 0.05, 0.45, v + 0.065, 0.45);
  });
  BACK_SLATS.forEach((z, i) => {
    ctx.fillStyle = `rgb(${166 + 6 * i}, ${132 + 5 * i}, 94)`;
    quad(ctx, p, -0.95, 0.95, backV(z), z, backV(z + 0.08), z + 0.08);
  });
  ctx.strokeStyle = "rgb(34, 42, 38)";
  for (const u of [-0.95 + 0.06, 0.95 - 0.06]) bar(ctx, p, u, -0.24, 0.66, 0.2, 0.64);
}

function blanket(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, check: string, m: number) {
  const w = 2 * m;
  const h = 1.6 * m;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = "rgb(244, 240, 230)";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = check;
  const band = 0.25 * m;
  for (let i = 0; i * band < w; i += 2) ctx.fillRect(-w / 2 + i * band, -h / 2, band, h);
  for (let i = 0; i * band < h; i += 2) ctx.fillRect(-w / 2, -h / 2 + i * band, w, band);
  const folds = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  folds.addColorStop(0, "rgba(255, 252, 240, 0.18)");
  folds.addColorStop(0.45, "rgba(60, 40, 30, 0.08)");
  folds.addColorStop(0.55, "rgba(255, 252, 240, 0.14)");
  folds.addColorStop(1, "rgba(60, 40, 30, 0.1)");
  ctx.fillStyle = folds;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = "rgba(240, 232, 214, 0.9)";
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 - 0.35 * m);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(w / 2 - 0.35 * m, h / 2);
  ctx.closePath();
  ctx.fill();
  // Basket, an apple and a cup.
  ctx.fillStyle = "rgb(168, 124, 80)";
  ctx.fillRect(0.22 * w, -(0.38 * h), 0.46 * m, 0.32 * m);
  ctx.fillStyle = "rgb(230, 90, 70)";
  ctx.beginPath();
  ctx.arc(0.12 * w, 0.3 * h, 0.08 * m, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgb(250, 250, 246)";
  ctx.beginPath();
  ctx.arc(-(0.1 * w), 0.28 * h, 0.07 * m, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function binShadow(ctx: CanvasRenderingContext2D, x: number, y: number, m: number) {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  for (let i = 0; i <= 6; i++) {
    shadowOf(x, y, (i / 6) * 0.85 * m, P0);
    ctx.beginPath();
    ctx.arc(P0.x, P0.y, 0.28 * m, 0, TAU);
    ctx.fill();
  }
}

function binSprite(ctx: CanvasRenderingContext2D, x: number, y: number, m: number) {
  const r = 0.28 * m;
  project(x, y, 0, P0);
  project(x, y, 0.85 * m, P1);
  project(x, y, 0.62 * m, P2);
  ctx.fillStyle = "rgb(48, 52, 50)";
  ctx.beginPath();
  ctx.arc(P0.x, P0.y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgb(214, 214, 206)";
  ctx.beginPath();
  ctx.arc(P2.x, P2.y, 0.86 * r * P2.k, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgb(150, 112, 70)";
  ctx.beginPath();
  ctx.ellipse(P2.x + 0.2 * r, P2.y - 0.15 * r, 0.25 * r, 0.16 * r, 0.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 54, 48, 0.85)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(P0.x + c * r, P0.y + s * r);
    ctx.lineTo(P1.x + c * r * P1.k, P1.y + s * r * P1.k);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgb(40, 58, 50)";
  ctx.lineWidth = 0.06 * m;
  ctx.beginPath();
  ctx.arc(P1.x, P1.y, r * P1.k, 0, TAU);
  ctx.stroke();
}

/** Lily leaves (notched discs) along the shore. */
function lilyLeaves(ctx: CanvasRenderingContext2D, park: Park) {
  const r = seeded(51);
  for (let i = 0; i < 16; i++) {
    const p = pondPoint(park.pond, -0.9 + 1.5 * r(), 0.72 + 0.2 * r());
    const rad = park.m * (0.2 + 0.2 * r());
    const notch = r() * TAU;
    ctx.fillStyle = `rgb(${70 + 30 * r()}, ${110 + 30 * r()}, ${70 + 20 * r()})`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, rad, notch + 0.3, notch + TAU);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 60, 40, 0.35)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.95 * rad, 0, TAU);
    ctx.stroke();
  }
}

/** Everything that never moves, painted once per layout. */
export function paintStaticProps(sprites: CanvasRenderingContext2D, shade: CanvasRenderingContext2D, park: Park) {
  const { m } = park;
  lilyLeaves(sprites, park);
  for (const b of park.blankets) blanket(sprites, b.x, b.y, b.ang, b.check, m);
  for (const b of park.benches) {
    benchShadow(shade, b.x, b.y, b.face, m);
    benchSprite(sprites, b.x, b.y, b.face, m);
  }
  binShadow(shade, park.bin.x, park.bin.y, m);
  binSprite(sprites, park.bin.x, park.bin.y, m);
}

/** A soft shadow stretched along the sun for something `height` tall. */
export function castShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, height: number, alpha: number) {
  const len = Math.hypot(SUN_X, SUN_Y) * height;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(SUN_Y, SUN_X));
  ctx.fillStyle = `rgba(0,0,0,${alpha / 3})`;
  for (let i = 0; i < 3; i++) {
    const k = 1 + 0.2 * i;
    ctx.beginPath();
    ctx.ellipse(0.5 * len, 0, 0.5 * len * k + 0.3 * radius, radius * k, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
