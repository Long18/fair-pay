import { sfx } from "../../audio/sfx";
import { spawnRipple, spawnSparkle, type Fx } from "./fx";
import { pondField, type Park } from "./layout";
import { angleDelta, dprCap, rand, TAU } from "./math";
import { cachedSprite } from "./sprites";

export enum DuckKind {
  White = 0,
  Drake = 1,
  Hen = 2,
}

export type Crumb = { x: number; y: number; z: number; vx: number; vy: number; vz: number; water: boolean; alive: boolean; age: number };

export type Duck = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  tx: number;
  ty: number;
  /** 0 paddling to a spot, 1 resting, 2 dabbling (tail up). */
  state: number;
  t: number;
  kind: DuckKind;
  bob: number;
  dip: number;
  wakeT: number;
  target: Crumb | null;
};

const PLUMAGE: Record<DuckKind, { body: string; back: string; wing: string; head: string; bill: string; tail: string }> = {
  [DuckKind.White]: { body: "#fbf8f1", back: "#ece5d6", wing: "#ddd4c2", head: "#fffdf8", bill: "#f2a43a", tail: "#e9e1d0" },
  [DuckKind.Drake]: { body: "#d9d4ca", back: "#9b9083", wing: "#8a7e70", head: "#1f6a45", bill: "#e3c64a", tail: "#2a2a2c" },
  [DuckKind.Hen]: { body: "#a9875f", back: "#8a6a47", wing: "#7a5c3c", head: "#9c7c58", bill: "#d08a40", tail: "#6e5236" },
};

function wanderTarget(d: Duck, park: Park) {
  for (let i = 0; i < 20; i++) {
    const x = park.pond.cx + rand(-1, 1) * park.pond.rx * 0.85;
    const y = park.pond.cy + rand(-1, 1) * park.pond.ry * 0.85;
    if (pondField(park.pond, x, y) > 0.18) {
      d.tx = x;
      d.ty = y;
      return;
    }
  }
}

export function createDucks(park: Park): Duck[] {
  const ducks: Duck[] = [];
  for (let i = 0; i < 6; i++) {
    const d: Duck = {
      x: 0,
      y: 0,
      heading: rand(0, 6.3),
      speed: 0,
      tx: 0,
      ty: 0,
      state: 1,
      t: rand(0, 4),
      kind: i === 2 ? DuckKind.Drake : i === 4 ? DuckKind.Hen : DuckKind.White,
      bob: rand(0, 6),
      dip: 0,
      wakeT: 0,
      target: null,
    };
    wanderTarget(d, park);
    d.x = d.tx;
    d.y = d.ty;
    wanderTarget(d, park);
    ducks.push(d);
  }
  return ducks;
}

