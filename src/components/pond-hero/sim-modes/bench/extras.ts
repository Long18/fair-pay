import { spawnRipple, type Fx } from "./fx";
import { pathDistance, pondField, pondSpot, type Park } from "./layout";
import { angleDelta, rand, seeded, TAU } from "./math";
import { drawFigure, drawFigureShadow, randomLook, type Look, type Pose } from "./people";
import { project, pt, shadowOf, type Projector } from "./projection";
import { drawDog, drawDogShadow } from "./walkers";

export type Sail = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  heading: number;
  ph: number;
  color: string;
  trim: string;
};

export type Fetch = {
  owner: Pose;
  look: Look;
  dx: number;
  dy: number;
  dh: number;
  ph: number;
  /** 0 waiting, 1 ball in flight, 2 dog chasing, 3 bringing it back. */
  state: number;
  t: number;
  bx: number;
  by: number;
  bz: number;
  vx: number;
  vy: number;
  vz: number;
};

export type Extras = {
  cart: { x: number; y: number; vendor: Pose; look: Look };
  fetch: Fetch;
  sails: Sail[];
};

export function createExtras(park: Park): Extras {
  const r = seeded(77);
  const m = park.m;
  const { plaza } = park;
  let cx = plaza.x;
  let cy = plaza.y + plaza.r + 2 * m;
  for (let a = 0.6; a < 6.9; a += 0.15) {
    const x = plaza.x + Math.cos(a) * (plaza.r + 3.6 * m);
    const y = plaza.y + Math.sin(a) * (plaza.r + 3.6 * m);
    if (pathDistance(park, x, y) > park.pathHW + 1.1 * m && pondField(park.pond, x, y) < -0.1) {
      cx = x;
      cy = y;
      break;
    }
  }
  const toPlaza = Math.atan2(plaza.y - cy, plaza.x - cx);
  const vendor: Pose = {
    x: cx + Math.cos(toPlaza) * m * 0.9,
    y: cy + Math.sin(toPlaza) * m * 0.9,
    heading: toPlaza,
    ph: 0,
    stride: 0,
    sitting: false,
    look: 0,
  };
  const ox = 0.14 * park.w;
  const oy = 0.8 * park.h;
  const sails: Sail[] = [];
  for (let i = 0; i < 2; i++) {
    const at = pondSpot(park, r);
    const to = pondSpot(park, r);
    sails.push({
      x: at.x,
      y: at.y,
      tx: to.x,
      ty: to.y,
      heading: rand(0, 6.28),
      ph: rand(0, 6),
      color: i ? "#e0604c" : "#f8f4ea",
      trim: i ? "#f4efe2" : "#2f5f8a",
    });
  }
  const cartLook = randomLook(r);
  const ownerLook = randomLook(r);
  return {
    cart: { x: cx, y: cy, vendor, look: cartLook },
    fetch: {
      owner: { x: ox, y: oy, heading: -0.2, ph: 0, stride: 0, sitting: false, look: 0, handR: null },
      look: ownerLook,
      dx: ox + m,
      dy: oy,
      dh: 0,
      ph: 0,
      state: 0,
      t: 2,
      bx: ox,
      by: oy,
      bz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    },
    sails,
  };
}

/** Dry land with a little margin from the water. */
function dryLand(park: Park, x: number, y: number) {
  const r = 0.6 * park.m;
  if (pondField(park.pond, x, y) >= 0) return false;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    if (pondField(park.pond, x + Math.cos(a) * r, y + Math.sin(a) * r) >= 0) return false;
  }
  return true;
}

