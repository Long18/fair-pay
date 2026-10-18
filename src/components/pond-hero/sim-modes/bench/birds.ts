import { sfx } from "../../audio/sfx";
import type { Crumb } from "./ducks";
import { pondField, type Park } from "./layout";
import { angleDelta, dprCap, rand, TAU } from "./math";
import { project, pt, shadowOf } from "./projection";
import { cachedSprite } from "./sprites";

export type Pigeon = {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** 0 idle, 1 walking, 2 pecking, 3 flying. */
  mode: number;
  t: number;
  tx: number;
  ty: number;
  gait: number;
  pecks: number;
  peckT: number;
  tone: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  ex: number;
  ey: number;
  f: number;
  dur: number;
  peak: number;
  delay: number;
};

export type FlockBird = {
  u: number;
  v: number;
  wu: number;
  wv: number;
  wph: number;
  wrate: number;
  alt: number;
  ph: number;
  rate: number;
  glide: number;
  yaw: number;
};

export type Flock = {
  birds: FlockBird[];
  t: number;
  x: number;
  y: number;
  dir: number;
  turn: number;
  speed: number;
  time: number;
};

export type Birds = { pigeons: Pigeon[]; flock: Flock };

type Spot = { x: number; y: number };

function onGround(park: Park, x: number, y: number) {
  return x > park.m && y > park.m && x < park.w - park.m && y < park.h - park.m && pondField(park.pond, x, y) < -0.06;
}

function groundSpot(park: Park, x: number, y: number, r: number): Spot {
  for (let i = 0; i < 16; i++) {
    const a = rand(0, 6.28);
    const d = Math.sqrt(Math.random()) * r;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    if (onGround(park, px, py)) return { x: px, y: py };
  }
  return { x: park.plaza.x + rand(-1, 1) * park.m, y: park.plaza.y + rand(-1, 1) * park.m };
}

/** Every pigeon within `r` of (x, y) takes off together and lands as a group. */
export function scatterPigeons(pigeons: Pigeon[], park: Park, x: number, y: number, r: number) {
  const m = park.m;
  const group = pigeons.filter((p) => p.mode !== 3 && Math.hypot(p.x - x, p.y - y) < r);
  if (!group.length) return;
  let gx = 0;
  let gy = 0;
  for (const p of group) {
    gx += p.x;
    gy += p.y;
  }
  gx /= group.length;
  gy /= group.length;
  const away = Math.atan2(gy - y, gx - x) + rand(-0.6, 0.6);
  const dist = m * rand(5, 9);
  let land: Spot = { x: gx + Math.cos(away) * dist, y: gy + Math.sin(away) * dist };
  if (!onGround(park, land.x, land.y)) land = groundSpot(park, park.plaza.x, park.plaza.y, 2.5 * park.plaza.r);
  const bend = rand(-1, 1) * dist * 0.4;
  for (const p of group) {
    const end = groundSpot(park, land.x, land.y, 1.2 * m);
    const mx = (p.x + end.x) / 2;
    const my = (p.y + end.y) / 2;
    const len = Math.hypot(end.x - p.x, end.y - p.y) || 1;
    Object.assign(p, {
      mode: 3,
      sx: p.x,
      sy: p.y,
      ex: end.x,
      ey: end.y,
      cx: mx - ((end.y - p.y) / len) * bend,
      cy: my + ((end.x - p.x) / len) * bend,
      f: 0,
      dur: Math.max(1.8, len / (4.5 * m)),
      peak: rand(1.6, 2.6),
      delay: Math.hypot(p.x - x, p.y - y) / (6 * m) + rand(0, 0.25),
    });
  }
  sfx.rustle(x / park.w, Math.min(1, 0.4 + 0.08 * group.length));
}

function wingSpread(p: Pigeon) {
  if (p.mode !== 3 || p.delay > 0) return 0;
  return p.f < 0.3 || p.f > 0.82 ? 0.35 + 0.65 * Math.abs(Math.sin(26 * p.gait)) : 0.92 + 0.05 * Math.sin(3 * p.gait);
}