export function updateDucks(fx: Fx, ducks: Duck[], crumbs: Crumb[], park: Park, dt: number, boat: { x: number; y: number }) {
  const m = park.m;
  for (const d of ducks) {
    d.t -= dt;
    d.bob += dt;
    if (!d.target || !d.target.alive) {
      d.target = null;
      let best = 1.2 * park.pond.rx;
      for (const c of crumbs) {
        if (!c.alive || !c.water || c.z > 0) continue;
        let taken = false;
        for (const o of ducks) if (o !== d && o.target === c) taken = true;
        const dist = Math.hypot(c.x - d.x, c.y - d.y) * (taken ? 2.5 : 1);
        if (dist < best) {
          best = dist;
          d.target = c;
        }
      }
      if (d.target && d.state === 2) d.state = 0;
    }
    let want = 0;
    if (d.target) {
      d.tx = d.target.x;
      d.ty = d.target.y;
      const bx = d.x + Math.cos(d.heading) * m * 0.55;
      const by = d.y + Math.sin(d.heading) * m * 0.55;
      const toBill = Math.hypot(d.tx - bx, d.ty - by);
      const toBody = Math.hypot(d.tx - d.x, d.ty - d.y);
      want = Math.min(0.75, 0.12 + (toBody / m) * 0.35);
      if (toBill < 0.3 * m || toBody < 0.45 * m) {
        d.target.alive = false;
        d.target = null;
        spawnRipple(fx, bx, by, 0.5 * m, 0.4, 1.2);
        sfx.nibble(d.x / park.w);
        d.state = 1;
        d.t = rand(0.6, 1.5);
      }
    } else if (d.state === 0) {
      want = 0.32;
      if (Math.hypot(d.tx - d.x, d.ty - d.y) < 0.6 * m || d.t <= 0) {
        d.state = 1;
        d.t = rand(2, 7);
      }
    } else if (d.state === 1) {
      if (d.t <= 0) {
        if (Math.random() < 0.25) {
          d.state = 2;
          d.t = rand(2, 4);
          spawnRipple(fx, d.x, d.y, 0.8 * m, 0.45, 1.6);
        } else {
          d.state = 0;
          d.t = rand(6, 14);
          wanderTarget(d, park);
        }
      }
    } else if (d.t <= 0) {
      d.state = 1;
      d.t = rand(1, 3);
      spawnRipple(fx, d.x, d.y, 0.6 * m, 0.35, 1.4);
    }
    d.dip += (+(d.state === 2) - d.dip) * (1 - Math.exp(-dt / 0.32));

    const toTarget = Math.atan2(d.ty - d.y, d.tx - d.x);
    for (const o of ducks) {
      if (o === d) continue;
      const dx = d.x - o.x;
      const dy = d.y - o.y;
      const dist = Math.hypot(dx, dy);
      const reach = 1.1 * m;
      if (dist < reach && dist > 0) {
        const push = (1 - dist / reach) * m * 0.5 * dt;
        d.x += (dx / dist) * push;
        d.y += (dy / dist) * push;
      }
    }
    let aim = toTarget;
    const awayX = d.x - boat.x;
    const awayY = d.y - boat.y;
    const fromBoat = Math.hypot(awayX, awayY);
    if (fromBoat < 3.2 * m) {
      aim = Math.atan2(awayY, awayX);
      want = Math.max(want, 0.5);
      d.x += (awayX / fromBoat) * m * 0.6 * dt;
      d.y += (awayY / fromBoat) * m * 0.6 * dt;
    }
    if (pondField(park.pond, d.x + Math.cos(d.heading) * m, d.y + Math.sin(d.heading) * m) < 0.1) {
      aim = Math.atan2(park.pond.cy - d.y, park.pond.cx - d.x);
    }
    if (want > 0) {
      const turn = Math.max(-1.4, Math.min(1.4, 2 * angleDelta(d.heading, aim))) * dt;
      d.heading += turn * Math.min(1, 0.4 + d.speed);
    }
    d.speed += (want - d.speed) * Math.min(1, dt * (want > d.speed ? 1.2 : 0.8));
    d.x += Math.cos(d.heading) * d.speed * m * dt;
    d.y += Math.sin(d.heading) * d.speed * m * dt;
    d.wakeT -= dt;
    if (d.speed > 0.12 && d.wakeT <= 0) {
      d.wakeT = 0.45;
      const wx = d.x - Math.cos(d.heading) * m * 0.25;
      const wy = d.y - Math.sin(d.heading) * m * 0.25;
      spawnRipple(fx, wx, wy, 0.55 * m, 0.2, 1.6);
      if (Math.random() < 0.5) spawnSparkle(fx, wx + rand(-0.3, 0.3) * m, wy + rand(-0.3, 0.3) * m, m, 1);
    }
  }
}