export function updateExtras(fx: Fx, ex: Extras, park: Park, dt: number, boat: { x: number; y: number }) {
  const m = park.m;
  const f = ex.fetch;
  const owner = f.owner;
  f.t -= dt;
  if (f.state === 0) {
    owner.handR = f.t < 0.4 ? [-0.3, 0.3, 1.3] : null;
    if (f.t <= 0) {
      const a = rand(-0.9, 0.5);
      const v = m * rand(6, 9);
      f.bx = owner.x;
      f.by = owner.y;
      f.bz = 1.6;
      f.vx = Math.cos(a) * v;
      f.vy = Math.sin(a) * v;
      f.vz = 4.5;
      owner.handR = [0.4, 0.25, 1.5];
      owner.heading = a;
      f.state = 1;
    }
  } else if (f.state === 1 && f.bz <= 0 && Math.hypot(f.vx, f.vy) < 0.2 * m) f.state = 2;

  if (f.state >= 1 && f.state < 3) {
    f.vz -= 9.8 * dt;
    f.bz = Math.max(0, f.bz + f.vz * dt);
    if (f.bz === 0) {
      f.vz = Math.abs(f.vz) > 1 ? -(0.4 * f.vz) : 0;
      f.vx *= 1 - 2.5 * dt;
      f.vy *= 1 - 2.5 * dt;
    }
    const nx = f.bx + f.vx * dt;
    const ny = f.by + f.vy * dt;
    if (dryLand(park, nx, ny)) {
      f.bx = nx;
      f.by = ny;
    } else {
      f.vx = 0;
      f.vy = 0;
    }
  }
  const gx = f.state === 3 ? owner.x + Math.cos(owner.heading) * m * 0.6 : f.state >= 1 ? f.bx : owner.x + 0.8 * m;
  const gy = f.state === 3 ? owner.y + Math.sin(owner.heading) * m * 0.6 : f.state >= 1 ? f.by : owner.y;
  const dx = gx - f.dx;
  const dy = gy - f.dy;
  const d = Math.hypot(dx, dy);
  const run = f.state >= 1 ? 6 * m : 1.2 * m;
  if (d > 0.15 * m) {
    const step = Math.min(d, run * dt);
    const nx = f.dx + (dx / d) * step;
    const ny = f.dy + (dy / d) * step;
    if (dryLand(park, nx, ny)) {
      f.dx = nx;
      f.dy = ny;
    }
    f.dh += angleDelta(f.dh, Math.atan2(dy, dx)) * Math.min(1, 8 * dt);
    f.ph += dt * (f.state >= 1 ? 14 : 5);
  } else if (f.state === 2 && f.bz === 0) f.state = 3;
  else if (f.state === 3) {
    f.state = 0;
    f.t = rand(1.5, 3.5);
  }
  if (f.state === 3) {
    f.bx = f.dx + Math.cos(f.dh) * m * 0.4;
    f.by = f.dy + Math.sin(f.dh) * m * 0.4;
    f.bz = 0.45;
  }
  if (f.state === 0) owner.heading += angleDelta(owner.heading, Math.atan2(f.dy - owner.y, f.dx - owner.x)) * Math.min(1, 3 * dt);

  for (const s of ex.sails) {
    s.ph += dt;
    if (Math.hypot(s.tx - s.x, s.ty - s.y) < 1.5 * m) {
      const to = pondSpot(park, Math.random);
      s.tx = to.x;
      s.ty = to.y;
    }
    const aim = Math.atan2(s.ty - s.y, s.tx - s.x) + 0.4 * Math.sin(0.3 * s.ph);
    s.heading += angleDelta(s.heading, aim) * dt * 0.4;
    s.x += Math.cos(s.heading) * m * 0.35 * dt;
    s.y += Math.sin(s.heading) * m * 0.35 * dt;
    if (pondField(park.pond, s.x + Math.cos(s.heading) * m, s.y + Math.sin(s.heading) * m) < 0.12) s.heading += 2.6;
    const ax = s.x - boat.x;
    const ay = s.y - boat.y;
    const ad = Math.hypot(ax, ay);
    if (ad < 3 * m) {
      s.x += (ax / ad) * m * 0.8 * dt;
      s.y += (ay / ad) * m * 0.8 * dt;
      s.heading += angleDelta(s.heading, Math.atan2(ay, ax)) * dt;
    }
    if (Math.random() < 0.6 * dt) {
      spawnRipple(fx, s.x - Math.cos(s.heading) * m * 0.3, s.y - Math.sin(s.heading) * m * 0.3, 0.35 * m, 0.25, 1.2);
    }
  }
}

const P0 = pt();
const P1 = pt();
const P2 = pt();
const P3 = pt();

