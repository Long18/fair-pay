import { spawnRipple, spawnSparkle, type Fx } from "./fx";
import { pondField, pondSpot, type Park } from "./layout";
import { angleDelta, rand, seeded, TAU } from "./math";
import { drawFigure, drawFigureShadow, randomLook, type Look, type Pose } from "./people";
import { project, pt, type Pt } from "./projection";

export type Boat = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  tx: number;
  ty: number;
  /** Stroke phase; the fractional part is the position in one stroke. */
  stroke: number;
  rowing: boolean;
  t: number;
  rower: Pose;
  rowerLook: Look;
  guest: Pose;
  guestLook: Look;
};

type Frame = { x: number; y: number; c: number; s: number; m: number };

/** Hull half-beam along the keel; `u` runs from bow (+1) to stern (-1). */
const beam = (u: number) =>
  (u > 0 ? Math.cos((Math.min(1, u) * Math.PI) / 2) ** 0.8 : 0.66 + 0.34 * Math.cos((Math.min(1, -u) * Math.PI) / 2) ** 0.5) * 0.65;

function local(b: Frame, u: number, v: number, z: number, out: Pt) {
  return project(b.x + (u * b.c - v * b.s) * b.m, b.y + (u * b.s + v * b.c) * b.m, z * b.m, out);
}

const A = pt();
const B = pt();

function hullPath(ctx: CanvasRenderingContext2D, b: Frame, z: number, k: number) {
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const u = 1 - (i / 28) * 2;
    local(b, 3.6 * u * 0.5 * (0.96 + 0.04 * k), beam(u) * k, z, A);
    if (i) ctx.lineTo(A.x, A.y);
    else ctx.moveTo(A.x, A.y);
  }
  for (let i = 28; i >= 0; i--) {
    const u = 1 - (i / 28) * 2;
    local(b, 3.6 * u * 0.5 * (0.96 + 0.04 * k), -beam(u) * k, z, A);
    ctx.lineTo(A.x, A.y);
  }
  ctx.closePath();
}

function line3(ctx: CanvasRenderingContext2D, b: Frame, u0: number, v0: number, z0: number, u1: number, v1: number, z1: number) {
  local(b, u0, v0, z0, A);
  local(b, u1, v1, z1, B);
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.stroke();
}

function newCourse(boat: Boat, park: Park) {
  const s = pondSpot(park, Math.random);
  boat.tx = s.x;
  boat.ty = s.y;
}

/** Oar sweep and lift through one stroke: drive for 45%, then recover in the air. */
function strokeShape(stroke: number) {
  const f = stroke % 1;
  const drive = f < 0.45;
  return {
    sweep: drive ? -0.55 + (f / 0.45) * 1.1 : 0.55 - ((f - 0.45) / 0.55) * 1.1,
    up: drive ? 0 : Math.sin(((f - 0.45) / 0.55) * Math.PI),
  };
}

export function createBoat(park: Park): Boat {
  const r = seeded(31);
  const boat: Boat = {
    x: park.pond.cx - 0.2 * park.pond.rx,
    y: park.pond.cy + 0.25 * park.pond.ry,
    heading: 2.4,
    speed: 0,
    tx: 0,
    ty: 0,
    stroke: 0,
    rowing: true,
    t: 12,
    rower: { x: 0, y: 0, heading: 0, ph: 0, stride: 0, sitting: true, seat: 0.3, look: 0, handR: [0, 0, 0], handL: [0, 0, 0] },
    rowerLook: randomLook(r),
    guest: { x: 0, y: 0, heading: 0, ph: 0, stride: 0, sitting: true, seat: 0.3, look: 0 },
    guestLook: randomLook(r),
  };
  boat.rowerLook.longCoat = false;
  boat.guestLook.longCoat = false;
  newCourse(boat, park);
  return boat;
}