function paintDuck(ctx: CanvasRenderingContext2D, t: number, kind: DuckKind) {
  const p = PLUMAGE[kind];
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(-0.5 * t, 0);
  ctx.bezierCurveTo(-0.44 * t, -0.2 * t, 0.12 * t, -0.22 * t, 0.24 * t, -0.08 * t);
  ctx.lineTo(0.24 * t, 0.08 * t);
  ctx.bezierCurveTo(0.12 * t, 0.22 * t, -0.44 * t, 0.2 * t, -0.5 * t, 0);
  ctx.fill();
  ctx.fillStyle = p.wing;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0.12 * t, 0.13 * side * t);
    ctx.quadraticCurveTo(-0.15 * t, 0.19 * side * t, -0.42 * t, 0.03 * side * t);
    ctx.quadraticCurveTo(-0.15 * t, 0.05 * side * t, 0.12 * t, 0.13 * side * t);
    ctx.fill();
  }
  ctx.fillStyle = p.back;
  ctx.beginPath();
  ctx.ellipse(-0.08 * t, 0, 0.26 * t, 0.06 * t, 0, 0, TAU);
  ctx.fill();
  if (kind === DuckKind.Drake) {
    ctx.fillStyle = "#3a5cb0";
    for (const side of [-1, 1]) ctx.fillRect(-0.18 * t, 0.155 * side * t - 0.015 * t, 0.12 * t, 0.03 * t);
    ctx.fillStyle = "#7a4630";
    ctx.beginPath();
    ctx.ellipse(0.17 * t, 0, 0.08 * t, 0.13 * t, 0, 0, TAU);
    ctx.fill();
  }
  if (kind === DuckKind.Hen) {
    ctx.fillStyle = "rgba(60, 38, 20, 0.5)";
    for (let i = 0; i < 18; i++) {
      const u = -0.4 + (i % 6) * 0.11;
      const v = (((7 * i) % 5) - 2) * 0.05;
      ctx.beginPath();
      ctx.ellipse(u * t, v * t, 0.025 * t, 0.012 * t, 0.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = p.tail;
  ctx.beginPath();
  ctx.moveTo(-0.46 * t, -0.05 * t);
  ctx.lineTo(-0.58 * t, 0);
  ctx.lineTo(-0.46 * t, 0.05 * t);
  ctx.fill();
  if (kind === DuckKind.Drake) {
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.arc(0.27 * t, 0, 0.1 * t, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = p.head;
  ctx.beginPath();
  ctx.ellipse(0.33 * t, 0, 0.11 * t, 0.095 * t, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = p.bill;
  ctx.beginPath();
  ctx.roundRect(0.41 * t, -0.042 * t, 0.15 * t, 0.084 * t, 0.04 * t);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0.47 * t, -0.012 * t, 0.02 * t, 0.024 * t);
  ctx.fillStyle = "#141414";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(0.36 * t, 0.075 * side * t, 0.016 * t, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = kind === DuckKind.Drake ? "rgba(150, 230, 170, 0.45)" : "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0.31 * t, 0.02 * t, 0.05 * t, 0.035 * t, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.ellipse(-0.05 * t, 0.04 * t, 0.22 * t, 0.05 * t, 0, 0, TAU);
  ctx.fill();
}

function drawDuckSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  kind: DuckKind,
  stretch = 1,
) {
  const s = cachedSprite(`d${kind}:${Math.round(size)}`, Math.ceil(1.3 * size), dprCap(), (c, n) => paintDuck(c, n / 1.3, kind));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (stretch !== 1) ctx.scale(stretch, 1);
  ctx.drawImage(s.cv, -s.size / 2, -s.size / 2, s.size, s.size);
  ctx.restore();
}

export function drawDucks(ctx: CanvasRenderingContext2D, ducks: Duck[], m: number) {
  const size = 1.35 * m;
  for (const d of ducks) {
    const bob = 0.05 * Math.sin(1.3 * d.bob);
    const dip = d.dip * d.dip * (3 - 2 * d.dip);
    const stretch = 1 - 0.55 * dip;
    const x = d.x - Math.cos(d.heading) * size * 0.22 * dip;
    const y = d.y - Math.sin(d.heading) * size * 0.22 * dip;
    ctx.fillStyle = "rgba(10, 40, 50, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, 0.56 * size * stretch, 0.24 * size, d.heading, 0, TAU);
    ctx.fill();
    drawDuckSprite(ctx, x, y, d.heading + bob, size, d.kind, stretch);
  }
}