/** Sail-local frame, heeled over by the breeze. */
function sailFrame(s: Sail, m: number, shadow: boolean): Projector {
  const c = Math.cos(s.heading);
  const sn = Math.sin(s.heading);
  const heel = 0.62 + 0.08 * Math.sin(0.9 * s.ph);
  const hs = Math.sin(heel);
  const hc = Math.cos(heel);
  return (u, v, z, out) => {
    v += z * hs;
    z *= hc;
    const x = s.x + (u * c - v * sn) * m;
    const y = s.y + (u * sn + v * c) * m;
    return shadow ? shadowOf(x, y, z * m, out) : project(x, y, z * m, out);
  };
}

function sailCloth(ctx: CanvasRenderingContext2D, p: Projector, s: Sail, main: string, jib: string) {
  const boom = 0.55 + 0.12 * Math.sin(0.6 * s.ph);
  const belly = 0.06 + 0.01 * Math.sin(1.7 * s.ph);
  p(0.05, 0, 0.12, P0);
  p(0.05, 0, 0.95, P1);
  p(0.05 - 0.42 * Math.cos(boom), 0.42 * Math.sin(boom), 0.14, P2);
  p(0.05 - 0.42 * Math.cos(boom) * 0.5 + belly, 0.42 * Math.sin(boom) * 0.5 + belly, 0.5, P3);
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.lineTo(P1.x, P1.y);
  ctx.quadraticCurveTo(P3.x, P3.y, P2.x, P2.y);
  ctx.closePath();
  ctx.fill();
  p(0.38, 0, 0.1, P0);
  p(0.05, 0, 0.741, P1);
  p(0.12, 0.2 * Math.sin(boom), 0.1, P2);
  ctx.fillStyle = jib;
  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.lineTo(P1.x, P1.y);
  ctx.lineTo(P2.x, P2.y);
  ctx.closePath();
  ctx.fill();
}

function stroke2(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.lineTo(P1.x, P1.y);
  ctx.stroke();
}

function sailShadow(ctx: CanvasRenderingContext2D, s: Sail, m: number) {
  const p = sailFrame(s, m, true);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  sailCloth(ctx, p, s, "rgba(0,0,0,0.5)", "rgba(0,0,0,0.5)");
  p(0.05, 0, 0, P0);
  p(0.05, 0, 0.95, P1);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 0.025 * m;
  stroke2(ctx);
}

