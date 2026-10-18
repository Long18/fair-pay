import { fractalNoise } from "../../gl/paper";
import { createScratch, TAU, type Ctx2D, type Scratch } from "./util";

/** Seconds per swash/backwash cycle. */
export const WAVE_PERIOD = 7;
/** Run-up reach (fraction of height) for successive waves; > 0.3 counts as a big set wave. */
const WAVE_AMPS = [0.16, 0.22, 0.14, 0.38, 0.18, 0.13, 0.45, 0.2, 0.25, 0.15];

type Foam = { x: number; y: number; rx: number; rot: number; life: number; drift: number };

export type WaveState = {
  time: number;
  waveIdx: number;
  foam: Foam[];
  /** Per-pixel-column wobble of the water edge. */
  edgeOffsets: Float32Array;
};

/** Per-instance render caches (the original kept these module-global). */
export type WaveCache = {
  edgeTick: number;
  texture: Scratch | null;
  textureW: number;
  textureH: number;
  textureTick: number;
  noiseRows: Map<number, Float32Array>;
  noiseRowsWidth: number;
  gradient: { w: number; waveY: number; isBig: boolean; grad: CanvasGradient } | null;
};

export function createWaveState(): WaveState {
  return { time: 0, waveIdx: 0, foam: [], edgeOffsets: new Float32Array(0) };
}

export function createWaveCache(): WaveCache {
  return {
    edgeTick: 0,
    texture: null,
    textureW: 0,
    textureH: 0,
    textureTick: 0,
    noiseRows: new Map(),
    noiseRowsWidth: 0,
    gradient: null,
  };
}

export function waveAmp(s: WaveState): number {
  return WAVE_AMPS[s.waveIdx % WAVE_AMPS.length];
}

/** Water-line y for cycle phase 0–1: fast cubic swash for the first quarter, slow backwash after. */
export function waveLineY(phase: number, h: number, amp: number): number {
  const rest = 0.18 * h;
  const peak = rest + amp * h;
  if (phase < 0.25) {
    const t = phase / 0.25;
    return rest + (peak - rest) * (1 - (1 - t) * (1 - t) * (1 - t));
  }
  const l = (phase - 0.25) / 0.75;
  return rest + (peak - rest) * (1 - l * l);
}

export function wavePose(s: WaveState, h: number): { y: number; swashing: boolean } {
  const phase = (s.time % WAVE_PERIOD) / WAVE_PERIOD;
  return { y: waveLineY(phase, h, waveAmp(s)), swashing: phase < 0.25 };
}

export function updateWave(s: WaveState, w: number, h: number, dt: number) {
  const prev = Math.floor(s.time / WAVE_PERIOD);
  s.time += dt;
  if (Math.floor(s.time / WAVE_PERIOD) > prev) s.waveIdx++;
  const phase = (s.time % WAVE_PERIOD) / WAVE_PERIOD;
  const amp = waveAmp(s);
  const y = waveLineY(phase, h, amp);
  const big = amp > 0.3;
  const band = 0.035 * h * (big ? 1.5 : 1);
  const decay = dt / (big ? 4 : 2.8);
  const spawn = (big ? 30 : 16) * dt;
  if (s.foam.length < 90) {
    for (let i = 0; i < spawn; i++) {
      const x = Math.random() * w;
      const off = s.edgeOffsets.length > 0 ? s.edgeOffsets[Math.min(0 | x, s.edgeOffsets.length - 1)] : 0;
      s.foam.push({
        x,
        y: y + 0.3 * off + (Math.random() - 0.5) * band * 1.2,
        rx: 1.5 + 3 * Math.random(),
        rot: Math.random() * Math.PI,
        life: 1,
        drift: (Math.random() - 0.5) * 2,
      });
    }
  }
  let n = s.foam.length;
  for (let i = n - 1; i >= 0; i--) {
    const f = s.foam[i];
    f.life -= decay;
    f.x += f.drift * dt;
    f.y += 0.3 * dt;
    if (f.life <= 0) s.foam[i] = s.foam[--n];
  }
  s.foam.length = n;
}

