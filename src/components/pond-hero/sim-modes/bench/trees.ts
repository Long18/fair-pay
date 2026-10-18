import type { Tree } from "./layout";
import { ctx2d, makeCanvas, seeded } from "./math";
import { project, pt, SUN_X, SUN_Y } from "./projection";

type Rgb = [number, number, number];
type Palette = { dark: Rgb; mid: Rgb; lit: Rgb; high: Rgb; back: Rgb };

const PALETTES: Palette[] = [
  { dark: [18, 50, 30], mid: [52, 116, 46], lit: [118, 178, 62], high: [186, 222, 96], back: [226, 244, 140] },
  { dark: [28, 54, 24], mid: [78, 130, 42], lit: [150, 190, 60], high: [212, 226, 100], back: [246, 240, 150] },
  { dark: [14, 50, 40], mid: [42, 112, 70], lit: [104, 176, 96], high: [170, 222, 134], back: [214, 246, 170] },
];

function ramp(p: Palette, t: number): Rgb {
  const f = 3 * Math.max(0, Math.min(1, t));
  const i = Math.min(2, Math.floor(f));
  const k = f - i;
  const stops = [p.dark, p.mid, p.lit, p.high];
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const rgba = (c: Rgb, alpha = 1, add = 0) =>
  `rgba(${Math.round(c[0] + add)}, ${Math.round(c[1] + add)}, ${Math.round(c[2] + 0.6 * add)}, ${alpha})`;

type Sprite = { cv: HTMLCanvasElement; size: number };

/** Crown sprites per layout; cleared whenever the park is rebuilt. */
export type TreeCache = { crowns: Map<Tree, Sprite>; shadows: Map<Tree, Sprite> };

export const createTreeCache = (): TreeCache => ({ crowns: new Map(), shadows: new Map() });

/** Crown height above the lawn. */
const crownHeight = (t: Tree) => 1.6 * t.r;

/** Gentle sway in the wind, different per tree. */
const sway = (t: Tree, time: number) => 0.7 * Math.sin(0.5 * time + t.seed) + 0.3 * Math.sin(1.3 * time + 2 * t.seed);

type Blob = { x: number; y: number; r: number; top: number };

/** A crown seen from above: branches, overlapping lobes, leaf tufts lit by the low sun. */
function paintCrown(ctx: CanvasRenderingContext2D, c: number, R: number, m: number, seed: number, tone: number) {
  const r = seeded(seed);
  const pal = PALETTES[tone % PALETTES.length];
  const len = Math.hypot(SUN_X, SUN_Y);
  const sx = -SUN_X / len;
  const sy = -SUN_Y / len;
  const light = { x: 0.62 * sx, y: 0.62 * sy, z: 0.78 };

  ctx.strokeStyle = "rgb(46, 36, 28)";
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const l = R * (0.5 + 0.3 * r());
    ctx.lineWidth = 0.1 * m;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.quadraticCurveTo(c + Math.cos(a + 0.3) * l * 0.5, c + Math.sin(a + 0.3) * l * 0.5, c + Math.cos(a) * l, c + Math.sin(a) * l);
    ctx.stroke();
  }

  const blobs: Blob[] = [{ x: c, y: c, r: 0.6 * R, top: 0.95 * R }];
  const lobes = 4 + ((3 * r()) | 0);
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + 0.8 * r();
    const d = R * (0.36 + 0.16 * r());
    const br = R * (0.36 + 0.16 * r());
    blobs.push({ x: c + Math.cos(a) * d, y: c + Math.sin(a) * d, r: br, top: br + (R - d) * 0.35 });
  }
  blobs.sort((a, b) => a.top - b.top);

  for (const b of blobs) {
    // Each higher lobe shades what is already painted beneath it.
    ctx.globalCompositeOperation = "source-atop";
    const ox = b.x - sx * b.r * 0.45;
    const oy = b.y - sy * b.r * 0.45;
    const cast = ctx.createRadialGradient(ox, oy, 0.5 * b.r, ox, oy, 1.2 * b.r);
    cast.addColorStop(0, "rgba(4, 22, 12, 0.45)");
    cast.addColorStop(1, "rgba(4, 22, 12, 0)");
    ctx.fillStyle = cast;
    ctx.beginPath();
    ctx.arc(ox, oy, 1.2 * b.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r();
      const d = 0.45 * b.r;
      const rr = b.r * (0.5 + 0.15 * r());
      ctx.fillStyle = rgba(ramp(pal, 0.18), 1);
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, rr, 0, 2 * Math.PI);
      ctx.fill();
    }

    const rim = Math.round((b.r / m) * 9);
    for (let i = 0; i < rim; i++) {
      const a = r() * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const facing = ca * sx + sa * sy;
      const d = b.r * (0.9 + 0.16 * r());
      const size = m * (0.09 + 0.06 * r());
      ctx.fillStyle =
        facing > 0.35 ? rgba(pal.back, 0.9, (r() - 0.5) * 16) : rgba(ramp(pal, 0.2 + 0.6 * Math.max(0, facing)), 0.95);
      ctx.beginPath();
      ctx.ellipse(b.x + ca * d, b.y + sa * d, size, 0.55 * size, r() * Math.PI, 0, 2 * Math.PI);
      ctx.fill();
    }

    const count = Math.round((b.r / (0.42 * m)) ** 2 * 2.2) + 8;
    const tufts: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.98 * Math.sqrt(r());
      tufts.push([Math.cos(a) * d, Math.sin(a) * d, Math.sqrt(Math.max(0, 1 - d * d))]);
    }
    tufts.sort((a, b) => a[2] - b[2]);
    for (const [nx, ny, nz] of tufts) {
      const lum = Math.max(0, nx * light.x + ny * light.y + nz * light.z) * (0.82 + 0.3 * r()) * (0.55 + 0.45 * nz);
      const col = ramp(pal, lum);
      const tx = b.x + nx * b.r;
      const ty = b.y + ny * b.r;
      const tr = m * (0.3 + 0.22 * r());
      ctx.fillStyle = rgba(ramp(pal, 0.55 * lum), 0.95);
      ctx.beginPath();
      ctx.arc(tx, ty, 0.85 * tr, 0, 2 * Math.PI);
      ctx.fill();
      for (let k = 0; k < 9; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * tr * 0.85;
        const size = m * (0.1 + 0.09 * r());
        if (Math.cos(a) * sx + Math.sin(a) * sy < -0.4 && d > 0.4 * tr) continue;
        ctx.fillStyle = rgba(col, 0.92, (r() - 0.5) * 18);
        ctx.beginPath();
        ctx.ellipse(tx + Math.cos(a) * d, ty + Math.sin(a) * d, size, 0.55 * size, r() * Math.PI, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "source-atop";
    const shade = ctx.createRadialGradient(b.x + sx * b.r * 0.45, b.y + sy * b.r * 0.45, 0.1 * b.r, b.x, b.y, 1.08 * b.r);
    shade.addColorStop(0, "rgba(255, 250, 200, 0.16)");
    shade.addColorStop(0.5, "rgba(255, 250, 200, 0)");
    shade.addColorStop(0.82, "rgba(6, 26, 18, 0.32)");
    shade.addColorStop(1, "rgba(6, 26, 18, 0)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.1 * b.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  // A few dark gaps where you can see down into the crown.
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    const d = R * (0.3 + 0.45 * r());
    const gr = m * (0.08 + 0.1 * r());
    const gx = c + Math.cos(a) * d;
    const gy = c + Math.sin(a) * d;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1.6 * gr);
    g.addColorStop(0, "rgba(10, 30, 18, 0.6)");
    g.addColorStop(1, "rgba(10, 30, 18, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy, 1.6 * gr, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function crownSprite(cache: TreeCache, t: Tree, m: number, dpr: number): Sprite {
  const hit = cache.crowns.get(t);
  if (hit) return hit;
  const size = Math.ceil(2.4 * t.r);
  const cv = makeCanvas(size * dpr, size * dpr);
  const ctx = ctx2d(cv);
  ctx.scale(dpr, dpr);
  paintCrown(ctx, size / 2, t.r, m, t.seed, t.tone);
  const s = { cv, size };
  cache.crowns.set(t, s);
  return s;
}

function shadowSprite(cache: TreeCache, t: Tree, m: number, dpr: number): Sprite {
  const hit = cache.shadows.get(t);
  if (hit) return hit;
  const crown = crownSprite(cache, t, m, dpr);
  const n = Math.ceil(crown.size / 4);
  const cv = makeCanvas(n, n);
  const ctx = ctx2d(cv);
  ctx.drawImage(crown.cv, 0, 0, n, n);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, n, n);
  const s = { cv, size: crown.size };
  cache.shadows.set(t, s);
  return s;
}

/** Crown silhouettes cast along the sun onto the half-res canopy layer. */
export function drawCanopyShadows(
  ctx: CanvasRenderingContext2D,
  cache: TreeCache,
  trees: Tree[],
  m: number,
  time: number,
  wind: number,
  dpr: number,
) {
  ctx.imageSmoothingEnabled = true;
  for (const t of trees) {
    const s = shadowSprite(cache, t, m, dpr);
    const sw = sway(t, time);
    const h = crownHeight(t);
    ctx.save();
    ctx.translate(t.x + SUN_X * h + sw * m * 0.12 * (0.4 + wind), t.y + SUN_Y * h);
    ctx.rotate(0.012 * sw);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(s.cv, -s.size / 2, -s.size / 2, s.size, s.size);
    ctx.restore();
  }
}

const TP = pt();

/** Crowns themselves, high above the lawn so they parallax with the camera. */
export function drawCrowns(
  ctx: CanvasRenderingContext2D,
  cache: TreeCache,
  trees: Tree[],
  m: number,
  time: number,
  wind: number,
  camX: number,
  camY: number,
  dpr: number,
) {
  for (const t of trees) {
    const s = crownSprite(cache, t, m, dpr);
    const sw = sway(t, time);
    project(t.x + sw * m * 0.12 * (0.4 + wind), t.y, crownHeight(t), TP);
    const size = s.size * TP.k;
    ctx.save();
    ctx.translate(TP.x - camX, TP.y - camY);
    ctx.rotate(0.012 * sw);
    ctx.drawImage(s.cv, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}