export function createBirds(park: Park): Birds {
  const pigeons: Pigeon[] = [];
  for (let i = 0; i < 9; i++) {
    const s = groundSpot(park, park.plaza.x, park.plaza.y, 1.4 * park.plaza.r);
    pigeons.push({
      x: s.x,
      y: s.y,
      z: 0,
      heading: rand(0, 6.28),
      mode: 0,
      t: rand(0, 2),
      tx: s.x,
      ty: s.y,
      gait: rand(0, 6),
      pecks: 0,
      peckT: 0,
      tone: i % 5,
      sx: 0,
      sy: 0,
      cx: 0,
      cy: 0,
      ex: 0,
      ey: 0,
      f: 0,
      dur: 1,
      peak: 2,
      delay: 0,
    });
  }
  return { pigeons, flock: { birds: [], t: rand(8, 20), x: 0, y: 0, dir: 0, turn: 0, speed: 0, time: 0 } };
}

function updatePigeons(pigeons: Pigeon[], park: Park, dt: number, walkers: Spot[], crumbs: Crumb[]) {
  const m = park.m;
  let ax = 0;
  let ay = 0;
  let n = 0;
  for (const p of pigeons) {
    if (p.mode === 3) continue;
    ax += p.x;
    ay += p.y;
    n++;
  }
  if (n) {
    ax /= n;
    ay /= n;
  }
  for (const p of pigeons) {
    if (p.mode === 3) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.f = Math.min(1, p.f + dt / p.dur);
      const e = p.f < 0.5 ? 2 * p.f * p.f * (1.4 - 0.8 * p.f) : 1 - 2 * (1 - p.f) ** 2 * (1.4 - 0.8 * (1 - p.f));
      const u = 1 - e;
      const x = u * u * p.sx + 2 * u * e * p.cx + e * e * p.ex;
      const y = u * u * p.sy + 2 * u * e * p.cy + e * e * p.ey;
      if (Math.hypot(x - p.x, y - p.y) > 0.01) p.heading = Math.atan2(y - p.y, x - p.x);
      p.x = x;
      p.y = y;
      p.z = p.peak * Math.sin(Math.PI * Math.min(1, 1.15 * p.f)) ** 0.7;
      p.gait += dt;
      if (p.f >= 1) {
        p.mode = 0;
        p.z = 0;
        p.t = rand(0.6, 1.4);
      }
      continue;
    }
    let near: Spot | null = null;
    let nearD = Infinity;
    for (const w of walkers) {
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d < nearD) {
        nearD = d;
        near = w;
      }
    }
    if (near && nearD < 0.55 * m) {
      scatterPigeons(pigeons, park, near.x, near.y, 2 * m);
      continue;
    }
    if (near && nearD < 1.6 * m && p.mode !== 1) {
      const a = Math.atan2(p.y - near.y, p.x - near.x) + rand(-0.5, 0.5);
      const step = { x: p.x + Math.cos(a) * m * 1.2, y: p.y + Math.sin(a) * m * 1.2 };
      if (onGround(park, step.x, step.y)) {
        p.tx = step.x;
        p.ty = step.y;
        p.mode = 1;
        p.t = 3;
      }
    }
    let crumb: Crumb | null = null;
    let crumbD = 7 * m;
    for (const c of crumbs) {
      if (!c.alive || c.water || c.z > 0) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < crumbD) {
        crumbD = d;
        crumb = c;
      }
    }
    p.t -= dt;
    if (crumb) {
      const bx = p.x + Math.cos(p.heading) * m * 0.2;
      const by = p.y + Math.sin(p.heading) * m * 0.2;
      if (Math.hypot(crumb.x - bx, crumb.y - by) < 0.12 * m) {
        crumb.alive = false;
        p.mode = 2;
        p.pecks = 2;
        p.peckT = 0;
      } else if (p.mode !== 2) {
        p.mode = 1;
        p.tx = crumb.x;
        p.ty = crumb.y;
        p.t = 2;
      }
    } else if (p.mode === 0 && p.t <= 0) {
      if (Math.random() < 0.55) {
        p.mode = 2;
        p.pecks = 2 + ((4 * Math.random()) | 0);
        p.peckT = 0;
      } else {
        const s = groundSpot(park, p.x + (ax - p.x) * 0.25, p.y + (ay - p.y) * 0.25, 1.4 * m);
        p.tx = s.x;
        p.ty = s.y;
        p.mode = 1;
        p.t = 6;
      }
    }
    if (p.mode === 2) {
      p.peckT += dt;
      if (p.peckT > 0.32) {
        p.peckT = 0;
        if (--p.pecks <= 0) {
          p.mode = 0;
          p.t = rand(1.5, 4);
        }
      }
    } else if (p.mode === 1) {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.08 * m || p.t <= 0) {
        p.mode = 0;
        p.t = rand(1.2, 3.5);
        continue;
      }
      p.heading += angleDelta(p.heading, Math.atan2(dy, dx)) * Math.min(1, 5 * dt);
      const pace = crumb || (near && nearD < 1.6 * m) ? 0.75 : 0.32;
      p.gait += 2.6 * dt * (pace / 0.32) * Math.PI * 2;
      const step = Math.min(d, pace * (0.35 + 1.3 * Math.max(0, Math.sin(p.gait)) ** 2) * m * dt);
      let sepX = 0;
      let sepY = 0;
      for (const o of pigeons) {
        if (o === p || o.mode === 3) continue;
        const ox = p.x - o.x;
        const oy = p.y - o.y;
        const od = Math.hypot(ox, oy);
        if (od > 0 && od < 0.3 * m) {
          sepX += ox / od;
          sepY += oy / od;
        }
      }
      p.x += Math.cos(p.heading) * step + sepX * m * 0.2 * dt;
      p.y += Math.sin(p.heading) * step + sepY * m * 0.2 * dt;
    }
  }
}

