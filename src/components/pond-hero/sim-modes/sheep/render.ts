import { rgbCss, type Rgb } from "../shared/sim-frame";
import { simFont } from "../shared/sim-font";
import { drawFence, drawFenceShadows } from "./fence";
import { renderFrameMask, renderGrass } from "./field";
import { drawSheepSprite } from "./sheep-sprite";
import {
  ANTICIPATION_DURATION,
  JUMP_DURATION,
  JUMP_VELOCITY,
  LANDING_DURATION,
  RAIL_TOP,
  RUN_UP,
  STRUGGLE_DURATION,
  STUCK_DURATION,
  SheepState,
  TUMBLE_DURATION,
  type Flock,
  type Sheep,
} from "./simulation";
import type { Ctx2D, Surface } from "./surface";

const INK = "rgb(42, 37, 32)";
const DUST = "rgb(180,172,155)";
const POOL_SIZE = 40;

export type SpeechLines = {
  stuck: string[];
  struggle: string[];
  thoughts: string[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  alpha: number;
};

const isPastFence = (state: SheepState) =>
  state === SheepState.LANDING || state === SheepState.WALKING_OUT || state === SheepState.TUMBLE;

function liftOffset(s: Sheep): number {
  switch (s.state) {
    case SheepState.JUMPING:
    case SheepState.TUMBLE:
      return s.jumpY;
    case SheepState.STUCK:
      return -RAIL_TOP + 0.3 * s.size + 1.2 * Math.sin(8 * s.t);
    case SheepState.STRUGGLING: {
      const k = s.t / STRUGGLE_DURATION;
      return -RAIL_TOP + 0.3 * s.size + Math.sin(s.t * (12 + 6 * k)) * (1.5 + 2 * k);
    }
    case SheepState.ANTICIPATION: {
      const k = s.t / ANTICIPATION_DURATION;
      return 4 * k * k;
    }
    case SheepState.LANDING: {
      const k = s.t / LANDING_DURATION;
      return 3 * (1 - k) * (1 - k);
    }
    default:
      return 0;
  }
}

function squash(s: Sheep): [number, number] {
  switch (s.state) {
    case SheepState.ANTICIPATION: {
      const k = (s.t / ANTICIPATION_DURATION) ** 2;
      return [1 + 0.12 * k, 1 - 0.1 * k];
    }
    case SheepState.JUMPING: {
      const k = 0.12 * Math.min(Math.abs(s.vy) / JUMP_VELOCITY, 1);
      return [1 - 0.6 * k, 1 + k];
    }
    case SheepState.STUCK: {
      const k = 0.04 * Math.sin(6 * s.t);
      return [1.05 + k, 0.95 - k];
    }
    case SheepState.STRUGGLING: {
      const amp = 0.08 + (s.t / STRUGGLE_DURATION) * 0.06;
      const k = Math.sin(14 * s.t) * amp;
      return [1 + k, 1 - k];
    }
    case SheepState.LANDING: {
      const k = (1 - s.t / LANDING_DURATION) ** 2;
      return [1 + 0.1 * k, 1 - 0.08 * k];
    }
    default:
      return [1, 1];
  }
}

function tilt(s: Sheep): number {
  switch (s.state) {
    case SheepState.JUMPING: {
      const k = s.t / JUMP_DURATION;
      if (k < 0.15) {
        const e = k / 0.15;
        return -0.14 * e * (2 - e);
      }
      if (k < 0.45) {
        const e = (k - 0.15) / 0.3;
        return -0.14 * (1 - e * e);
      }
      if (k < 0.75) return 0;
      const e = (k - 0.75) / 0.25;
      return 0.12 * e * e;
    }
    case SheepState.STUCK:
      return 0.12 + 0.1 * Math.sin(7 * s.t);
    case SheepState.STRUGGLING: {
      const k = s.t / STRUGGLE_DURATION;
      return 0.12 + 0.35 * k + Math.sin(16 * s.t) * (0.12 + 0.1 * k);
    }
    case SheepState.TUMBLE:
      return 0.45 + 0.8 * (s.t / TUMBLE_DURATION);
    case SheepState.ANTICIPATION:
      return 0.05 * (s.t / ANTICIPATION_DURATION);
    case SheepState.LANDING: {
      const k = s.t / LANDING_DURATION;
      return 0.1 * (1 - k) * (1 - k);
    }
    default:
      return 0;
  }
}

function drawGroundShadow(ctx: Ctx2D, x: number, y: number, size: number, jumpY: number) {
  const bw = 0.58 * size;
  const lift = Math.min(Math.abs(jumpY) / 90, 1);
  const shrink = 1 - 0.35 * lift;
  const strength = 0.08 * (1 - 0.7 * lift);
  if (strength < 0.005) return;
  const cx = x - 0.5 * bw * shrink;
  const rx = 0.9 * bw * shrink;
  const ry = 0.15 * bw * shrink;
  const k = strength / 0.08;
  ctx.globalAlpha = 0.3 * k;
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.beginPath();
  ctx.ellipse(cx, y, 1.1 * rx, 1.6 * ry, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 0.7 * k;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(cx, y, 0.7 * rx, ry, 0, 0, 2 * Math.PI);
  ctx.ellipse(cx - 0.45 * rx, y, 0.35 * rx, 0.85 * ry, 0, 0, 2 * Math.PI);
  ctx.ellipse(cx + 0.45 * rx, y, 0.35 * rx, 0.85 * ry, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSpeech(
  ctx: Ctx2D,
  x: number,
  bodyY: number,
  size: number,
  state: SheepState,
  t: number,
  wobble: number,
  lines: SpeechLines,
) {
  const seed = (1e3 * wobble) | 0;
  let text: string;
  if (seed % 10 === 0) text = lines.thoughts[seed % lines.thoughts.length];
  else {
    const pool = state === SheepState.STUCK ? lines.stuck : lines.struggle;
    text = pool[seed % pool.length];
  }
  const fadeIn = Math.min(t / 0.15, 1);
  const cy = bodyY - 0.55 * size + 1.5 * Math.sin(5 * t);
  ctx.save();
  ctx.globalAlpha = 0.9 * fadeIn;
  const fontPx = (((0.15 * size) / 2) | 0) * 2 || 2;
  ctx.font = simFont(fontPx, 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(text);
  const padX = 0.7 * fontPx;
  const padY = 0.5 * fontPx;
  const bw = metrics.width + 2 * padX;
  const bh = fontPx + 2 * padY;
  const left = x + 0.3 * size;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.roundRect(left, cy - bh / 2, bw, bh, 0.35 * bh);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(left + 0.15 * bw, cy + bh / 2 - 1);
  ctx.lineTo(left - 0.05 * size, cy + bh / 2 + 0.08 * size);
  ctx.lineTo(left + 0.3 * bw, cy + bh / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(42, 37, 32, 0.7)";
  ctx.fillText(text, left + bw / 2, cy);
  ctx.restore();
}

export type SheepScene = {
  render: (ctx: Ctx2D, flock: Flock, w: number, h: number, dt: number) => void;
};

/** Per-instance renderer: owns the size-keyed caches and the dust particle pool. */
export function createSheepScene(getBackdrop: () => Rgb, getLines: () => SpeechLines): SheepScene {
  let grass: { w: number; h: number; surface: Surface | null } | null = null;
  let mask: { w: number; h: number; surface: Surface | null } | null = null;
  let sky: { w: number; h: number; key: string; grad: CanvasGradient } | null = null;
  const particles: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 0,
    life: 999,
    maxLife: 1,
    alpha: 0,
  }));
  let cursor = 0;

  const nextParticle = (): Particle => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const idx = (cursor + i) % POOL_SIZE;
      const p = particles[idx];
      if (p.life >= p.maxLife) {
        cursor = (idx + 1) % POOL_SIZE;
        return p;
      }
    }
    const p = particles[cursor];
    cursor = (cursor + 1) % POOL_SIZE;
    return p;
  };

  const kickDust = (x: number, y: number, rush: number) => {
    const n = rush > 0.7 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const p = nextParticle();
      p.x = x - 8 - 12 * Math.random();
      p.y = y - 2 + 4 * Math.random();
      p.vx = -15 - 25 * Math.random() * rush;
      p.vy = -8 - 18 * Math.random() * rush;
      p.r = 1.5 + 2.5 * Math.random();
      p.life = 0;
      p.maxLife = 0.3 + 0.25 * Math.random();
      p.alpha = 0.12 + 0.12 * Math.random();
    }
  };

  const landingPuff = (x: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      const p = nextParticle();
      const angle = Math.PI + (Math.random() - 0.5) * 1.8;
      const speed = 20 + 30 * Math.random();
      p.x = x - 5 + 10 * Math.random();
      p.y = y - 1 + 3 * Math.random();
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 10 - 15 * Math.random();
      p.r = 2 + 3 * Math.random();
      p.life = 0;
      p.maxLife = 0.3 + 0.2 * Math.random();
      p.alpha = 0.18 + 0.1 * Math.random();
    }
  };

  const drawParticles = (ctx: Ctx2D, dt: number) => {
    ctx.fillStyle = DUST;
    let touched = false;
    for (const p of particles) {
      if (p.life >= p.maxLife) continue;
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.r += 3 * dt;
      const k = p.life / p.maxLife;
      const a = p.alpha * Math.min(8 * k, 1) * (1 - k * k);
      if (a < 0.005) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fill();
      touched = true;
    }
    if (touched) ctx.globalAlpha = 1;
  };

  const drawSheep = (ctx: Ctx2D, s: Sheep, w: number) => {
    const lift = liftOffset(s);
    const [sx, sy] = squash(s);
    const angle = tilt(s);
    const rushStart = 0.5 * w - 130 - RUN_UP;
    const rush =
      s.state === SheepState.WALKING_IN && s.x > rushStart ? Math.min((s.x - rushStart) / RUN_UP, 1) : 0;
    const rushing = rush > 0;
    let bob = 0;
    if (s.state === SheepState.WALKING_IN || s.state === SheepState.WALKING_OUT) {
      const phase = (s.legFrame / 8) * Math.PI * 2;
      if (rushing) bob = Math.abs(Math.sin(phase)) * (2 + 3 * rush);
      else bob = Math.sin(phase) ** 2 * 1.5;
    }
    const bodyY = s.y - 0.32 * s.size + lift + bob;
    const jumpProgress = s.state === SheepState.JUMPING ? Math.min(s.t / JUMP_DURATION, 1) : 0;
    const landing = s.state === SheepState.LANDING ? Math.min(s.t / LANDING_DURATION, 1) : 0;
    let struggle = 0;
    if (s.state === SheepState.STUCK) struggle = 0.3 + 0.2 * (s.t / STUCK_DURATION);
    else if (s.state === SheepState.STRUGGLING) struggle = 0.5 + 0.5 * (s.t / STRUGGLE_DURATION);
    else if (s.state === SheepState.TUMBLE) struggle = 0.8;

    drawGroundShadow(ctx, s.x, s.y, s.size, s.jumpY);
    if (rushing && rush > 0.4) kickDust(s.x - 0.3 * s.size, s.y, rush);
    if (s.state === SheepState.LANDING && s.t < 0.02) landingPuff(s.x, s.y);

    if (sx !== 1 || sy !== 1 || angle !== 0) {
      ctx.save();
      ctx.translate(s.x, bodyY);
      if (angle !== 0) ctx.rotate(angle);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      drawSheepSprite(ctx, 0, 0, s.size, s.legFrame, s.colorIdx, jumpProgress, rushing, landing, struggle);
      ctx.restore();
    } else {
      drawSheepSprite(ctx, s.x, bodyY, s.size, s.legFrame, s.colorIdx, jumpProgress, rushing, landing, struggle);
    }

    if (s.state === SheepState.STUCK || s.state === SheepState.STRUGGLING) {
      drawSpeech(ctx, s.x, bodyY, s.size, s.state, s.t, s.wobble, getLines());
    }
  };

  const drawSky = (ctx: Ctx2D, w: number, h: number, time: number) => {
    const backdrop = getBackdrop();
    const key = `${backdrop.r},${backdrop.g},${backdrop.b}`;
    if (!sky || sky.w !== w || sky.h !== h || sky.key !== key) {
      const grad = ctx.createLinearGradient(0, 0, 0, 0.32 * h);
      grad.addColorStop(0, rgbCss(backdrop));
      grad.addColorStop(1, "#e8d5c4");
      sky = { w, h, key, grad };
    }
    ctx.fillStyle = sky.grad;
    ctx.fillRect(0, 0, w, h);

    const mx = 0.78 * w;
    const my = 0.14 * h;
    ctx.fillStyle = "rgba(42, 37, 32, 0.02)";
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "rgba(42, 37, 32, 0.07)";
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = rgbCss(backdrop);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(mx + 3, my - 1, 7.800000000000001, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    const skyH = 0.32 * h;
    ctx.fillStyle = INK;
    for (let i = 0; i < 12; i++) {
      const x = (((7919 * i + 31) % 997) / 997) * w;
      const y = (((4813 * i + 71) % 991) / 991) * skyH * 0.75;
      ctx.globalAlpha = 0.08 + 0.08 * Math.sin(0.5 * time + 2.3 * i);
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const render: SheepScene["render"] = (ctx, flock, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    drawSky(ctx, w, h, flock.time);
    if (!grass || grass.w !== w || grass.h !== h) grass = { w, h, surface: renderGrass(w, h) };
    if (grass.surface) ctx.drawImage(grass.surface.canvas, 0, 0);
    drawFenceShadows(ctx, w, h);

    let anyPast = false;
    let anyBefore = false;
    for (const s of flock.sheep) {
      if (isPastFence(s.state)) anyPast = true;
      else anyBefore = true;
    }
    // Sheep that have crossed sit on the far side, so they're drawn behind the fence.
    if (anyPast) {
      for (const s of flock.sheep) if (isPastFence(s.state)) drawSheep(ctx, s, w);
    }
    drawFence(ctx, w, h);
    if (anyBefore) {
      for (const s of flock.sheep) if (!isPastFence(s.state)) drawSheep(ctx, s, w);
    }
    drawParticles(ctx, dt);

    if (flock.count >= 1) {
      ctx.font = simFont(13, 600);
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(42, 37, 32, 0.2)";
      ctx.fillText(String(flock.count), w - 16, 12);
    }

    if (!mask || mask.w !== w || mask.h !== h) mask = { w, h, surface: renderFrameMask(w, h) };
    if (mask.surface) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask.surface.canvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }
  };

  return { render };
}
