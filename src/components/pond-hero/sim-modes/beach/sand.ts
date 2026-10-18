import { fractalNoise } from "../../gl/paper";
import type { Rgb } from "../shared/sim-frame";
import { filmGrain, hash2d, seededRandom } from "./util";

const SAND_DRY: Rgb = { r: 237, g: 220, b: 185 };
const SAND_MID: Rgb = { r: 225, g: 205, b: 165 };
const SAND_DARK: Rgb = { r: 210, g: 188, b: 148 };
const SAND_TOP: Rgb = { r: 205, g: 190, b: 155 };

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/**
 * Paint the static sand bed plus its own noisy rounded matte: pixels outside
 * the hole are `backdrop`, and the sand fades into `backdrop` near the edge.
 */
export function renderSand(canvas: HTMLCanvasElement, w: number, h: number, backdrop: Rgb) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  canvas.width = pw;
  canvas.height = ph;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx || pw <= 0 || ph <= 0) return;

  const img = ctx.createImageData(pw, ph);
  const data = img.data;
  const margin = 0.005 * Math.min(pw, ph);
  const cx = pw / 2;
  const cy = ph / 2;
  const halfW = cx - margin;
  const halfH = cy - margin;
  const corner = 0.28 * Math.min(halfW, halfH);
  const edgeNoise = 0.06 * Math.min(pw, ph) * 0.55;
  const fadeDist = 0.28 * Math.min(pw, ph);

  for (let y = 0; y < ph; y++) {
    const ty = y / ph;
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const dx = Math.abs(x - cx) - (halfW - corner);
      const dy = Math.abs(y - cy) - (halfH - corner);
      let dist =
        Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) +
        Math.min(Math.max(dx, dy), 0) -
        corner;
      dist +=
        (2 * fractalNoise(0.8 * x, 0.8 * y) - 1) * edgeNoise +
        (2 * fractalNoise(2.5 * x, 2.5 * y + 500) - 1) * edgeNoise * 0.35 +
        (2 * fractalNoise(6 * x, 6 * y + 1e3) - 1) * edgeNoise * 0.12;
      if (dist > 0) {
        data[i] = backdrop.r;
        data[i + 1] = backdrop.g;
        data[i + 2] = backdrop.b;
        data[i + 3] = 255;
        continue;
      }

      const band = smoothstep(
        0.03,
        0.55,
        ty +
          (fractalNoise(0.01 * x, 0.01 * y + 400) - 0.5) * 0.2 +
          (fractalNoise(0.035 * x, 0.035 * y + 450) - 0.5) * 0.08 +
          (fractalNoise(0.08 * x, 0.08 * y + 480) - 0.5) * 0.03,
      );
      const base =
        band < 0.4
          ? mix(SAND_TOP, SAND_DRY, band / 0.4)
          : band < 0.7
            ? mix(SAND_DRY, SAND_MID, (band - 0.4) / 0.3)
            : mix(SAND_MID, SAND_DARK, Math.min(1, (band - 0.7) / 0.3));
      const ripple =
        (0.6 * fractalNoise(0.012 * x, 0.02 * y + 500) + 0.4 * fractalNoise(0.025 * x, 0.004 * y + 700) - 0.5) * 14;
      const mottle = (fractalNoise(0.08 * x, 0.08 * y) - 0.5) * 16;
      const speck = (hash2d(3 * x, 3 * y) - 0.5) * 10;
      const pit = hash2d(7 * x + 100, 7 * y + 200);
      const dark = pit > 0.97 ? -18 : pit > 0.95 ? -8 : 0;
      const grain = filmGrain(10, 0.015, 1.4);
      let r = base.r + ripple + mottle + 0.5 * speck + dark + grain;
      let g = base.g + 0.9 * ripple + 0.85 * mottle + 0.4 * speck + dark + grain;
      let b = base.b + 0.7 * ripple + 0.7 * mottle + 0.3 * speck + 0.8 * dark + grain;
      if (-dist < fadeDist) {
        const e = -dist / fadeDist;
        const k = e * e * (3 - 2 * e);
        const inv = 1 - k;
        r = r * k + backdrop.r * inv;
        g = g * k + backdrop.g * inv;
        b = b * k + backdrop.b * inv;
      }
      data[i] = clamp255(r);
      data[i + 1] = clamp255(g);
      data[i + 2] = clamp255(b);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const rand = seededRandom(77);
  for (let n = 0; n < 40; n++) {
    const sx = rand() * w;
    const sy = (0.06 + 0.08 * rand()) * h;
    ctx.globalAlpha = 0.12 + 0.2 * rand();
    ctx.fillStyle = "#FEFCF6";
    ctx.beginPath();
    ctx.arc(sx, sy, 0.3 + rand(), 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