function sailBoat(ctx: CanvasRenderingContext2D, s: Sail, m: number) {
  const p = sailFrame(s, m, false);
  for (const [z, k, color] of [
    [0, 1, "#5a3a22"],
    [0.08, 1, s.trim],
    [0.09, 0.78, "#d9b07a"],
  ] as const) {
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const u = i <= 16 ? 1 - (i / 16) * 2 : -1 + ((i - 16) / 16) * 2;
      const half = (u > 0 ? Math.cos((u * Math.PI) / 2) ** 0.9 : 0.75 + 0.25 * Math.cos((u * Math.PI) / 2)) * 0.11 * k;
      p(0.8 * u * 0.5 * (0.9 + 0.1 * k), (i <= 16 ? 1 : -1) * half, z, P0);
      if (i) ctx.lineTo(P0.x, P0.y);
      else ctx.moveTo(P0.x, P0.y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  p(0.05, 0, 0.08, P0);
  p(0.05, 0, 0.95, P1);
  ctx.strokeStyle = "#7a5634";
  ctx.lineWidth = 0.025 * m;
  ctx.lineCap = "round";
  stroke2(ctx);
  sailCloth(ctx, p, s, s.color, "rgba(250, 248, 240, 0.95)");
  p(0.05, 0, 0.14, P0);
  p(0.05, 0, 0.95, P1);
  ctx.strokeStyle = "rgba(255, 252, 236, 0.7)";
  ctx.lineWidth = 0.015 * m;
  stroke2(ctx);
  p(0.05, 0, 0.95, P0);
  p(-0.07, 0.03 * Math.sin(3 * s.ph), 0.94, P1);
  ctx.strokeStyle = "#d8473a";
  ctx.lineWidth = 0.016 * m;
  stroke2(ctx);
}

export function drawExtrasShadows(ctx: CanvasRenderingContext2D, ex: Extras, m: number) {
  const cart = ex.cart;
  shadowOf(cart.x, cart.y, 2.2 * m, P0);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = P0.x + Math.cos(a) * m * 1.15;
    const y = P0.y + Math.sin(a) * m * 1.15;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  shadowOf(cart.x, cart.y, 0.9 * m, P1);
  ctx.beginPath();
  ctx.moveTo(cart.x - 0.6 * m, cart.y);
  ctx.lineTo(P1.x - 0.6 * m, P1.y);
  ctx.lineTo(P1.x + 0.6 * m, P1.y);
  ctx.lineTo(cart.x + 0.6 * m, cart.y);
  ctx.fill();
  drawFigureShadow(ctx, cart.vendor, cart.look, m);
  const f = ex.fetch;
  drawFigureShadow(ctx, f.owner, f.look, m);
  drawDogShadow(ctx, f.dx, f.dy, f.dh, f.ph, m, false);
  shadowOf(f.bx, f.by, f.bz * m, P0);
  ctx.beginPath();
  ctx.arc(P0.x, P0.y, 0.06 * m, 0, TAU);
  ctx.fill();
  for (const s of ex.sails) sailShadow(ctx, s, m);
}

export function drawExtras(ctx: CanvasRenderingContext2D, ex: Extras, m: number, time: number) {
  const f = ex.fetch;
  drawDog(ctx, f.dx, f.dy, f.dh, f.ph, "#2e2a26", m, false);
  project(f.bx, f.by, f.bz * m, P0);
  ctx.fillStyle = "#d8e84a";
  ctx.beginPath();
  ctx.arc(P0.x, P0.y, 0.06 * m * P0.k, 0, TAU);
  ctx.fill();
  drawFigure(ctx, f.owner, f.look, m);
  for (const s of ex.sails) sailBoat(ctx, s, m);

  const cart = ex.cart;
  const hw = 0.65 * m;
  const hd = 0.4 * m;
  project(cart.x, cart.y, 0.9 * m, P0);
  ctx.fillStyle = "#2a2a2c";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cart.x + side * hw, cart.y, 0.08 * m, 0.3 * m, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#b8bcc0";
  ctx.beginPath();
  ctx.roundRect(P0.x - hw, P0.y - hd, 2 * hw, 2 * hd, 0.08 * m);
  ctx.fill();
  ctx.fillStyle = "#e8ecee";
  ctx.fillRect(P0.x - 0.85 * hw, P0.y - 0.7 * hd, 0.8 * hw, 1.4 * hd);
  ctx.fillStyle = "#d84a3a";
  ctx.fillRect(P0.x + 0.15 * hw, P0.y - 0.7 * hd, 0.65 * hw, 0.5 * hd);
  ctx.fillStyle = "#f2c640";
  ctx.fillRect(P0.x + 0.15 * hw, P0.y + 0.1 * hd, 0.65 * hw, 0.5 * hd);
  drawFigure(ctx, cart.vendor, cart.look, m);

  // The parasol over the cart.
  project(cart.x, cart.y, 2.2 * m, P0);
  const r = 1.15 * m * P0.k;
  const turn = 0.02 * Math.sin(0.3 * time);
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + turn;
    const a1 = ((i + 1) / 8) * Math.PI * 2 + turn;
    const mid = (a0 + a1) / 2;
    ctx.fillStyle = i % 2 ? "#f6cc48" : "#3474bc";
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    ctx.lineTo(P0.x + Math.cos(a0) * r, P0.y + Math.sin(a0) * r);
    ctx.quadraticCurveTo(P0.x + Math.cos(mid) * r * 0.9, P0.y + Math.sin(mid) * r * 0.9, P0.x + Math.cos(a1) * r, P0.y + Math.sin(a1) * r);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(P0.x - 0.35 * r, P0.y + 0.1 * r, 0.1 * r, P0.x, P0.y, r);
  g.addColorStop(0, "rgba(255, 250, 230, 0.32)");
  g.addColorStop(0.6, "rgba(255, 250, 230, 0)");
  g.addColorStop(1, "rgba(20, 30, 60, 0.18)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(P0.x, P0.y, r, 0, TAU);
  ctx.fill();
  project(cart.x, cart.y, 2.35 * m, P1);
  ctx.fillStyle = "#f8f4ea";
  ctx.beginPath();
  ctx.arc(P1.x, P1.y, 0.08 * m, 0, TAU);
  ctx.fill();
}
