import { lensRadius } from "./util";

const TAU = 2 * Math.PI;
/** Handle direction (down-right from the lens). */
export const HANDLE_ANGLE = 0.28 * Math.PI;

let textureCanvas: HTMLCanvasElement | null = null;
let textureSize = 0;

/** Faint value-noise smudges on the glass, faded toward the rim. */
function glassTexture(diameter: number): HTMLCanvasElement | null {
  const size = 16 * Math.ceil(diameter / 16);
  if (textureCanvas && textureSize === size) return textureCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  textureCanvas = canvas;
  textureSize = size;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const grid = (scale: number) => {
    const gs = Math.ceil(size / scale) + 2;
    const g = new Float32Array(gs * gs);
    for (let i = 0; i < g.length; i++) g[i] = Math.random();
    return { g, gs, scale };
  };
  const octaves = [grid(6), grid(14), grid(30)];
  const weights = [0.5, 0.3, 0.2];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (let o = 0; o < 3; o++) {
        const { g, gs, scale } = octaves[o];
        const fx = x / scale;
        const fy = y / scale;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = fx - ix;
        const ty = fy - iy;
        const ux = tx * tx * (3 - 2 * tx);
        const uy = ty * ty * (3 - 2 * ty);
        const i00 = iy * gs + ix;
        const i10 = i00 + 1;
        const i01 = i00 + gs;
        const i11 = i01 + 1;
        v += ((g[i00] * (1 - ux) + g[i10] * ux) * (1 - uy) + (g[i01] * (1 - ux) + g[i11] * ux) * uy) * weights[o];
      }
      const dx = x / size - 0.5;
      const dy = y / size - 0.5;
      const d = 2 * Math.sqrt(dx * dx + dy * dy);
      const c = Math.floor(255 * v * Math.max(0, 1 - d * d));
      const idx = (y * size + x) * 4;
      data[idx] = c;
      data[idx + 1] = c;
      data[idx + 2] = c;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function fillRadial(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
  stops: [number, string][],
  cx: number,
  cy: number,
  half: number,
) {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(cx - half, cy - half, 2 * half, 2 * half);
}

/** Wooden handle with a brushed-metal ferrule. */
function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rim: number) {
  const c = Math.cos(HANDLE_ANGLE);
  const s = Math.sin(HANDLE_ANGLE);
  const len = 1.3 * radius;
  const thick = Math.max(9, 0.135 * radius);
  const sx = x + c * (radius + 0.2 * rim);
  const sy = y + s * (radius + 0.2 * rim);
  const ex = sx + c * len;
  const ey = sy + s * len;
  const nx = -s;
  ctx.save();
  ctx.strokeStyle = "rgba(25, 18, 8, 0.10)";
  ctx.lineWidth = thick + 0.04 * radius;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx + 3, sy + 4);
  ctx.lineTo(ex + 3, ey + 4);
  ctx.stroke();
  const baseHalf = 0.5 * thick;
  const tipHalf = 0.72 * thick * 0.5;
  const wood = ctx.createLinearGradient(sx + nx * baseHalf, sy + c * baseHalf, sx - nx * baseHalf, sy - c * baseHalf);
  wood.addColorStop(0, "rgb(138, 94, 52)");
  wood.addColorStop(0.15, "rgb(158, 112, 65)");
  wood.addColorStop(0.4, "rgb(148, 104, 60)");
  wood.addColorStop(0.6, "rgb(142, 98, 56)");
  wood.addColorStop(0.85, "rgb(130, 88, 50)");
  wood.addColorStop(1, "rgb(108, 74, 40)");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(sx + nx * baseHalf, sy + c * baseHalf);
  ctx.lineTo(sx - nx * baseHalf, sy - c * baseHalf);
  ctx.lineTo(ex - nx * tipHalf, ey - c * tipHalf);
  ctx.lineTo(ex + nx * tipHalf, ey + c * tipHalf);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex, ey, tipHalf, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy, baseHalf, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.055;
  ctx.strokeStyle = "#3a2510";
  ctx.lineWidth = 0.5;
  for (let i = -3; i <= 3; i++) {
    const k = i / 3;
    const b = k * baseHalf * 0.85;
    const t = k * tipHalf * 0.85;
    ctx.beginPath();
    ctx.moveTo(sx + nx * b, sy + c * b);
    ctx.lineTo(ex + nx * t, ey + c * t);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(218, 188, 148, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx + nx * baseHalf * 0.6, sy + c * baseHalf * 0.6);
  ctx.lineTo(ex + nx * tipHalf * 0.6, ey + c * tipHalf * 0.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 40, 20, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - nx * baseHalf * 0.55, sy - c * baseHalf * 0.55);
  ctx.lineTo(ex - nx * tipHalf * 0.55, ey - c * tipHalf * 0.55);
  ctx.stroke();

  const ferruleLen = 0.08 * radius;
  const ferruleHalf = 0.58 * thick;
  const fx = sx + c * ferruleLen;
  const fy = sy + s * ferruleLen;
  const metal = ctx.createLinearGradient(
    sx + nx * ferruleHalf,
    sy + c * ferruleHalf,
    sx - nx * ferruleHalf,
    sy - c * ferruleHalf,
  );
  metal.addColorStop(0, "rgb(178, 173, 163)");
  metal.addColorStop(0.25, "rgb(205, 200, 190)");
  metal.addColorStop(0.5, "rgb(170, 165, 155)");
  metal.addColorStop(0.75, "rgb(196, 191, 181)");
  metal.addColorStop(1, "rgb(164, 159, 149)");
  ctx.strokeStyle = metal;
  ctx.lineWidth = thick + 0.03 * radius;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(sx - c, sy - s);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  ctx.strokeStyle = "rgba(242, 238, 228, 0.20)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sx + nx * ferruleHalf, sy + c * ferruleHalf);
  ctx.lineTo(fx + nx * ferruleHalf, fy + c * ferruleHalf);
  ctx.stroke();
  ctx.strokeStyle = "rgba(100, 90, 75, 0.15)";
  ctx.beginPath();
  ctx.moveTo(sx - nx * ferruleHalf, sy - c * ferruleHalf);
  ctx.lineTo(fx - nx * ferruleHalf, fy - c * ferruleHalf);
  ctx.stroke();
  ctx.fillStyle = "rgb(88, 64, 36)";
  ctx.beginPath();
  ctx.arc(ex, ey, tipHalf + 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(180, 150, 110, 0.15)";
  ctx.beginPath();
  ctx.arc(ex + nx * tipHalf * 0.2 - 0.5 * c, ey + c * tipHalf * 0.2 - 0.5 * s, 0.45 * tipHalf, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * Sunspot at the focus, then the magnifier frame, glass sheen, smudges and
 * handle. The magnified image itself is drawn by the caller.
 */
export function drawLens(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  focusX: number,
  focusY: number,
  time: number,
  w: number,
  h: number,
  active: boolean,
) {
  const R = lensRadius(w, h);
  const rim = Math.max(4, 0.055 * R);
  ctx.save();
  const power = active ? 1 : 0.15;
  const spot = active ? 4 + 0.8 * Math.sin(9 * time) : 3;
  const core = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, 3 * spot);
  core.addColorStop(0, `rgba(255, 255, 245, ${0.8 * power})`);
  core.addColorStop(0.15, `rgba(255, 248, 220, ${0.5 * power})`);
  core.addColorStop(0.4, `rgba(255, 235, 170, ${0.15 * power})`);
  core.addColorStop(1, "rgba(255, 220, 120, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(focusX, focusY, 3 * spot, 0, TAU);
  ctx.fill();
  const haloR = 0.25 * R;
  const halo = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, haloR);
  halo.addColorStop(0, `rgba(255, 245, 210, ${0.15 * power})`);
  halo.addColorStop(0.5, `rgba(255, 235, 180, ${0.05 * power})`);
  halo.addColorStop(1, "rgba(255, 225, 150, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(focusX, focusY, haloR, 0, TAU);
  ctx.fill();
  if (active) {
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "rgba(255, 240, 200, 0.8)";
    ctx.lineWidth = 1;
    const ringR = 6 + Math.sin(7 * time);
    ctx.beginPath();
    ctx.arc(focusX, focusY, ringR, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = "rgba(180, 120, 255, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(focusX, focusY, ringR + 1.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 160, 80, 0.5)";
    ctx.beginPath();
    ctx.arc(focusX, focusY, ringR - 1, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawHandle(ctx, x, y, R, rim);

  const inner = R - 0.5 * rim;
  const lightA = Math.atan2(0.1 * h - y, 0.15 * w - x);
  const lc = Math.cos(lightA);
  const ls = Math.sin(lightA);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#0a0804";
  ctx.beginPath();
  ctx.arc(x - 3 * lc, y - 3 * ls + 4, R + rim, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  const frame = ctx.createLinearGradient(x + lc * R, y + ls * R, x - lc * R, y - ls * R);
  frame.addColorStop(0, "rgb(210, 200, 178)");
  frame.addColorStop(0.2, "rgb(195, 186, 166)");
  frame.addColorStop(0.4, "rgb(172, 162, 142)");
  frame.addColorStop(0.6, "rgb(200, 192, 172)");
  frame.addColorStop(0.8, "rgb(178, 168, 148)");
  frame.addColorStop(1, "rgb(155, 145, 128)");
  ctx.strokeStyle = frame;
  ctx.lineWidth = rim;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(80, 70, 55, 0.3)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, R - 0.45 * rim, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(240, 235, 220, 0.22)";
  ctx.beginPath();
  ctx.arc(x, y, R + 0.45 * rim, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, inner, 0, TAU);
  ctx.clip();
  const d = inner;
  fillRadial(ctx, x, y, 0, x, y, d, [
    [0, "rgba(252, 250, 242, 0.04)"],
    [0.3, "rgba(250, 248, 240, 0.03)"],
    [0.6, "rgba(248, 245, 238, 0.02)"],
    [0.85, "rgba(240, 237, 230, 0.04)"],
    [0.95, "rgba(230, 227, 220, 0.07)"],
    [1, "rgba(220, 218, 212, 0.10)"],
  ], x, y, d);
  fillRadial(ctx, x, y, 0.35 * d, x, y, d, [
    [0, "rgba(0, 0, 0, 0)"],
    [0.45, "rgba(0, 0, 0, 0)"],
    [0.7, "rgba(50, 60, 70, 0.02)"],
    [0.85, "rgba(50, 60, 70, 0.055)"],
    [0.94, "rgba(45, 55, 65, 0.09)"],
    [1, "rgba(40, 50, 60, 0.14)"],
  ], x, y, d);
  fillRadial(ctx, x + lc * d * 0.15, y + ls * d * 0.15, 0, x, y, 0.75 * d, [
    [0, "rgba(255, 253, 248, 0.08)"],
    [0.2, "rgba(255, 251, 245, 0.05)"],
    [0.45, "rgba(255, 249, 242, 0.02)"],
    [1, "rgba(255, 245, 235, 0)"],
  ], x, y, d);
  fillRadial(ctx, x, y, 0.82 * d, x, y, d, [
    [0, "rgba(255, 255, 250, 0)"],
    [0.3, "rgba(255, 255, 250, 0.025)"],
    [0.6, "rgba(240, 238, 230, 0.05)"],
    [0.8, "rgba(200, 198, 190, 0.04)"],
    [1, "rgba(160, 158, 150, 0.02)"],
  ], x, y, d);
  fillRadial(ctx, x + lc * d * 0.05, y + ls * d * 0.05, 0, x, y, 0.45 * d, [
    [0, "rgba(255, 255, 252, 0.035)"],
    [0.5, "rgba(255, 253, 248, 0.015)"],
    [1, "rgba(255, 250, 245, 0)"],
  ], x, y, d);
  const hotOff = 0.33 * R;
  const hx = x + lc * hotOff;
  const hy = y + ls * hotOff;
  const hotR = 0.38 * R;
  fillRadial(ctx, hx - lc * hotR * 0.3, hy - ls * hotR * 0.3, 0, hx, hy, hotR, [
    [0, "rgba(255, 255, 252, 0.14)"],
    [0.2, "rgba(255, 255, 250, 0.09)"],
    [0.5, "rgba(255, 253, 245, 0.04)"],
    [0.8, "rgba(255, 250, 240, 0.01)"],
    [1, "rgba(255, 248, 235, 0)"],
  ], x, y, d);
  const gx = x + lc * R * 0.2;
  const gy = y + ls * R * 0.2;
  fillRadial(ctx, gx + lc * R * 0.15, gy + ls * R * 0.15, 0, gx, gy, 0.55 * R, [
    [0, "rgba(255, 255, 252, 0.04)"],
    [0.4, "rgba(255, 253, 248, 0.02)"],
    [1, "rgba(255, 250, 242, 0)"],
  ], x, y, d);
  const kx = x + lc * R * 0.12;
  const ky = y + ls * R * 0.12;
  fillRadial(ctx, kx + lc * R * 0.05, ky + ls * R * 0.05, 0, kx, ky, 0.22 * R, [
    [0, "rgba(255, 255, 250, 0.04)"],
    [0.4, "rgba(255, 253, 245, 0.02)"],
    [1, "rgba(255, 250, 240, 0)"],
  ], x, y, d);
  const glintOff = 0.36 * R;
  const qx = x + lc * glintOff;
  const qy = y + ls * glintOff;
  fillRadial(ctx, qx, qy, 0, qx, qy, 0.1 * R, [
    [0, "rgba(255, 255, 252, 0.32)"],
    [0.08, "rgba(255, 255, 248, 0.2)"],
    [0.25, "rgba(255, 252, 240, 0.08)"],
    [0.5, "rgba(255, 248, 230, 0.02)"],
    [1, "rgba(255, 245, 220, 0)"],
  ], x, y, d);
  const ex = x + lc * d * 0.6;
  const ey = y + ls * d * 0.6;
  fillRadial(ctx, ex, ey, 0.15 * d, ex, ey, 0.65 * d, [
    [0, "rgba(255, 255, 250, 0)"],
    [0.6, "rgba(255, 255, 250, 0.02)"],
    [0.85, "rgba(255, 255, 248, 0.06)"],
    [0.95, "rgba(255, 253, 245, 0.09)"],
    [1, "rgba(255, 250, 240, 0.04)"],
  ], x, y, d);
  const bx = x - lc * d * 0.55;
  const by = y - ls * d * 0.55;
  fillRadial(ctx, bx, by, 0.1 * d, bx, by, 0.5 * d, [
    [0, "rgba(255, 250, 240, 0)"],
    [0.7, "rgba(255, 248, 235, 0.01)"],
    [1, "rgba(255, 245, 225, 0.025)"],
  ], x, y, d);
  ctx.globalAlpha = 0.025;
  const tint = ctx.createLinearGradient(x + lc * d, y + ls * d, x - lc * d, y - ls * d);
  tint.addColorStop(0, "rgba(160, 195, 230, 0.8)");
  tint.addColorStop(0.25, "rgba(170, 200, 235, 0.4)");
  tint.addColorStop(0.5, "rgba(200, 200, 200, 0.1)");
  tint.addColorStop(0.75, "rgba(200, 190, 175, 0.05)");
  tint.addColorStop(1, "rgba(190, 180, 160, 0)");
  ctx.fillStyle = tint;
  ctx.fillRect(x - d, y - d, 2 * d, 2 * d);
  ctx.globalAlpha = 1;
  const blueX = x + lc * d * 0.75;
  const blueY = y + ls * d * 0.75;
  fillRadial(ctx, blueX, blueY, 0.05 * d, blueX, blueY, 0.4 * d, [
    [0, "rgba(100, 140, 255, 0.025)"],
    [0.5, "rgba(120, 155, 255, 0.015)"],
    [1, "rgba(140, 170, 255, 0)"],
  ], x, y, d);
  const amberX = x + lc * d * 0.82;
  const amberY = y + ls * d * 0.82;
  fillRadial(ctx, amberX, amberY, 0.02 * d, amberX, amberY, 0.35 * d, [
    [0, "rgba(255, 180, 100, 0.02)"],
    [0.5, "rgba(255, 190, 120, 0.01)"],
    [1, "rgba(255, 200, 140, 0)"],
  ], x, y, d);
  const texture = glassTexture(Math.ceil(2 * d));
  if (texture) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.08 * time);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.035;
    ctx.drawImage(texture, -d, -d, 2 * d, 2 * d);
    ctx.restore();
  }
  ctx.restore();

  const rimX = x + lc * R;
  const rimY = y + ls * R;
  const rimGlow = 1.5 * rim;
  const glint = ctx.createRadialGradient(rimX, rimY, 0, rimX, rimY, rimGlow);
  glint.addColorStop(0, "rgba(255, 255, 248, 0.14)");
  glint.addColorStop(0.3, "rgba(255, 252, 240, 0.07)");
  glint.addColorStop(0.7, "rgba(255, 248, 230, 0.02)");
  glint.addColorStop(1, "rgba(255, 245, 220, 0)");
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.arc(rimX, rimY, rimGlow, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
