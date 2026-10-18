import { fractalNoise } from "../../gl/paper";
import { createSurface, type Surface } from "./surface";

type Rgb = { r: number; g: number; b: number };

const GRASS_TOP: Rgb = { r: 162, g: 178, b: 120 };
const GRASS_UPPER: Rgb = { r: 138, g: 154, b: 106 };
const GRASS_MID: Rgb = { r: 122, g: 138, b: 90 };
const GRASS_LOWER: Rgb = { r: 106, g: 122, b: 74 };
const GRASS_BOTTOM: Rgb = { r: 88, g: 104, b: 58 };

const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// Plain float multiply (not Math.imul) on purpose — matches the original noise field.
function hash(x: number, y: number): number {
  let h = (x | 0) * 0x165667b1 + (y | 0) * 0x27d4eb2f;
  h = (h ^ (h >> 13)) * 0x4bf19f61;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + hash(ix + 1, iy + 1)) * ux * uy;
}

function fbm(x: number, y: number, octaves: number, persistence: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y) * amp;
    norm += amp;
    amp *= persistence;
    x *= 2;
    y *= 2;
  }
  return sum / norm;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/** Painted meadow below the horizon (transparent sky), with a soft noisy horizon and oval vignette. */
export function renderGrass(w: number, h: number): Surface | null {
  const surface = createSurface(w, h);
  if (!surface) return null;
  const image = surface.ctx.createImageData(w, h);
  const data = image.data;
  const horizon = Math.round(0.32 * h);
  const depth = h - horizon;
  const blend = Math.round(0.09 * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (y < horizon - blend) {
        data[p + 3] = 0;
        continue;
      }
      const m = Math.max(0, (y - horizon) / depth);
      const base =
        m < 0.15
          ? mix(GRASS_TOP, GRASS_UPPER, m / 0.15)
          : m < 0.45
            ? mix(GRASS_UPPER, GRASS_MID, (m - 0.15) / 0.3)
            : m < 0.75
              ? mix(GRASS_MID, GRASS_LOWER, (m - 0.45) / 0.3)
              : mix(GRASS_LOWER, GRASS_BOTTOM, Math.min(1, (m - 0.75) / 0.25));

      const tint = (valueNoise(0.004 * x, 0.003 * y + 300) - 0.5) * 2;
      const tintR = 6 * tint;
      const tintG = 2 * tint;
      const tintB = -5 * tint;
      const patch = (valueNoise(0.007 * x, 0.006 * y + 500) - 0.5) * 16;
      const clumps = (fbm(0.008 * x, 0.012 * y, 5, 0.48) - 0.5) * 22;
      const blades = (fbm(0.02 * x, 0.08 * y, 4, 0.5) - 0.5) * 14;
      const wavePhase = 8 * valueNoise(0.01 * x, 0.002 * y + 400);
      const wave = 2.5 * Math.sin(0.03 * y + wavePhase);
      const speck = (hash(3 * x, 3 * y) - 0.5) * (4 + 6 * m);
      const haze = 0.55 * Math.max(0, 1 - 3.5 * m);
      const light =
        (0.6 * valueNoise(0.005 * x + 100, 0.005 * y + 100) +
          0.4 * ((1 - x / w) * 0.3 + (1 - m) * 0.2) -
          0.3) *
        8;

      const r = base.r + tintR + patch + clumps + 0.9 * blades + wave + 0.9 * speck + 12 * haze + light;
      const g =
        base.g + tintG + 1.05 * patch + 1.1 * clumps + blades + wave + 1.1 * speck + 8 * haze + 1.1 * light;
      const b =
        base.b +
        tintB +
        0.7 * patch +
        0.7 * clumps +
        0.7 * blades +
        0.6 * wave +
        0.5 * speck -
        4 * haze +
        0.6 * light;

      let alpha = 255;
      if (y < horizon + blend) {
        const ramp = Math.max(0, Math.min(1, (y - (horizon - blend)) / (2 * blend)));
        const edge =
          ((fbm(0.012 * x, 0.012 * y + 200, 3, 0.5) + 0.3 * fbm(0.04 * x, 0.04 * y + 500, 2, 0.4)) / 1.3 -
            0.5) *
          0.45;
        const e = Math.max(0, Math.min(1, ramp + edge));
        alpha = Math.round(e * e * (3 - 2 * e) * 255);
      }
      const vx = (x - 0.5 * w) / (0.78 * w);
      const vy = (y - 1.15 * h) / (0.85 * h);
      const oval = vx * vx + vy * vy;
      if (oval > 0.6) {
        const e = Math.max(0, 1 - (oval - 0.6) / 0.4);
        alpha = Math.min(alpha, Math.round(e * e * (3 - 2 * e) * 255));
      }
      data[p] = clampByte(r);
      data[p + 1] = clampByte(g);
      data[p + 2] = clampByte(b);
      data[p + 3] = alpha;
    }
  }
  surface.ctx.putImageData(image, 0, 0);
  return surface;
}

/** White alpha mask for the soft, noisy rounded frame (applied with `destination-in`). */
export function renderFrameMask(w: number, h: number): Surface | null {
  const surface = createSurface(w, h);
  if (!surface) return null;
  const image = surface.ctx.createImageData(w, h);
  const data = image.data;
  const fade = 0.26 * Math.min(w, h);
  const noiseAmp = 0.06 * Math.min(w, h) * 0.55;
  const cx = w / 2;
  const cy = h / 2;
  const corner = 0.8 * fade;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const dx = Math.abs(x - cx) - (cx - corner);
      const dy = Math.abs(y - cy) - (cy - corner);
      let inside =
        corner -
        (Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0));
      inside +=
        (2 * fractalNoise(0.8 * x, 0.8 * y) - 1) * noiseAmp +
        (2 * fractalNoise(2.5 * x, 2.5 * y + 500) - 1) * noiseAmp * 0.35 +
        (2 * fractalNoise(6 * x, 6 * y + 1e3) - 1) * noiseAmp * 0.12;
      const t = Math.max(0, Math.min(inside / fade, 1));
      data[p] = 255;
      data[p + 1] = 255;
      data[p + 2] = 255;
      data[p + 3] = (255 * (t * t * (3 - 2 * t))) | 0;
    }
  }
  surface.ctx.putImageData(image, 0, 0);
  return surface;
}
