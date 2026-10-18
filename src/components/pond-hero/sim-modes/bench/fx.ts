import { simFont } from "../shared/sim-font";
import { pondField, pondPoint, type Park } from "./layout";
import { makeCanvas, ctx2d, rand, seeded, TAU, valueNoise } from "./math";
import { castShadow } from "./props";
import { project, pt, shadowOf } from "./projection";

export type Ripple = { x: number; y: number; age: number; life: number; r: number; a: number; alive: boolean };
export type Sparkle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  s: number;
  rgb: string;
  alive: boolean;
};
export type Puff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r0: number;
  r1: number;
  a: number;
  /** Cigarette smoke is blue-grey; exhaled breath is warm white. */
  blue: boolean;
  seed: number;
  alive: boolean;
};
export type Bubble = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  r: number;
  age: number;
  life: number;
  ph: number;
  alive: boolean;
};
export type Leaf = {
  x: number;
  y: number;
  z: number;
  rot: number;
  spin: number;
  ph: number;
  col: number;
  t: number;
  /** 0 idle, 1 falling, 2 on the lawn, 3 floating. */
  state: number;
};
export type LilyFlower = { x: number; y: number; r: number; rot: number; ph: number };
export type Speech = { text: string; x: number; y: number; t: number; life: number };

const RIPPLES = 80;
const SPARKLES = 140;
const PUFFS = 320;

export type Fx = {
  ripples: Ripple[];
  rippleHead: number;
  sparkles: Sparkle[];
  sparkleHead: number;
  puffs: Puff[];
  puffHead: number;
  bubbles: Bubble[];
  leaves: Leaf[];
  leafTimer: number;
  flowers: LilyFlower[];
  speech: Speech;
  rippleUniform: Float32Array;
};

export function createFx(park: Park): Fx {
  const r = seeded(5);
  const flowers: LilyFlower[] = [];
  for (let i = 0; i < 5; i++) {
    const p = pondPoint(park.pond, -0.7 + 1.2 * r(), 0.76 + 0.14 * r());
    flowers.push({ x: p.x, y: p.y, r: park.m * (0.15 + 0.06 * r()), rot: 6 * r(), ph: 6 * r() });
  }
  return {
    ripples: Array.from({ length: RIPPLES }, () => ({ x: 0, y: 0, age: 0, life: 1, r: 1, a: 0, alive: false })),
    rippleHead: 0,
    sparkles: Array.from({ length: SPARKLES }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 1,
      s: 1,
      rgb: "",
      alive: false,
    })),
    sparkleHead: 0,
    puffs: Array.from({ length: PUFFS }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 1,
      r0: 1,
      r1: 1,
      a: 0,
      blue: false,
      seed: 0,
      alive: false,
    })),
    puffHead: 0,
    bubbles: Array.from({ length: 40 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      z: 0,
      vz: 0,
      r: 0,
      age: 0,
      life: 1,
      ph: 0,
      alive: false,
    })),
    leaves: Array.from({ length: 36 }, () => ({ x: 0, y: 0, z: 0, rot: 0, spin: 0, ph: 0, col: 0, t: 0, state: 0 })),
    leafTimer: 1,
    flowers,
    speech: { text: "", x: 0, y: 0, t: 0, life: 0 },
    rippleUniform: new Float32Array(48),
  };
}

export function spawnRipple(fx: Fx, x: number, y: number, r: number, a = 0.5, life = 2.2) {
  let slot = fx.rippleHead;
  for (let i = 0; i < RIPPLES; i++) {
    const j = (fx.rippleHead + i) % RIPPLES;
    if (!fx.ripples[j].alive) {
      slot = j;
      break;
    }
  }
  Object.assign(fx.ripples[slot], { x, y, r, a, life, age: 0, alive: true });
  fx.rippleHead = (slot + 1) % RIPPLES;
}