function makeFlock(count: number): FlockBird[] {
  const shape = Math.random();
  const out: FlockBird[] = [];
  const bird = (u: number, v: number): FlockBird => ({
    u,
    v,
    wu: rand(0.3, 1.2),
    wv: rand(0.3, 1),
    wph: rand(0, 6.28),
    wrate: rand(0.15, 0.4),
    alt: rand(11, 16),
    ph: rand(0, 6.28),
    rate: rand(5.2, 6.8),
    glide: rand(0, 6),
    yaw: rand(-0.08, 0.08),
  });
  if (shape < 0.5) {
    const left = rand(0.45, 0.7);
    const right = rand(0.45, 0.7);
    const split = Math.ceil((count - 1) * rand(0.35, 0.65));
    out.push(bird(0, 0));
    for (let i = 1; i < count; i++) {
      const side = i <= split ? -1 : 1;
      const rank = side < 0 ? i : i - split;
      const back = rand(1.6, 2.6) * rank;
      const a = side < 0 ? left : right;
      out.push(bird(-back * Math.cos(a), side * back * Math.sin(a)));
    }
  } else if (shape < 0.8) {
    const a = rand(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1);
    let d = 0;
    for (let i = 0; i < count; i++) {
      out.push(bird(-d * Math.cos(a), d * Math.sin(a)));
      d += rand(1.2, 3);
    }
  } else {
    for (let i = 0; i < count; i++) out.push(bird(rand(-5, 1), rand(-3, 3)));
  }
  if (Math.random() < 0.7) {
    const straggler = out[out.length - 1];
    straggler.u -= rand(2, 5);
    straggler.v += rand(-1.5, 1.5);
  }
  return out;
}

export function updateBirds(birds: Birds, park: Park, dt: number, walkers: Spot[], crumbs: Crumb[]) {
  updatePigeons(birds.pigeons, park, dt, walkers, crumbs);
  const f = birds.flock;
  const m = park.m;
  f.t -= dt;
  if (f.t <= 0 && !f.birds.length) {
    f.dir = rand(-0.55, 0.35);
    f.turn = rand(-0.04, 0.04);
    f.speed = rand(6, 8.5) * m;
    f.x = -(0.35 * park.w);
    f.y = park.h * rand(0.15, 0.95);
    f.time = 0;
    f.birds = makeFlock(4 + ((6 * Math.random()) | 0));
  }
  if (!f.birds.length) return;
  f.time += dt;
  f.dir += f.turn * dt;
  f.x += Math.cos(f.dir) * f.speed * dt;
  f.y += Math.sin(f.dir) * f.speed * dt;
  for (const b of f.birds) {
    b.glide += dt;
    b.ph += dt * b.rate * (Math.sin(0.45 * b.glide) > 0.55 ? 0.15 : 1);
  }
  if (f.x > 1.7 * park.w || f.y < -park.h || f.y > 2 * park.h) {
    f.birds.length = 0;
    f.t = rand(35, 70);
  }
}

