import { createScratch, randRange, seededRandom, type Ctx2D, type Scratch } from "./util";

type CrabPalette = { body: string; dark: string; leg: string; claw: string; hi: string; eye: string };

const CRAB_PALETTES: CrabPalette[] = [
  { body: "#6A7050", dark: "#505838", leg: "#5E6546", claw: "#78805A", hi: "#889068", eye: "#101008" },
  { body: "#C0B89A", dark: "#A49C80", leg: "#B0A88C", claw: "#CCC4A8", hi: "#D8D0B8", eye: "#1A1510" },
  { body: "#787068", dark: "#5C5650", leg: "#6E6860", claw: "#888078", hi: "#989088", eye: "#101010" },
  { body: "#5C6E6A", dark: "#445450", leg: "#50625E", claw: "#6A7E78", hi: "#7A8E88", eye: "#0E1012" },
  { body: "#585E48", dark: "#404838", leg: "#505640", claw: "#656C52", hi: "#757C62", eye: "#0E0E08" },
  { body: "#8A7A60", dark: "#6A5E48", leg: "#7E7058", claw: "#988868", hi: "#A89878", eye: "#121008" },
];

/** Leg hip offsets [x * halfWidth, y * halfHeight]. */
const LEG_HIPS: [number, number][] = [
  [0.82, -0.38],
  [0.98, -0.1],
  [0.92, 0.12],
  [0.72, 0.3],
];

export type CrabState = "idle" | "walking" | "fleeing" | "entering" | "washing";

export type Crab = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  tilt: number;
  spin: number;
  size: number;
  frame: number;
  colorIdx: number;
  state: CrabState;
  stateTimer: number;
  washCooldown: number;
  dustTimer: number;
};

export type Dust = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
};

const MAX_DUST = 80;

export function spawnDust(dust: Dust[], x: number, y: number, count: number, speed: number, big: boolean) {
  for (let i = 0; i < count && dust.length < MAX_DUST; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + 0.7 * Math.random());
    const life = big ? 0.7 + 0.5 * Math.random() : 0.35 + 0.3 * Math.random();
    dust.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v * 0.6 - (big ? 25 : 8),
      life,
      maxLife: life,
      r: big ? 4 + 5 * Math.random() : 2.5 + 2.5 * Math.random(),
    });
  }
}

export function createCrabs(w: number, h: number): Crab[] {
  const rand = seededRandom(271828);
  const crabs: Crab[] = [];
  for (let n = 0; n < 8; n++) {
    const idle = rand() > 0.4;
    const x = 0.1 * w + 0.8 * rand() * w;
    const y = 0.55 * h + rand() * rand() * 0.38 * h;
    const targetVx = idle ? 0 : (rand() > 0.5 ? 1 : -1) * (40 + 90 * rand());
    const size = 24 + 14 * rand();
    const frame = 4 * rand();
    crabs.push({
      x,
      y,
      vx: 0,
      vy: 0,
      targetVx,
      targetVy: 0,
      tilt: 0,
      spin: 0,
      size,
      frame,
      colorIdx: n % CRAB_PALETTES.length,
      state: idle ? "idle" : "walking",
      stateTimer: randRange(1, 3),
      washCooldown: 0,
      dustTimer: 0,
    });
  }
  return crabs;
}

/** Tap scare: nearby crabs bolt away. Returns how many fled. */
export function scareCrabs(crabs: Crab[], dust: Dust[], px: number, py: number): number {
  let fled = 0;
  for (const c of crabs) {
    if (c.state === "washing" || c.state === "entering") continue;
    const dx = c.x - px;
    const dy = c.y - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 90) {
      const k = d || 1;
      c.state = "fleeing";
      c.stateTimer = 0.8;
      c.vx += (dx / k) * 260;
      c.vy += (dy / k) * 78;
      spawnDust(dust, c.x, c.y + 0.15 * c.size, (12 + 6 * Math.random()) | 0, 70, true);
      fled++;
    }
  }
  return fled;
}

function pickWalkTarget(c: Crab, lateralChance: number, lateralSpread: number) {
  c.targetVx = (Math.random() > 0.5 ? 1 : -1) * randRange(40, 130);
  c.targetVy = lateralChance > Math.random() ? (Math.random() - 0.5) * lateralSpread : 0;
}