export function updateBoat(
  fx: Fx,
  boat: Boat,
  park: Park,
  dt: number,
  windX: number,
  windY: number,
  onOar: (nx: number) => void,
) {
  const m = park.m;
  boat.t -= dt;
  if (boat.t <= 0) {
    boat.rowing = !boat.rowing;
    boat.t = boat.rowing ? rand(14, 26) : rand(8, 16);
    if (boat.rowing) newCourse(boat, park);
  }
  if (boat.rowing) {
    const before = boat.stroke % 1;
    boat.stroke += dt / 2.6;
    const now = boat.stroke % 1;
    if (now < 0.45) boat.speed += 0.55 * dt;
    const caught = before > now;
    if (caught) onOar(boat.x / park.w);
    if (caught || (before < 0.45 && now >= 0.45)) {
      const c = Math.cos(boat.heading);
      const s = Math.sin(boat.heading);
      const reach = 2.3 * m;
      for (const side of [-1, 1]) {
        const a = boat.heading + (Math.PI / 2) * side + (caught ? -0.55 : 0.55) * side;
        const ox = boat.x + Math.cos(a) * reach - c * m * 0.1;
        const oy = boat.y + Math.sin(a) * reach - s * m * 0.1;
        spawnRipple(fx, ox, oy, 0.8 * m, 0.5, 1.8);
        if (caught) spawnSparkle(fx, ox, oy, m, 4, 0.8 * m);
      }
    }
    const aim = Math.atan2(boat.ty - boat.y, boat.tx - boat.x);
    boat.heading += angleDelta(boat.heading, aim) * Math.min(1, 0.25 * dt);
    if (Math.hypot(boat.tx - boat.x, boat.ty - boat.y) < 3 * m) newCourse(boat, park);
  }
  boat.speed *= 1 - 0.35 * dt;
  boat.x += (Math.cos(boat.heading) * boat.speed + 0.04 * windX) * m * dt;
  boat.y += (Math.sin(boat.heading) * boat.speed + 0.04 * windY) * m * dt;
  if (pondField(park.pond, boat.x + Math.cos(boat.heading) * m * 3, boat.y + Math.sin(boat.heading) * m * 3) < 0.15) {
    boat.heading +=
      angleDelta(boat.heading, Math.atan2(park.pond.cy - boat.y, park.pond.cx - boat.x)) * Math.min(1, 1.2 * dt);
  }
  const c = Math.cos(boat.heading);
  const s = Math.sin(boat.heading);
  boat.rower.x = boat.x + c * m * 0.15;
  boat.rower.y = boat.y + s * m * 0.15;
  boat.rower.heading = boat.heading + Math.PI;
  const st = boat.rowing ? strokeShape(boat.stroke) : { sweep: 0, up: 0.3 };
  const reachBack = -(0.32 * st.sweep);
  boat.rower.handR = [0.3 + reachBack, 0.28, 0.62 + 0.1 * st.up];
  boat.rower.handL = [0.3 + reachBack, -0.28, 0.62 + 0.1 * st.up];
  boat.guest.x = boat.x - c * m * 1.1;
  boat.guest.y = boat.y - s * m * 1.1;
  boat.guest.heading = boat.heading;
}

export function drawBoatShadow(ctx: CanvasRenderingContext2D, boat: Boat, m: number) {
  ctx.save();
  ctx.translate(boat.x + 0.78 * m * 0.4, boat.y - 0.22 * m * 0.4);
  ctx.rotate(boat.heading);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6 * m * 0.5, 1.3 * m * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawFigureShadow(ctx, boat.rower, boat.rowerLook, m);
  drawFigureShadow(ctx, boat.guest, boat.guestLook, m);
}