export function spawnSparkle(fx: Fx, x: number, y: number, m: number, count = 1, speed = 0, rgb = "255, 252, 236", size = 1) {
  for (let i = 0; i < count; i++) {
    const s = fx.sparkles[fx.sparkleHead];
    fx.sparkleHead = (fx.sparkleHead + 1) % SPARKLES;
    const a = rand(0, 6.28);
    const v = speed * rand(0.4, 1);
    Object.assign(s, {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: rand(0.5, 1.1),
      s: m * rand(0.03, 0.07) * size,
      rgb,
      alive: true,
    });
  }
}

export function spawnPuff(fx: Fx, x: number, y: number, vx: number, vy: number, m: number, breath: boolean) {
  const p = fx.puffs[fx.puffHead];
  fx.puffHead = (fx.puffHead + 1) % PUFFS;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.age = 0;
  p.alive = true;
  p.blue = !breath;
  p.seed = 100 * Math.random();
  if (breath) {
    p.life = 3.5 + 2.5 * Math.random();
    p.r0 = 0.1 * m;
    p.r1 = m * (0.9 + 0.7 * Math.random());
    p.a = 0.36;
  } else {
    p.life = 3.4 + 1.8 * Math.random();
    p.r0 = 0.04 * m;
    p.r1 = m * (0.32 + 0.3 * Math.random());
    p.a = 0.32;
  }
}

export function say(fx: Fx, text: string, x: number, y: number, life = 4.2) {
  Object.assign(fx.speech, { text, x, y, t: 0, life });
}

export function popBubble(fx: Fx, b: Bubble, m: number) {
  b.alive = false;
  spawnSparkle(fx, b.x, b.y, m, 9, 1.2 * m);
}

/** Tap test against live bubbles; pops the first hit. */
export function popBubbleAt(fx: Fx, x: number, y: number, m: number): boolean {
  for (const b of fx.bubbles) {
    if (b.alive && Math.hypot(b.x - x, b.y - y) < b.r + 0.35 * m) {
      popBubble(fx, b, m);
      return true;
    }
  }
  return false;
}

export function blowBubble(fx: Fx, x: number, y: number, vx: number, vy: number, m: number) {
  const b = fx.bubbles.find((e) => !e.alive);
  if (!b) return;
  Object.assign(b, {
    x,
    y,
    vx,
    vy,
    z: 1.1,
    vz: rand(-0.05, 0.25),
    r: m * rand(0.14, 0.3),
    age: 0,
    life: rand(5, 13),
    ph: rand(0, 6),
    alive: true,
  });
}

export const LEAF_COLORS = ["#d6c25a", "#9cc45a", "#e0a648", "#b8d070", "#c8803c"];

export function updateLeaves(fx: Fx, park: Park, dt: number, windX: number, windY: number, gust: number) {
  const m = park.m;
  fx.leafTimer -= dt * (0.4 + gust);
  if (fx.leafTimer <= 0) {
    fx.leafTimer = rand(1.2, 3.5);
    const tree = park.trees[(Math.random() * park.trees.length) | 0];
    const leaf = fx.leaves.find((e) => e.state === 0);
    if (leaf) {
      const a = rand(0, 6.28);
      const d = Math.sqrt(Math.random()) * tree.r * 0.9;
      Object.assign(leaf, {
        x: tree.x + Math.cos(a) * d,
        y: tree.y + Math.sin(a) * d,
        z: rand(3.5, 5.5),
        rot: rand(0, 6.28),
        spin: rand(-3, 3),
        ph: rand(0, 6),
        col: (Math.random() * LEAF_COLORS.length) | 0,
        t: 0,
        state: 1,
      });
    }
  }
  for (const l of fx.leaves) {
    if (l.state === 0) continue;
    l.t += dt;
    l.ph += dt;
    if (l.state === 1) {
      l.z -= dt * (0.55 + 0.3 * Math.sin(2.4 * l.ph));
      l.x += (0.9 * windX + 0.5 * Math.cos(2.4 * l.ph)) * m * dt;
      l.y += (0.9 * windY + 0.3 * Math.sin(1.7 * l.ph)) * m * dt;
      l.rot += l.spin * dt;
      if (l.z <= 0) {
        l.z = 0;
        l.t = 0;
        if (pondField(park.pond, l.x, l.y) > 0) {
          l.state = 3;
          spawnRipple(fx, l.x, l.y, 0.5 * m, 0.35, 1.4);
        } else l.state = 2;
      }
    } else if (l.state === 3) {
      l.x += windX * m * 0.08 * dt;
      l.y += windY * m * 0.08 * dt;
    }
    if (l.state >= 2 && l.t > 30) l.state = 0;
    if (l.x < -(8 * m) || l.x > park.w + 8 * m || l.y < -(8 * m) || l.y > park.h + 8 * m) l.state = 0;
  }
}