function flockBirdAt(f: Flock, b: FlockBird, m: number) {
  const u = b.u + Math.sin(f.time * b.wrate + b.wph) * b.wu;
  const v = b.v + Math.cos(f.time * b.wrate * 1.3 + b.wph) * b.wv;
  const c = Math.cos(f.dir);
  const s = Math.sin(f.dir);
  return {
    x: f.x + (u * c - v * s) * m,
    y: f.y + (u * s + v * c) * m,
    a: f.dir + b.yaw + 0.05 * Math.sin(0.7 * f.time + b.wph),
  };
}

/** A gull-ish silhouette from above, wings flapping or held in a glide. */
function paintFlyer(ctx: CanvasRenderingContext2D, t: number, b: FlockBird, detail: boolean) {
  const gliding = Math.sin(0.45 * b.glide) > 0.55;
  const span = gliding ? 0.97 : 0.55 + 0.45 * Math.abs(Math.cos(b.ph));
  const sweep = gliding ? 0.02 : 0.12 * Math.sin(b.ph);
  for (const side of [-1, 1]) {
    const w = (v: number) => v * side * t;
    ctx.beginPath();
    ctx.moveTo(0.1 * t, w(0.05));
    ctx.quadraticCurveTo(0.2 * t, w(0.3 * span), (0.1 + sweep) * t, w(0.52 * span));
    ctx.quadraticCurveTo((-0.05 + sweep) * t, w(0.8 * span), (-0.22 + sweep) * t, w(+span));
    ctx.quadraticCurveTo((-0.16 + sweep) * t, w(0.6 * span), -0.21 * t, w(0.42 * span));
    ctx.quadraticCurveTo(-0.17 * t, w(0.2), -0.12 * t, w(0.05));
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.3 * t, 0.075 * t, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.3 * t, 0, 0.065 * t, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-(0.25 * t), -(0.05 * t));
  ctx.lineTo(-(0.42 * t), -(0.1 * t));
  ctx.lineTo(-(0.42 * t), 0.1 * t);
  ctx.lineTo(-(0.25 * t), 0.05 * t);
  ctx.fill();
  if (!detail) return;
  ctx.fillStyle = "rgba(150, 160, 175, 0.5)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse((-0.18 + sweep) * t, 0.92 * side * span * t, 0.07 * t, 0.03 * t, 0.4 * side, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#e88a4a";
  ctx.beginPath();
  ctx.arc(0.37 * t, 0, 0.025 * t, 0, TAU);
  ctx.fill();
}

const BP = pt();

export function drawBirdShadows(ctx: CanvasRenderingContext2D, birds: Birds, m: number) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (const p of birds.pigeons) {
    shadowOf(p.x, p.y, (0.2 + p.z) * m, BP);
    const spread = wingSpread(p);
    ctx.beginPath();
    ctx.ellipse(BP.x, BP.y, 0.17 * m, m * (0.08 + 0.28 * spread), p.heading, 0, TAU);
    ctx.fill();
  }
  const f = birds.flock;
  for (const b of f.birds) {
    const at = flockBirdAt(f, b, m);
    shadowOf(at.x, at.y, b.alt * m, BP);
    const blur = b.alt * m * 0.006;
    for (const [dx, dy, a] of [
      [0, 0, 0.22],
      [blur, 0.4 * blur, 0.12],
      [-blur, -(0.4 * blur), 0.12],
    ]) {
      ctx.save();
      ctx.translate(BP.x + dx, BP.y + dy);
      ctx.rotate(at.a);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      paintFlyer(ctx, 0.55 * m, b, false);
      ctx.restore();
    }
  }
}

const PIGEON_WINGS = ["#9ea4b4", "#8a8f9e", "#b8bcc6", "#7c7470", "#d8d6d2"];
const PIGEON_BODY = ["#a3abbd", "#8e95a7", "#b9bfca", "#7f7672", "#dad8d3"];