function drawHull(ctx: CanvasRenderingContext2D, b: Frame) {
  const m = b.m;
  hullPath(ctx, b, 0, 1.12);
  ctx.fillStyle = "rgba(10, 40, 50, 0.28)";
  ctx.fill();
  hullPath(ctx, b, 0, 1);
  ctx.fillStyle = "#1f4d3a";
  ctx.fill();
  hullPath(ctx, b, 0.45, 1);
  ctx.fillStyle = "#3d7a58";
  ctx.fill();
  ctx.strokeStyle = "#efe6cf";
  ctx.lineWidth = 0.07 * m;
  ctx.lineJoin = "round";
  ctx.stroke();
  hullPath(ctx, b, 0.22, 0.84);
  ctx.fillStyle = "#c79a62";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(120, 76, 40, 0.45)";
  ctx.lineWidth = 0.8;
  for (const v of [-0.24, -0.08, 0.08, 0.24]) line3(ctx, b, -1.6, v, 0.12, 1.4, v, 0.12);
  ctx.strokeStyle = "rgba(150, 100, 56, 0.9)";
  ctx.lineWidth = 0.05 * m;
  for (let u = -1.5; u <= 1.4; u += 0.3) line3(ctx, b, u, -(0.9 * beam(u / 1.8)), 0.36, u, 0.9 * beam(u / 1.8), 0.36);
  const g0 = local(b, 0, 0.6, 0.3, pt());
  const g1 = local(b, 0, -0.6, 0.3, pt());
  const g = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
  g.addColorStop(0, "rgba(40, 22, 10, 0.3)");
  g.addColorStop(0.5, "rgba(255, 236, 200, 0.05)");
  g.addColorStop(1, "rgba(255, 236, 200, 0.2)");
  ctx.fillStyle = g;
  ctx.fillRect(b.x - 3 * m, b.y - 3 * m, 6 * m, 6 * m);
  ctx.restore();
  ctx.lineCap = "butt";
  for (const [u, w] of [
    [0.15, 0.2],
    [-1.2, 0.26],
    [1.05, 0.16],
  ]) {
    ctx.strokeStyle = "#b88a56";
    ctx.lineWidth = m * w;
    const half = 0.86 * beam(u / 1.8);
    line3(ctx, b, u, -half, 0.38, u, half, 0.38);
    ctx.strokeStyle = "rgba(255, 240, 210, 0.3)";
    ctx.lineWidth = m * w * 0.3;
    line3(ctx, b, u + 0.25 * w, -half, 0.39, u + 0.25 * w, half, 0.39);
  }
}

function drawOars(ctx: CanvasRenderingContext2D, b: Frame, sweep: number, up: number, heading: number) {
  const m = b.m;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const lock = beam(0.1 / 1.8);
    const a = (Math.PI / 2) * side - sweep * side;
    const c = Math.cos(a);
    const s = Math.sin(a);
    local(b, 0.1, side * lock, 0.5, A);
    ctx.fillStyle = "#c8a24a";
    ctx.beginPath();
    ctx.arc(A.x, A.y, 0.05 * m, 0, TAU);
    ctx.fill();
    const hu = 0.1 - 0.5 * c;
    const hv = side * lock - 0.5 * s;
    const bu = 0.1 + 1.95 * c;
    const bv = side * lock + 1.95 * s;
    const bz = 0.05 + 0.5 * up;
    ctx.strokeStyle = "#e2cb9c";
    ctx.lineWidth = 0.055 * m;
    line3(ctx, b, hu, hv, 0.62, bu, bv, bz);
    local(b, bu, bv, bz, A);
    const blade = heading + Math.atan2(s, c);
    ctx.fillStyle = "#f0dfb6";
    ctx.beginPath();
    ctx.ellipse(A.x, A.y, 0.36 * m, 0.09 * m, blade, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2f6a4c";
    ctx.beginPath();
    ctx.ellipse(A.x + Math.cos(blade) * m * 0.22, A.y + Math.sin(blade) * m * 0.22, 0.1 * m, 0.085 * m, blade, 0, TAU);
    ctx.fill();
  }
}

export function drawBoat(ctx: CanvasRenderingContext2D, boat: Boat, m: number) {
  const frame: Frame = { x: boat.x, y: boat.y, c: Math.cos(boat.heading), s: Math.sin(boat.heading), m };
  drawHull(ctx, frame);
  drawFigure(ctx, boat.guest, boat.guestLook, m);
  const st = boat.rowing ? strokeShape(boat.stroke) : { sweep: 0, up: 0.3 };
  drawOars(ctx, frame, st.sweep, st.up, boat.heading);
  drawFigure(ctx, boat.rower, boat.rowerLook, m);
}