/** Recompute the noisy edge every third frame, sampled every 16px and lerped. */
export function updateEdgeOffsets(s: WaveState, cache: WaveCache, w: number) {
  if (s.edgeOffsets.length !== w) {
    s.edgeOffsets = new Float32Array(w);
    cache.edgeTick = 3;
  }
  if (++cache.edgeTick < 3) return;
  cache.edgeTick = 0;
  const t = 12 * s.time;
  let prev = 0;
  for (let i = 0; i < w; i += 16) {
    const v =
      (2 * fractalNoise(i, t + 42) - 1) * 55 +
      (2 * fractalNoise(i + 5e3, 1.3 * t + 142) - 1) * 25 +
      (2 * fractalNoise(i + 12e3, 0.7 * t + 242) - 1) * 12;
    if (i === 0) {
      s.edgeOffsets[0] = v;
    } else {
      for (let x = i - 16; x < i && x < w; x++) {
        const k = (x - (i - 16)) * 0.0625;
        s.edgeOffsets[x] = prev + (v - prev) * k;
      }
    }
    prev = v;
    s.edgeOffsets[i] = v;
  }
  const last = (((w - 1) / 16) | 0) * 16;
  for (let x = last + 1; x < w; x++) s.edgeOffsets[x] = prev;
}

function noiseRow(cache: WaveCache, seed: number, w: number, step: number): Float32Array {
  if (cache.noiseRowsWidth !== w) {
    cache.noiseRows.clear();
    cache.noiseRowsWidth = w;
  }
  let row = cache.noiseRows.get(seed);
  if (row) return row;
  const len = ((w / step) | 0) + 2;
  row = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const x = i * step;
    row[i] =
      (fractalNoise(0.005 * x, seed) - 0.5) * 38 +
      (fractalNoise(0.014 * x, seed + 300) - 0.5) * 18 +
      (fractalNoise(0.04 * x, seed + 700) - 0.5) * 8 +
      12 * Math.sin(0.004 * x + 0.007 * seed);
  }
  cache.noiseRows.set(seed, row);
  return row;
}

function sampleRow(row: Float32Array, x: number, step: number): number {
  const i = (x / step) | 0;
  return i < row.length ? row[i] : 0;
}

function edgeAt(offsets: Float32Array, x: number, base: number, k: number): number {
  if (offsets.length === 0) return base;
  const i = Math.min(Math.max(0 | x, 0), offsets.length - 1);
  return base + offsets[i] * k;
}

/** Caustic-like mottling inside the water; re-rendered every 6th frame. */
function drawWaterTexture(ctx: Ctx2D, cache: WaveCache, w: number, h: number, waveY: number, time: number, big: boolean) {
  const top = 0.01 * h;
  const bottom = 0.85 * waveY;
  if (bottom <= top) return;
  let tex = cache.texture;
  const sizeChanged = !tex || cache.textureW !== w || cache.textureH !== h;
  if (sizeChanged || ++cache.textureTick >= 6) {
    cache.textureTick = 0;
    if (sizeChanged || !tex) {
      cache.textureW = w;
      cache.textureH = h;
      tex = cache.texture = createScratch(w, h);
    }
    const e = tex.ctx;
    e.clearRect(0, 0, w, h);
    const cellW = w / 16;
    const cellH = (bottom - top) / 4;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= 16; col++) {
        const x = col * cellW;
        const y = top + row * cellH;
        const f =
          0.55 * fractalNoise(0.006 * x + 0.3 * time, 0.009 * y + 0.15 * time) +
          0.45 * fractalNoise(0.01 * x - 0.2 * time, 0.007 * y + 600);
        if (f < 0.42) {
          e.globalAlpha = (0.42 - f) * (big ? 0.18 : 0.12);
          e.fillStyle = "rgba(25,75,88,1)";
          e.fillRect(x - 0.5 * cellW, y - 0.4 * cellH, 1.1 * cellW, 0.9 * cellH);
        }
        if (f > 0.6) {
          e.globalAlpha = (f - 0.6) * (big ? 0.1 : 0.06);
          e.fillStyle = "rgba(160,220,215,1)";
          e.fillRect(x - 0.4 * cellW, y - 0.3 * cellH, 0.9 * cellW, 0.7 * cellH);
        }
      }
    }
    e.globalCompositeOperation = "lighter";
    const glints = big ? 14 : 8;
    for (let i = 0; i < glints; i++) {
      const gx = fractalNoise(0.37 * i + 0.4 * time, 150) * w;
      const gy = top + fractalNoise(0.37 * i + 300, 0.25 * time + 150) * (bottom - top);
      const k = fractalNoise(0.5 * i + 0.6 * time, 500);
      if (k < 0.55) continue;
      e.globalAlpha = (k - 0.55) * 0.06;
      e.fillStyle = "#A0E8E4";
      e.beginPath();
      e.arc(gx, gy, 2 + 5 * k, 0, 2 * Math.PI);
      e.fill();
    }
    for (let i = 0; i < 10; i++) {
      const sx = fractalNoise(0.25 * i + 0.12 * time, 800) * w;
      const sy = top + fractalNoise(0.25 * i + 900, 0.1 * time + 800) * (bottom - top) * 0.85;
      const k = fractalNoise(0.008 * sx + 0.3 * time, 0.008 * sy + 0.2 * time);
      if (k < 0.5) continue;
      e.globalAlpha = (k - 0.5) * 0.03;
      e.strokeStyle = "#88DDDD";
      e.lineWidth = 0.5;
      for (let r = 0; r < 3; r++) {
        const a = 2.1 * r + 0.08 * time + i;
        const len = 4 + 8 * k;
        e.beginPath();
        e.moveTo(sx, sy);
        e.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        e.stroke();
      }
    }
    e.globalCompositeOperation = "source-over";
    e.globalAlpha = 1;
  }
  if (tex) ctx.drawImage(tex.canvas, 0, 0);
}