function paintPigeon(ctx: CanvasRenderingContext2D, t: number, tone: number) {
  const body = PIGEON_BODY[tone % 5];
  ctx.fillStyle = "#4e5462";
  ctx.beginPath();
  ctx.moveTo(-0.28 * t, 0);
  ctx.lineTo(-0.52 * t, -0.11 * t);
  ctx.lineTo(-0.52 * t, 0.11 * t);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-0.42 * t, -0.08 * t);
  ctx.lineTo(-0.5 * t, -0.1 * t);
  ctx.lineTo(-0.5 * t, 0.1 * t);
  ctx.lineTo(-0.42 * t, 0.08 * t);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.38 * t, 0);
  ctx.bezierCurveTo(-0.3 * t, -0.22 * t, 0.12 * t, -0.22 * t, 0.2 * t, 0);
  ctx.bezierCurveTo(0.12 * t, 0.22 * t, -0.3 * t, 0.22 * t, -0.38 * t, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 44, 56, 0.75)";
  ctx.lineWidth = 0.03 * t;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (const u of [-0.08, -0.18]) {
      ctx.beginPath();
      ctx.moveTo(u * t, 0.07 * side * t);
      ctx.lineTo((u - 0.05) * t, 0.16 * side * t);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#5b7f6c";
  ctx.beginPath();
  ctx.ellipse(0.17 * t, 0, 0.08 * t, 0.1 * t, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(150, 90, 160, 0.6)";
  ctx.beginPath();
  ctx.ellipse(0.15 * t, 0.04 * t, 0.05 * t, 0.04 * t, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#666d80";
  ctx.beginPath();
  ctx.arc(0.27 * t, 0, 0.075 * t, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0.33 * t, -0.012 * t, 0.06 * t, 0.024 * t);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-0.04 * t, 0.03 * t, 0.15 * t, 0.04 * t, 0, 0, TAU);
  ctx.fill();
}

export function drawPigeons(ctx: CanvasRenderingContext2D, birds: Birds, m: number) {
  const size = 0.7 * m;
  for (const p of birds.pigeons) {
    project(p.x, p.y, (0.15 + p.z) * m, BP);
    const c = Math.cos(p.heading);
    const s = Math.sin(p.heading);
    const k = BP.k;
    const spread = wingSpread(p);
    if (spread > 0) {
      const span = 0.62 * size * spread * k;
      ctx.fillStyle = PIGEON_WINGS[p.tone];
      for (const side of [-1, 1]) {
        const wx = BP.x - s * side * span * 0.5 - c * size * 0.06 * k;
        const wy = BP.y + c * side * span * 0.5 - s * size * 0.06 * k;
        ctx.beginPath();
        ctx.ellipse(wx, wy, 0.55 * span, 0.17 * size * k, p.heading + side * (Math.PI / 2 - 0.25), 0, TAU);
        ctx.fill();
      }
    }
    const nod =
      p.mode === 2 ? 0.09 * Math.sin(Math.min(1, p.peckT / 0.32) * Math.PI) : p.mode === 1 ? 0.045 * Math.cos(p.gait) : 0;
    const px = BP.x + c * nod * size;
    const py = BP.y + s * nod * size;
    const len = size * k;
    const sprite = cachedSprite(`p${p.tone}:${Math.round(len)}`, Math.ceil(1.2 * len), dprCap(), (cx, n) =>
      paintPigeon(cx, n / 1.2, p.tone),
    );
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p.heading);
    ctx.drawImage(sprite.cv, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
    ctx.restore();
  }
}

/** The passing flock, drawn on the foreground layer above the crowns. */
export function drawFlock(ctx: CanvasRenderingContext2D, birds: Birds, m: number, camX: number, camY: number) {
  const f = birds.flock;
  for (const b of f.birds) {
    const at = flockBirdAt(f, b, m);
    project(at.x, at.y, b.alt * m, BP);
    ctx.save();
    ctx.translate(BP.x - camX, BP.y - camY);
    ctx.rotate(at.a);
    ctx.fillStyle = "rgba(255, 255, 252, 0.96)";
    paintFlyer(ctx, 0.55 * m * BP.k, b, true);
    ctx.restore();
  }
}