export function updateCrabs(
  crabs: Crab[],
  dust: Dust[],
  w: number,
  h: number,
  dt: number,
  waveY: number,
  swashing: boolean,
) {
  let n = dust.length;
  for (let i = n - 1; i >= 0; i--) {
    const d = dust[i];
    d.life -= dt;
    if (d.life <= 0) {
      dust[i] = dust[--n];
      continue;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= 0.94;
    d.vy *= 0.94;
    d.vy += 18 * dt;
  }
  dust.length = n;

  const top = 0.42 * h;
  const bottom = h - 25;
  for (const c of crabs) {
    c.stateTimer -= dt;
    if (c.washCooldown > 0) c.washCooldown -= dt;
    const speed = Math.abs(c.vx) + Math.abs(c.vy);
    if (speed > 3) {
      c.frame += 8 * dt * Math.min(speed / 50, 2.5);
      if (c.frame >= 4) c.frame -= 4;
    }
    if (
      c.state !== "washing" &&
      c.state !== "entering" &&
      c.washCooldown <= 0 &&
      swashing &&
      c.y < waveY + 15 &&
      c.y > waveY - 15
    ) {
      c.state = "washing";
      c.stateTimer = 1.8 + 1.2 * Math.random();
      c.spin = 0;
      c.vx = (Math.random() - 0.5) * 50;
    }
    c.dustTimer -= dt;
    if (c.state === "walking" && speed > 25 && c.dustTimer <= 0) {
      spawnDust(dust, c.x, c.y + 0.12 * c.size, 2, 18, false);
      c.dustTimer = 0.1;
    } else if (c.state === "fleeing" && c.dustTimer <= 0) {
      spawnDust(dust, c.x, c.y + 0.12 * c.size, 3, 35, false);
      c.dustTimer = 0.05;
    }

    switch (c.state) {
      case "idle":
        c.vx *= 0.85;
        c.vy *= 0.85;
        if (c.stateTimer <= 0) {
          c.state = "walking";
          c.stateTimer = randRange(1, 3);
          pickWalkTarget(c, 0.35, 65);
        }
        break;
      case "walking":
        c.vx += (c.targetVx - c.vx) * 6 * dt;
        c.vy += (c.targetVy - c.vy) * 6 * 0.7 * dt;
        if (Math.random() < 0.8 * dt) pickWalkTarget(c, 0.4, 78);
        if (c.stateTimer <= 0) {
          c.state = "idle";
          c.stateTimer = randRange(1, 3);
          c.targetVy = 0;
        }
        break;
      case "fleeing":
        c.vx *= 0.88;
        c.vy *= 0.88;
        if (c.stateTimer <= 0) {
          c.state = "idle";
          c.stateTimer = randRange(0.5, 1.5);
        }
        break;
      case "entering":
        c.vx += (c.targetVx - c.vx) * 6 * dt;
        c.vy += (c.targetVy - c.vy) * 6 * dt;
        if (c.y < 0.55 * h + Math.random() * h * 0.15) {
          c.state = "idle";
          c.stateTimer = randRange(1, 3);
          c.targetVy = 0;
        }
        break;
      case "washing":
        if (c.stateTimer > 1) c.vy += (waveY - c.y) * 3 * dt;
        else c.vy -= 80 * dt;
        c.vx += (Math.random() - 0.5) * 10 * dt;
        c.vx *= 0.97;
        c.vy *= 0.98;
        c.frame += 8 * dt * 3;
        if (c.frame >= 4) c.frame -= 4;
        c.spin += 1.8 * dt;
        if (c.stateTimer <= 0 || c.y < -(2 * c.size)) {
          // Swept out to sea: walk back in from below the frame.
          c.x = 25 + Math.random() * (w - 50);
          c.y = h + c.size + 15;
          c.vx = (Math.random() - 0.5) * 52;
          c.vy = -randRange(40, 91);
          c.targetVx = c.vx;
          c.targetVy = c.vy;
          c.spin = 0;
          c.tilt = 0;
          c.state = "entering";
          c.stateTimer = 0;
          c.washCooldown = 10;
        }
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.x < 25) {
      c.vx = 0.5 * Math.abs(c.vx) + 3;
      c.targetVx = Math.abs(c.targetVx);
    }
    if (c.x > w - 25) {
      c.vx = -(0.5 * Math.abs(c.vx)) - 3;
      c.targetVx = -Math.abs(c.targetVx);
    }
    if (c.state !== "washing" && c.state !== "entering") {
      if (c.y < top) c.vy = 0.3 * Math.abs(c.vy) + 2;
      if (c.y > bottom) c.vy = -(0.3 * Math.abs(c.vy)) - 2;
      const target = Math.sqrt(c.vx * c.vx + c.vy * c.vy) > 8 ? Math.atan2(c.vy, Math.abs(c.vx) || 1) : 0;
      c.tilt += (target - c.tilt) * Math.min(1, 4 * dt);
      c.tilt = Math.max(-0.5, Math.min(0.5, c.tilt));
    }
  }
}

function paintCrab(e: Ctx2D, t: number, frame: number, colorIdx: number) {
  const p = CRAB_PALETTES[colorIdx % CRAB_PALETTES.length];
  const i = 0.5 * t;
  const o = 0.39 * t;
  const phase = (frame / 4) * Math.PI * 2;
  e.lineCap = "round";
  for (let side = -1; side <= 1; side += 2) {
    for (let s = 0; s < 4; s++) {
      const [hx, hy] = LEG_HIPS[s];
      const f = side * hx * i;
      const g = hy * o;
      const d =
        (side > 0 ? 0 : Math.PI) +
        (s - 1.5) * 0.18 * side +
        ((s + (1 & frame)) % 2 === 0 ? Math.sin(phase) : Math.cos(phase)) * 0.12;
      const u = 0.2 * t;
      const kx = f + Math.cos(d) * u;
      const ky = g + Math.sin(d) * u;
      e.strokeStyle = p.leg;
      e.lineWidth = 0.05 * t;
      e.beginPath();
      e.moveTo(f, g);
      e.lineTo(kx, ky);
      e.stroke();
      const v = d + 0.35 * side;
      const seg = 0.16 * t;
      e.lineWidth = 0.032 * t;
      e.beginPath();
      e.moveTo(kx, ky);
      e.lineTo(kx + Math.cos(v) * seg, ky + Math.sin(v) * seg);
      e.stroke();
    }
  }

  e.fillStyle = p.body;
  e.beginPath();
  e.moveTo(0, 0.55 * o);
  e.quadraticCurveTo(0.5 * i, 0.5 * o, 0.78 * i, 0.15 * o);
  e.lineTo(+i, -(0.05 * o));
  e.quadraticCurveTo(0.92 * i, -(0.45 * o), 0.55 * i, -(0.6 * o));
  e.quadraticCurveTo(0.25 * i, -(0.72 * o), 0, -(0.55 * o));
  e.quadraticCurveTo(-(0.25 * i), -(0.72 * o), -(0.55 * i), -(0.6 * o));
  e.quadraticCurveTo(-(0.92 * i), -(0.45 * o), -i, -(0.05 * o));
  e.lineTo(-(0.78 * i), 0.15 * o);
  e.quadraticCurveTo(-(0.5 * i), 0.5 * o, 0, 0.55 * o);
  e.closePath();
  e.fill();
  e.fillStyle = p.dark;
  e.globalAlpha = 0.22;
  e.beginPath();
  e.ellipse(0, 0.15 * o, 0.7 * i, 0.4 * o, 0, 0, Math.PI);
  e.fill();
  e.globalAlpha = 1;
  e.fillStyle = p.hi;
  e.globalAlpha = 0.14;
  e.beginPath();
  e.ellipse(0, -(0.18 * o), 0.35 * i, 0.22 * o, 0, Math.PI, 2 * Math.PI);
  e.fill();
  e.globalAlpha = 1;
  e.strokeStyle = p.dark;
  e.lineWidth = 0.012 * t;
  e.globalAlpha = 0.2;
  e.beginPath();
  e.moveTo(0, -(0.3 * o));
  e.lineTo(0, 0.4 * o);
  e.stroke();
  e.beginPath();
  e.moveTo(0.25 * i, -(0.25 * o));
  e.quadraticCurveTo(0.12 * i, 0.05 * o, 0.18 * i, 0.3 * o);
  e.stroke();
  e.beginPath();
  e.moveTo(-(0.25 * i), -(0.25 * o));
  e.quadraticCurveTo(-(0.12 * i), 0.05 * o, -(0.18 * i), 0.3 * o);
  e.stroke();
  e.globalAlpha = 1;

  const wave = 0.07 * Math.sin(phase);
  for (const side of [-1, 1]) {
    const scale = side === 1 ? 1.25 : 0.85;
    e.save();
    e.translate(side * i * 0.55, -(0.5 * o));
    e.rotate(side * (-0.5 + wave));
    e.fillStyle = p.claw;
    const cw = 0.05 * t * scale;
    const ch = 0.15 * t * scale;
    e.beginPath();
    e.ellipse(0, -(0.5 * ch), cw, 0.5 * ch, 0, 0, 2 * Math.PI);
    e.fill();
    const tip = -ch;
    e.fillStyle = p.claw;
    e.beginPath();
    e.moveTo(-cw, tip + cw);
    e.quadraticCurveTo(-(0.07 * t) * scale, tip - 0.07 * t * scale, 0, tip - 0.05 * t * scale);
    e.lineTo(0, tip + cw);
    e.closePath();
    e.fill();
    e.beginPath();
    e.moveTo(cw, tip + cw);
    e.quadraticCurveTo(0.07 * t * scale, tip - 0.07 * t * scale, 0, tip - 0.05 * t * scale);
    e.lineTo(0, tip + cw);
    e.closePath();
    e.fill();
    e.strokeStyle = p.dark;
    e.lineWidth = 0.008 * t;
    e.beginPath();
    e.moveTo(0, tip + 0.5 * cw);
    e.lineTo(0, tip - 0.035 * t * scale);
    e.stroke();
    e.restore();
  }
  for (const side of [-1, 1]) {
    const ex = side * i * 0.28;
    e.strokeStyle = p.body;
    e.lineWidth = 0.028 * t;
    e.beginPath();
    e.moveTo(ex, -(0.2 * o));
    e.lineTo(ex, -o - 0.04 * t);
    e.stroke();
    e.fillStyle = p.eye;
    e.beginPath();
    e.arc(ex, -o - 0.04 * t, 0.035 * t, 0, 2 * Math.PI);
    e.fill();
    e.fillStyle = "rgba(255,255,255,0.35)";
    e.beginPath();
    e.arc(ex + 0.008 * t, -o - 0.05 * t, 0.012 * t, 0, 2 * Math.PI);
    e.fill();
  }
}

/** Pre-rendered crab poses keyed by size bucket, walk frame and palette. */
const spriteCache = new Map<string, Scratch>();

function drawCrabSprite(ctx: Ctx2D, size: number, frame: number, colorIdx: number) {
  const bucket = ((size / 4) | 0) * 4 || 4;
  const key = `${colorIdx}_${frame}_${bucket}`;
  const dim = Math.ceil(1.3 * bucket * 2);
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = createScratch(dim, dim);
    sprite.ctx.translate(dim / 2, dim / 2);
    paintCrab(sprite.ctx, bucket, frame, colorIdx);
    spriteCache.set(key, sprite);
  }
  ctx.drawImage(sprite.canvas, -dim / 2, -dim / 2);
}

export function drawDust(ctx: Ctx2D, dust: Dust[]) {
  if (dust.length === 0) return;
  ctx.save();
  ctx.fillStyle = "rgb(200,185,150)";
  for (const d of dust) {
    const t = d.life / d.maxLife;
    ctx.globalAlpha = (t < 0.3 ? t / 0.3 : t) * 0.65;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * (1 + (1 - t) * 0.5), 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawCrabs(ctx: Ctx2D, crabs: Crab[]) {
  for (const c of crabs) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.vx >= 0 ? 1 : -1, 1);
    if (c.state === "washing") {
      ctx.rotate(0.14 * Math.sin(c.spin));
      ctx.globalAlpha = Math.max(0, c.stateTimer > 1 ? 0.7 : 0.7 * c.stateTimer);
    } else {
      ctx.rotate(0.4 * c.tilt);
      ctx.globalAlpha = 0.9;
    }
    ctx.fillStyle = "rgba(80,50,20,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 0.18 * c.size, 0.4 * c.size, 0.12 * c.size, 0, 0, 2 * Math.PI);
    ctx.fill();
    drawCrabSprite(ctx, c.size, c.frame | 0, c.colorIdx);
    ctx.restore();
  }
}