export function drawWave(ctx: Ctx2D, s: WaveState, cache: WaveCache, w: number, h: number) {
  const phase = (s.time % WAVE_PERIOD) / WAVE_PERIOD;
  const amp = waveAmp(s);
  const waveY = waveLineY(phase, h, amp);
  const big = amp > 0.3;
  const band = 0.035 * h * (big ? 1.5 : 1);
  const edge = s.edgeOffsets;

  // Water body
  {
    const alpha = big ? 0.5 : 0.38;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, edgeAt(edge, w, waveY + 25, 1));
    for (let x = w - 5; x >= 0; x -= 5) ctx.lineTo(x, edgeAt(edge, x, waveY + 25, 1));
    ctx.lineTo(0, edgeAt(edge, 0, waveY + 25, 1));
    ctx.closePath();
    const bottom = waveY + 25;
    let g = cache.gradient;
    if (!g || g.w !== w || Math.abs(g.waveY - bottom) > 2 || g.isBig !== big) {
      const grad = ctx.createLinearGradient(0, 0, 0, bottom);
      grad.addColorStop(0, "rgba(55,130,140,0)");
      grad.addColorStop(0.12, `rgba(55,130,140,${0.2 * alpha})`);
      grad.addColorStop(0.4, `rgba(60,140,148,${0.8 * alpha})`);
      grad.addColorStop(0.7, `rgba(70,155,155,${alpha})`);
      grad.addColorStop(0.88, `rgba(85,165,162,${0.5 * alpha})`);
      grad.addColorStop(1, `rgba(90,170,165,${0.15 * alpha})`);
      g = cache.gradient = { w, waveY: bottom, isBig: big, grad };
    }
    ctx.fillStyle = g.grad;
    ctx.fill();
    ctx.restore();
  }

  drawWaterTexture(ctx, cache, w, h, waveY, s.time, big);

  // Turquoise shoaling bands behind the foam line
  {
    const peak = big ? 0.28 : 0.2;
    for (let l = 0; l < 8; l++) {
      const r = l / 7;
      const off = -35 + 65 * r;
      const alpha = peak * Math.exp(-((r - 0.3) * (r - 0.3)) / 0.08);
      if (alpha < 0.005) continue;
      const cr = Math.round(70 + 160 * r);
      const cg = Math.round(155 + 80 * r);
      const cb = Math.round(158 + 65 * r);
      ctx.save();
      ctx.globalAlpha = alpha;
      const k0 = 0.7 + 0.5 * r;
      const k1 = k0 + 0.15;
      const thick = 8 + (1 - Math.abs(r - 0.3)) * 12;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = edgeAt(edge, x, waveY + off, k0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = w; x >= 0; x -= 5) ctx.lineTo(x, edgeAt(edge, x, waveY + off + thick, k1));
      ctx.closePath();
      ctx.fillStyle = `rgba(${cr},${cg},${cb},1)`;
      ctx.fill();
      ctx.restore();
    }
  }

  // White foam lace
  {
    const peak = big ? 0.22 : 0.16;
    for (let l = 0; l < 7; l++) {
      const r = l / 6;
      const off = -12 + 60 * r;
      const alpha = peak * Math.exp(-((r - 0.25) * (r - 0.25)) / 0.1);
      if (alpha < 0.005) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      const k = 0.8 + 0.5 * r;
      const thick = 5 + (1 - Math.abs(r - 0.25)) * 10;
      const upper = noiseRow(cache, 5e3 + 300 * l, w, 5);
      const lower = noiseRow(cache, 6e3 + 300 * l, w, 5);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = edgeAt(edge, x, waveY + off + 0.3 * sampleRow(upper, x, 5), k);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = w; x >= 0; x -= 5) {
        ctx.lineTo(x, edgeAt(edge, x, waveY + off + thick + 0.35 * sampleRow(lower, x, 5), k + 0.12));
      }
      ctx.closePath();
      const cr = Math.round(245 - 25 * r);
      const cg = Math.round(250 - 35 * r);
      const cb = Math.round(248 - 50 * r);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},1)`;
      ctx.fill();
      ctx.restore();
    }
  }

  // Bubbles along the edge (stable per wave)
  {
    ctx.save();
    const seed = (1e3 * s.waveIdx + 777) | 0;
    const count = big ? 80 : 50;
    for (let i = 0; i < count; i++) {
      const r = (seed + 7919 * i) & 65535;
      const x = (r / 65535) * w;
      const o = (31 * r + 5381) & 65535;
      const dy = (o / 65535 - 0.4) * 40;
      const y = waveY + 0.9 * (edge.length > 0 ? edge[Math.min(0 | x, edge.length - 1)] : 0) + dy;
      const radius = 1 + (((17 * o + 1013) & 65535) / 65535) * 3;
      const alpha = (big ? 0.35 : 0.25) * Math.max(0, 1 - Math.abs(dy) / 20);
      if (alpha < 0.03) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#F8F6F0";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Faint offshore swell lines
  ctx.save();
  const step = w / 40;
  for (let t = 0; t < 3; t++) {
    const baseY = 0.18 * h * (0.3 + 0.25 * t);
    ctx.globalAlpha = 0.04 - 0.01 * t;
    ctx.strokeStyle = "rgba(220,230,228,0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const row = noiseRow(cache, 2e3 + 500 * t, w, step);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * w;
      const y = baseY + 0.5 * sampleRow(row, x, step);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Foam particles
  {
    const peak = big ? 0.45 : 0.3;
    ctx.fillStyle = "#FEFCF4";
    for (let i = 0, n = s.foam.length; i < n; i++) {
      const f = s.foam[i];
      const scale = 0.3 + 0.7 * f.life;
      const alpha = f.life * peak;
      if (alpha < 0.02) continue;
      const dots = 2 + (0 | f.rx);
      for (let t = 0; t < dots; t++) {
        const a = f.rot + 1.9 * t;
        const d = (0.3 + 0.25 * t) * scale * f.rx * 0.5;
        const r = (0.4 + (t % 3) * 0.3) * scale;
        ctx.globalAlpha = alpha * (0.6 + (1 & t) * 0.4);
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Wet sand darkening between the water line and the max reach of this wave
  {
    const top = waveY + 0.5 * band;
    const reach = 0.18 * h + amp * h + band + 10;
    ctx.globalAlpha = big ? 0.03 : 0.02;
    ctx.fillStyle = "rgb(105,92,68)";
    ctx.fillRect(0, top, w, reach - top);
    ctx.globalAlpha = 1;
  }
}
