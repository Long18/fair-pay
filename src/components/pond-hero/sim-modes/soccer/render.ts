import { createEdgeMask, fractalNoise, PAPER_FRAMED, type PaperStyle } from "../../gl/paper";
import type { Rgb } from "../shared/sim-frame";

/** The pitch hole is nearly full-bleed with big soft corners (differs from the shared matte). */
const PITCH_EDGE: PaperStyle = { ...PAPER_FRAMED, edgeMargin: 0.5, cornerRadius: 30, edgeNoise: 26 };

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function filmGrain(intensity: number, popThreshold: number, popAmp: number): number {
  const r = Math.random();
  if (r < 0.6 * popThreshold) return popAmp * (0.5 + 0.5 * Math.random()) * intensity;
  if (r < popThreshold) return -(popAmp * (0.3 + 0.4 * Math.random()) * intensity);
  return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * intensity * 2;
}

/** Mown-stripe grass with noise and film grain (device pixels). */
function paintGrass(ctx: CanvasRenderingContext2D, w: number, h: number, mask: Float32Array, bg: Rgb) {
  const image = ctx.createImageData(w, h);
  const data = image.data;
  const grain = 36;
  const grainPop = 0.009;
  const grainAmp = 1.65;
  const warmth = 4.8;
  const brightness = 35.7;
  const stripe = Math.max(14, Math.round(0.06 * w));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const o = 4 * idx;
      if (mask[idx] > 0) {
        data[o] = bg.r;
        data[o + 1] = bg.g;
        data[o + 2] = bg.b;
        data[o + 3] = 255;
        continue;
      }
      const light = Math.floor(x / stripe) % 2;
      const n =
        (0.5 * fractalNoise(0.035 * x, 0.035 * y) +
          0.3 * fractalNoise(0.08 * x + 100, 0.08 * y + 100) +
          0.2 * fractalNoise(0.18 * x + 200, 0.18 * y + 200)) *
          2 -
        1;
      const g = filmGrain(grain, grainPop, grainAmp);
      data[o] = clamp255((light ? 58 : 52) + 20 * n + warmth + 0.12 * brightness + g);
      data[o + 1] = clamp255((light ? 88 : 80) + 26 * n + 0.1 * brightness + g);
      data[o + 2] = clamp255((light ? 44 : 38) + 14 * n - warmth + 0.08 * brightness + g);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Warm fog + light leaks over the whole canvas (device pixels). */
function paintFog(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.sqrt(cx ** 2 + cy ** 2);
  ctx.globalCompositeOperation = "source-atop";
  const fog = 0.165;
  const g = ctx.createRadialGradient(cx, cy, 0.05 * w, cx, cy, radius);
  g.addColorStop(0, `rgba(240,235,228,${fog})`);
  g.addColorStop(0.5, `rgba(240,235,228,${0.6 * fog})`);
  g.addColorStop(1, `rgba(220,215,210,${0.8 * fog})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const leak = 0.036;
  for (const spot of [
    { x: 0.15 * w, y: 0.2 * h, r: 0.5 * w },
    { x: 0.85 * w, y: 0.7 * h, r: 0.4 * w },
    { x: 0.5 * w, y: 0.1 * h, r: 0.35 * w },
  ]) {
    const lg = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
    lg.addColorStop(0, `rgba(255,252,245,${leak})`);
    lg.addColorStop(0.4, `rgba(255,250,240,${0.4 * leak})`);
    lg.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
}

/** Fade the noisy rounded edge into the page backdrop; outside the hole is solid backdrop. */
function punchEdge(ctx: CanvasRenderingContext2D, w: number, h: number, mask: Float32Array, bg: Rgb) {
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const fade = 0.2 * Math.min(w, h) * 0.45;
  for (let i = 0; i < w * h; i++) {
    const p = mask[i];
    const o = 4 * i;
    if (p > 0) {
      data[o] = bg.r;
      data[o + 1] = bg.g;
      data[o + 2] = bg.b;
      data[o + 3] = 255;
    } else if (fade > 0 && -p < fade) {
      const e = -p / fade;
      const t = e * e * (3 - 2 * e);
      const k = 1 - t;
      data[o] = clamp255(data[o] * t + bg.r * k);
      data[o + 1] = clamp255(data[o + 1] * t + bg.g * k);
      data[o + 2] = clamp255(data[o + 2] * t + bg.b * k);
    }
  }
  ctx.putImageData(image, 0, 0);
}

function drawGoals(
  ctx: CanvasRenderingContext2D,
  left: number,
  width: number,
  height: number,
  cy: number,
) {
  const mouth = 0.28 * height;
  const depth = 10;
  for (const side of [0, 1]) {
    const lineX = side === 0 ? left : left + width;
    const dir = side === 0 ? -1 : 1;
    const backX = lineX + depth * dir;
    const top = cy - mouth / 2;
    const bottom = cy + mouth / 2;
    const glow = ctx.createRadialGradient(
      lineX + depth * dir * 0.5,
      cy,
      2,
      lineX + depth * dir * 0.5,
      cy,
      0.7 * mouth,
    );
    glow.addColorStop(0, "rgba(255,255,255,0.08)");
    glow.addColorStop(0.5, "rgba(255,255,255,0.04)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(Math.min(lineX, backX) - 8, top - 10, depth + 16, mouth + 20);

    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.moveTo(lineX, top);
    ctx.lineTo(backX, top);
    ctx.lineTo(backX, bottom);
    ctx.lineTo(lineX, bottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;
    const netRow = mouth / 8;
    for (let y = top + netRow; y < bottom; y += netRow) {
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(backX, y);
      ctx.stroke();
    }
    const netCol = depth / 3;
    for (let i = 1; i < 3; i++) {
      const x = lineX + dir * netCol * i;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(lineX, top);
    ctx.lineTo(backX, top);
    ctx.lineTo(backX, bottom);
    ctx.lineTo(lineX, bottom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lineX, top - 1);
    ctx.lineTo(lineX, bottom + 1);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(lineX, top, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lineX, bottom, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** Touchlines, halfway line, centre circle, boxes, goals and corner arcs (CSS pixels). */
function drawMarkings(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const line = "rgba(255,255,255,0.18)";
  const mx = 0.08 * w;
  const my = 0.1 * h;
  const fw = w - 2 * mx;
  const fh = h - 2 * my;
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.rect(mx, my, fw, fh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, my);
  ctx.lineTo(cx, my + fh);
  ctx.stroke();

  const circle = 0.14 * Math.min(fw, fh);
  ctx.beginPath();
  ctx.arc(cx, cy, circle, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
  ctx.fill();

  const boxW = 0.15 * fw;
  const boxH = 0.42 * fh;
  ctx.beginPath();
  ctx.rect(mx, cy - boxH / 2, boxW, boxH);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx + fw - boxW, cy - boxH / 2, boxW, boxH);
  ctx.stroke();

  const sixW = 0.06 * fw;
  const sixH = 0.22 * fh;
  ctx.beginPath();
  ctx.rect(mx, cy - sixH / 2, sixW, sixH);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx + fw - sixW, cy - sixH / 2, sixW, sixH);
  ctx.stroke();

  drawGoals(ctx, mx, fw, fh, cy);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.2;

  const corner = 0.03 * Math.min(fw, fh);
  const corners: [number, number, number, number][] = [
    [mx, my, 0, Math.PI / 2],
    [mx + fw, my, Math.PI / 2, Math.PI],
    [mx + fw, my + fh, Math.PI, 1.5 * Math.PI],
    [mx, my + fh, 1.5 * Math.PI, 2 * Math.PI],
  ];
  for (const [x, y, a0, a1] of corners) {
    ctx.beginPath();
    ctx.arc(x, y, corner, a0, a1);
    ctx.stroke();
  }
}

/**
 * Paint the framed pitch into `canvas` at `w`×`h` CSS px. Fog is applied before the
 * edge fade so the rim and everything outside the hole match `backdrop` exactly.
 */
export function paintPitch(canvas: HTMLCanvasElement, w: number, h: number, backdrop: Rgb) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  canvas.width = pw;
  canvas.height = ph;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const mask = createEdgeMask(pw, ph, PITCH_EDGE);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintGrass(ctx, pw, ph, mask, backdrop);
  paintFog(ctx, pw, ph);
  punchEdge(ctx, pw, ph, mask, backdrop);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawMarkings(ctx, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const HEX_R = 1.9;
const HEX_ROW = HEX_R * Math.sqrt(3);
const HEX_COL = 1.5 * HEX_R;
const BALL_SIZE = 22;
const BALL_C = 11;
const BALL_R = 9.5;

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function sphereShade(x: number, y: number) {
  const d = Math.sqrt((x - BALL_C) ** 2 + (y - BALL_C) ** 2);
  if (d > 10.5) return 0;
  const k = d / BALL_R;
  return Math.max(0, 1 - k * k);
}

const mod = (v: number, m: number) => ((v % m) + m) % m;

/** Draw the hex-panelled ball into its 22×22 canvas, scrolled by the roll offsets. */
export function drawBall(ctx: CanvasRenderingContext2D, rollX: number, rollY: number) {
  ctx.clearRect(0, 0, BALL_SIZE, BALL_SIZE);
  const g = ctx.createRadialGradient(9.5, 9.5, 0.5, BALL_C, BALL_C, BALL_R);
  g.addColorStop(0, "#FEFEFE");
  g.addColorStop(0.35, "#F5F1EB");
  g.addColorStop(0.75, "#EAE4DA");
  g.addColorStop(1, "#DBD3C6");
  ctx.beginPath();
  ctx.arc(BALL_C, BALL_C, BALL_R, 0, 2 * Math.PI);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(BALL_C, BALL_C, BALL_R, 0, 2 * Math.PI);
  ctx.clip();
  const ox = mod(rollX, 3 * HEX_COL);
  const oy = mod(rollY, 3 * HEX_ROW);
  for (let col = -7; col <= 10; col++) {
    for (let row = -7; row <= 10; row++) {
      const gx = HEX_COL * col;
      const gy = row * HEX_ROW + (mod(col, 2) !== 0 ? 0.5 * HEX_ROW : 0);
      const x = gx - ox + BALL_C;
      const y = gy - oy + BALL_C;
      if (Math.sqrt((x - BALL_C) ** 2 + (y - BALL_C) ** 2) > 13.4) continue;
      const shade = sphereShade(x, y);
      if (shade < 0.02) continue;
      const r = HEX_R * (0.82 + 0.18 * shade);
      if (((col % 3) + 300) % 3 === 0 && ((row % 3) + 300) % 3 === 0) {
        hexPath(ctx, x, y, 0.88 * r);
        ctx.fillStyle = `rgba(28,24,18,${0.78 * shade})`;
        ctx.fill();
      }
      hexPath(ctx, x, y, r);
      ctx.strokeStyle = `rgba(80,72,60,${0.35 * shade})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(BALL_C, BALL_C, BALL_R, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(130,120,108,0.35)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(9.1, 8.91, 2.85, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9.575, 8.34, 0.855, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();
}