export function updateSparkles(fx: Fx, dt: number) {
  for (const s of fx.sparkles) {
    if (!s.alive) continue;
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 1 - 3 * dt;
    s.vy *= 1 - 3 * dt;
    if (s.age > s.life) s.alive = false;
  }
}

export function updateBubbles(fx: Fx, dt: number, windX: number, windY: number, m: number, time: number) {
  for (const b of fx.bubbles) {
    if (!b.alive) continue;
    b.age += dt;
    b.vx += (windX * m * 0.7 - b.vx) * dt * 0.5 + Math.sin(1.3 * time + b.ph) * m * 0.2 * dt;
    b.vy += (windY * m * 0.7 - b.vy) * dt * 0.5 + Math.cos(1.1 * time + b.ph) * m * 0.2 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z = Math.max(0.05, b.z + b.vz * dt);
    b.vz -= 0.02 * dt;
    if (b.age > b.life || b.z <= 0.05) popBubble(fx, b, m);
  }
}

/** Smoke curls along a divergence-free noise field and drifts downwind. */
export function updatePuffs(fx: Fx, dt: number, time: number, windX: number, windY: number, m: number) {
  const inv = 1 / (0.9 * m);
  for (const p of fx.puffs) {
    if (!p.alive) continue;
    p.age += dt;
    if (p.age >= p.life) {
      p.alive = false;
      continue;
    }
    const nx = p.x * inv;
    const ny = p.y * inv;
    const drift = 0.35 * time;
    const dy =
      valueNoise(nx + drift, ny + 0.35 + 0.01 * p.seed) - valueNoise(nx + drift, ny - 0.35 + 0.01 * p.seed);
    const dx =
      valueNoise(nx + 0.35 + drift, ny + 0.01 * p.seed) - valueNoise(nx - 0.35 + drift, ny + 0.01 * p.seed);
    const grown = Math.min(1, p.age / 1.2);
    const curl = m * (0.9 + 1.2 * grown);
    p.vx += (dy * curl * 6 + windX * m * grown * 0.9 - 0.9 * p.vx) * dt;
    p.vy += (-dx * curl * 6 + windY * m * grown * 0.9 - 0.9 * p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function ageRipples(fx: Fx, dt: number) {
  for (const r of fx.ripples) {
    if (r.alive && (r.age += dt) >= r.life) r.alive = false;
  }
}

/** The 12 most recent strong ripples, packed for `uRipples`. */
export function rippleUniforms(fx: Fx): Float32Array {
  const out = fx.rippleUniform;
  out.fill(0);
  let n = 0;
  for (let i = 0; i < RIPPLES && n < 12; i++) {
    const r = fx.ripples[(fx.rippleHead - 1 - i + 2 * RIPPLES) % RIPPLES];
    if (!r.alive || r.a < 0.3 || r.age > 4) continue;
    out[4 * n] = r.x;
    out[4 * n + 1] = r.y;
    out[4 * n + 2] = r.age;
    out[4 * n + 3] = Math.min(1.2, 1.6 * r.a);
    n++;
  }
  return out;
}

const LP = pt();

export function drawBubbleShadows(ctx: CanvasRenderingContext2D, fx: Fx, m: number) {
  for (const b of fx.bubbles) {
    if (b.alive) castShadow(ctx, b.x + 0.78 * b.z * m, b.y - 0.22 * b.z * m, 0.5 * b.r, 0.01, 0.12);
  }
}

export function drawLeafShadows(ctx: CanvasRenderingContext2D, fx: Fx, m: number) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (const l of fx.leaves) {
    if (l.state !== 1) continue;
    shadowOf(l.x, l.y, l.z * m, LP);
    ctx.beginPath();
    ctx.ellipse(LP.x, LP.y, 0.1 * m, 0.05 * m, l.rot, 0, TAU);
    ctx.fill();
  }
}

export function drawLilyFlowers(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const f of fx.flowers) {
    for (let ring = 0; ring < 2; ring++) {
      const r = f.r * (ring ? 0.6 : 1);
      ctx.fillStyle = ring ? "rgb(252, 236, 236)" : "rgb(240, 214, 220)";
      for (let i = 0; i < 8; i++) {
        const a = f.rot + (i / 8) * TAU + 0.4 * ring;
        ctx.beginPath();
        ctx.ellipse(f.x + Math.cos(a) * r * 0.5, f.y + Math.sin(a) * r * 0.5, 0.5 * r, 0.2 * r, a, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgb(236, 200, 90)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, 0.16 * f.r, 0, TAU);
    ctx.fill();
  }
}

export function drawLeaves(ctx: CanvasRenderingContext2D, fx: Fx, m: number) {
  for (const l of fx.leaves) {
    if (l.state === 0) continue;
    project(l.x, l.y, l.z * m, LP);
    const fade = l.state >= 2 ? Math.min(1, (30 - l.t) / 5) : 1;
    const flip = l.state === 1 ? 0.35 + 0.65 * Math.abs(Math.sin(2.4 * l.ph)) : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = LEAF_COLORS[l.col];
    ctx.beginPath();
    ctx.ellipse(LP.x, LP.y, 0.11 * m * LP.k, 0.06 * m * LP.k * flip, l.rot, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Ripple rings on the water and the lily flowers' soft glow. */
export function drawRipplesAndGlow(ctx: CanvasRenderingContext2D, fx: Fx, time: number) {
  for (const r of fx.ripples) {
    if (!r.alive) continue;
    const f = r.age / r.life;
    const grow = 1 - (1 - f) * (1 - f);
    const rad = Math.max(0.5, r.r * grow);
    const a = r.a * (1 - f) * (1 - f) * 0.45;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(230, 244, 236, ${a})`;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, rad, 0.94 * rad, 0, 0, TAU);
    ctx.stroke();
  }
  for (const f of fx.flowers) {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 3.2 * f.r);
    g.addColorStop(0, `rgba(255, 236, 240, ${0.28 + 0.06 * Math.sin(0.7 * time + f.ph)})`);
    g.addColorStop(1, "rgba(255, 236, 240, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 3.2 * f.r, 0, TAU);
    ctx.fill();
  }
}

export function drawBubbles(ctx: CanvasRenderingContext2D, fx: Fx, time: number) {
  for (const b of fx.bubbles) {
    if (!b.alive) continue;
    const fade = Math.min(1, 3 * b.age) * Math.min(1, (b.life - b.age) * 2);
    const wob = 1 + 0.04 * Math.sin(6 * time + b.ph);
    const film = ctx.createRadialGradient(b.x, b.y, 0.6 * b.r, b.x, b.y, b.r);
    film.addColorStop(0, "rgba(255,255,255,0)");
    film.addColorStop(0.85, `rgba(255, 240, 255, ${0.22 * fade})`);
    film.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = film;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r * wob, b.r / wob, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(0.8, 0.08 * b.r);
    const hue = (40 * time + 60 * b.ph) % 360;
    ctx.strokeStyle = `hsla(${hue}, 90%, 78%, ${0.55 * fade})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 0.95 * b.r, 0.4, 2.6);
    ctx.stroke();
    ctx.strokeStyle = `hsla(${(hue + 150) % 360}, 90%, 80%, ${0.5 * fade})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 0.95 * b.r, 3.4, 5.6);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.85 * fade})`;
    ctx.beginPath();
    ctx.ellipse(b.x - 0.38 * b.r, b.y - 0.38 * b.r, 0.2 * b.r, 0.11 * b.r, -0.8, 0, TAU);
    ctx.fill();
  }
}

function glint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number, rgb = "255, 252, 236") {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 2.2 * s);
  g.addColorStop(0, `rgba(${rgb}, ${0.5 * a})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 2.2 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 254, 246, ${a})`;
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - 1.3 * s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + 1.3 * s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.fill();
}

export function drawSparkles(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const s of fx.sparkles) {
    if (!s.alive) continue;
    const f = s.age / s.life;
    const tw = 0.6 + 0.4 * Math.sin(30 * s.age);
    glint(ctx, s.x, s.y, s.s * (1 - 0.5 * f), (1 - f) * 0.9 * tw, s.rgb);
  }
}

function puffSprite(r: number, g: number, b: number) {
  const cv = makeCanvas(64, 64);
  const ctx = ctx2d(cv);
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return cv;
}

let smokeSprite: HTMLCanvasElement | null = null;
let breathSprite: HTMLCanvasElement | null = null;

export function drawPuffs(ctx: CanvasRenderingContext2D, fx: Fx) {
  if (!smokeSprite || !breathSprite) {
    smokeSprite = puffSprite(214, 222, 236);
    breathSprite = puffSprite(236, 234, 230);
  }
  for (const p of fx.puffs) {
    if (!p.alive) continue;
    const f = p.age / p.life;
    const r = p.r0 + (p.r1 - p.r0) * Math.sqrt(f);
    const a = p.a * Math.min(1, 10 * f) * (1 - f) * (1 - f);
    if (a < 0.004) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(p.blue ? smokeSprite : breathSprite, p.x - r, p.y - r, 2 * r, 2 * r);
  }
  ctx.globalAlpha = 1;
}

/** The smoker's speech bubble, drawn on the crisp top canvas. */
export function drawSpeech(ctx: CanvasRenderingContext2D, fx: Fx, width: number) {
  const sp = fx.speech;
  if (sp.life <= 0 || sp.t >= sp.life) return;
  const appear = Math.min(1, sp.t / 0.25);
  const alpha = Math.min(appear, Math.min(1, (sp.life - sp.t) / 0.4));
  ctx.save();
  ctx.font = simFont(10.5);
  const w = ctx.measureText(sp.text).width + 16;
  let x = sp.x - w / 2;
  x = Math.max(8, Math.min(width - w - 8, x));
  const y = sp.y - 20 - 14 - (1 - (1 - (1 - appear) ** 3)) * 4;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(60, 50, 40, 0.12)";
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 2, w, 20, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 253, 248, 0.95)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 20, 8);
  ctx.fill();
  const tail = Math.max(x + 10, Math.min(x + w - 10, sp.x));
  ctx.beginPath();
  ctx.moveTo(tail - 4, y + 20 - 0.5);
  ctx.lineTo(tail, y + 20 + 5);
  ctx.lineTo(tail + 3, y + 20 - 0.5);
  ctx.fill();
  ctx.fillStyle = "rgba(42, 37, 32, 0.78)";
  ctx.textBaseline = "middle";
  ctx.fillText(sp.text, x + 8, y + 10 + 0.5);
  ctx.restore();
}
