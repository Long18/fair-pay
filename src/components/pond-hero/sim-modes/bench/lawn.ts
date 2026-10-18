import { blowBubble, type Fx } from "./fx";
import type { Park } from "./layout";
import { angleDelta, rand, seeded, TAU } from "./math";
import { drawFigure, drawFigureShadow, randomLook, type Look, type Pose } from "./people";
import { project, pt, shadowOf } from "./projection";

export type LawnPerson = { pose: Pose; look: Look; home: [number, number]; lookT: number; to: number };
export type Kid = LawnPerson & { blowT: number; blowing: number; chase: number; tx: number; ty: number };
export type Disc = {
  from: number;
  t: number;
  dur: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bend: number;
  flying: boolean;
  wait: number;
  x: number;
  y: number;
  z: number;
};
export type Lawn = { sitters: LawnPerson[]; players: [LawnPerson, LawnPerson]; kid: Kid; disc: Disc };

function lawnPerson(x: number, y: number, heading: number, look: Look, sitting: boolean): LawnPerson {
  return {
    pose: {
      x,
      y,
      heading,
      ph: 6 * Math.random(),
      stride: 0,
      sitting,
      seat: sitting ? 0.1 : undefined,
      look: 0,
      handR: null,
      handL: null,
    },
    look,
    home: [x, y],
    lookT: rand(1, 4),
    to: 0,
  };
}

/** Walk towards (tx, ty); returns true once there. */
function walkTo(p: LawnPerson, tx: number, ty: number, speed: number, m: number, dt: number): boolean {
  const pose = p.pose;
  const dx = tx - pose.x;
  const dy = ty - pose.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.08 * m) {
    pose.stride += (0 - pose.stride) * Math.min(1, 6 * dt);
    return true;
  }
  const step = Math.min(d, speed * m * dt);
  pose.x += (dx / d) * step;
  pose.y += (dy / d) * step;
  pose.heading += angleDelta(pose.heading, Math.atan2(dy, dx)) * Math.min(1, 8 * dt);
  pose.ph += dt * Math.PI * 2 * (speed > 2 ? 2.4 : 1.8);
  pose.stride += (1 - pose.stride) * Math.min(1, 6 * dt);
  return false;
}

export function forEachLawnPerson(lawn: Lawn, fn: (p: LawnPerson) => void) {
  for (const s of lawn.sitters) fn(s);
  fn(lawn.players[0]);
  fn(lawn.players[1]);
  fn(lawn.kid);
}

export function createLawn(park: Park): Lawn {
  const r = seeded(808);
  const m = park.m;
  const sitters: LawnPerson[] = [];
  park.blankets.forEach((b, i) => {
    const count = i === 1 ? 3 : i === 0 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const a = b.ang + (k / count) * Math.PI * 2 + 0.6;
      const d = 0.5 * m;
      const x = b.x + Math.cos(a) * d;
      const y = b.y + Math.sin(a) * d;
      sitters.push(lawnPerson(x, y, a + Math.PI + rand(-0.5, 0.5), randomLook(r), true));
    }
  });
  const [x0, y0, x1, y1] = park.frisbee;
  const players: [LawnPerson, LawnPerson] = [
    lawnPerson(x0, y0, Math.atan2(y1 - y0, x1 - x0), randomLook(r), false),
    lawnPerson(x1, y1, Math.atan2(y0 - y1, x0 - x1), randomLook(r), false),
  ];
  const b0 = park.blankets[0];
  const kid: Kid = Object.assign(lawnPerson(b0.x - 1.6 * m, b0.y - 0.4 * m, -0.3, randomLook(r, 0.6), false), {
    blowT: 2,
    blowing: 0,
    chase: 0,
    tx: 0,
    ty: 0,
  });
  kid.look.longCoat = false;
  kid.look.bag = null;
  return {
    sitters,
    players,
    kid,
    disc: { from: 0, t: 0, dur: 1, x0: 0, y0: 0, x1: 0, y1: 0, bend: 0, flying: false, wait: 1.5, x: x0, y: y0, z: 1 },
  };
}

const BP = pt();

export function updateLawn(fx: Fx, lawn: Lawn, park: Park, dt: number, windX: number, windY: number) {
  const m = park.m;
  for (const s of lawn.sitters) {
    s.lookT -= dt;
    if (s.lookT <= 0) {
      s.lookT = rand(1.5, 6);
      s.to = rand(-0.8, 0.8);
    }
    s.pose.look += (s.to - s.pose.look) * Math.min(1, 2 * dt);
  }

  const disc = lawn.disc;
  const [p0, p1] = lawn.players;
  if (disc.flying) {
    disc.t += dt;
    const thrower = disc.from ? p1 : p0;
    const catcher = disc.from ? p0 : p1;
    if (disc.t > 0.3) thrower.pose.handR = null;
    const there = walkTo(catcher, disc.x1, disc.y1, 3, m, dt);
    const f = Math.min(1, disc.t / disc.dur);
    const nx = -(disc.y1 - disc.y0);
    const ny = disc.x1 - disc.x0;
    const nl = Math.hypot(nx, ny) || 1;
    const curve = Math.sin(f * Math.PI) * disc.bend;
    disc.x = disc.x0 + (disc.x1 - disc.x0) * f + (nx / nl) * curve;
    disc.y = disc.y0 + (disc.y1 - disc.y0) * f + (ny / nl) * curve;
    disc.z = 1.05 + 0.9 * Math.sin(f * Math.PI);
    if (there) {
      catcher.pose.heading +=
        angleDelta(catcher.pose.heading, Math.atan2(disc.y - catcher.pose.y, disc.x - catcher.pose.x)) * Math.min(1, 6 * dt);
    }
    if (f >= 1) {
      disc.flying = false;
      disc.from = 1 - disc.from;
      disc.wait = rand(1, 2.4);
      catcher.pose.handR = [0.3, 0.2, 1.1];
    }
  } else {
    disc.wait -= dt;
    const thrower = disc.from ? p1 : p0;
    const catcher = disc.from ? p0 : p1;
    for (const [me, other] of [
      [thrower, catcher],
      [catcher, thrower],
    ]) {
      if (walkTo(me, me.home[0], me.home[1], 1.2, m, dt)) {
        me.pose.heading +=
          angleDelta(me.pose.heading, Math.atan2(other.pose.y - me.pose.y, other.pose.x - me.pose.x)) * Math.min(1, 5 * dt);
      }
    }
    thrower.pose.handR = disc.wait < 0.35 ? [-0.25, 0.35, 1] : null;
    if (disc.wait <= 0) {
      const tp = thrower.pose;
      disc.flying = true;
      disc.t = 0;
      disc.x0 = tp.x;
      disc.y0 = tp.y;
      disc.x1 = catcher.home[0] + rand(-1.6, 1.6) * m;
      disc.y1 = catcher.home[1] + rand(-1.2, 1.2) * m;
      disc.dur = Math.hypot(disc.x1 - disc.x0, disc.y1 - disc.y0) / (m * rand(7, 9));
      disc.bend = rand(-1, 1) * m * 1.2;
      thrower.pose.handR = [0.35, 0.25, 1.05];
    }
  }

  const kid = lawn.kid;
  if (kid.chase > 0) {
    kid.chase -= dt;
    walkTo(kid, kid.tx, kid.ty, 2.2, m, dt);
  } else if (walkTo(kid, kid.home[0], kid.home[1], 1.5, m, dt)) {
    kid.pose.heading += angleDelta(kid.pose.heading, Math.atan2(windY, windX)) * Math.min(1, 2 * dt);
    kid.blowT -= dt;
    if (kid.blowT <= 0 && kid.blowing <= 0) {
      kid.blowing = 1.6;
      kid.blowT = rand(4, 8);
    }
    if (kid.blowing > 0) {
      kid.blowing -= dt;
      kid.pose.handR = [0.22, 0.05, 0.9];
      if (Math.random() < 5 * dt) {
        const p = kid.pose;
        const c = Math.cos(p.heading);
        const s = Math.sin(p.heading);
        project(p.x + c * m * 0.3, p.y + s * m * 0.3, 0.9 * m, BP);
        blowBubble(fx, BP.x, BP.y, (1.2 * c + 0.5 * windX) * m, (1.2 * s + 0.5 * windY) * m, m);
      }
      if (kid.blowing <= 0) {
        kid.pose.handR = null;
        if (Math.random() < 0.35) {
          kid.chase = rand(2, 3.5);
          kid.tx = kid.home[0] + windX * m * 5 + rand(-1, 1) * m * 2;
          kid.ty = kid.home[1] + windY * m * 5 + rand(-1, 1) * m * 2;
        }
      }
    }
  } else kid.pose.handR = null;
}

export function drawLawnShadows(ctx: CanvasRenderingContext2D, lawn: Lawn, m: number) {
  forEachLawnPerson(lawn, (p) => drawFigureShadow(ctx, p.pose, p.look, m));
  const d = lawn.disc;
  if (!d.flying) return;
  shadowOf(d.x, d.y, d.z * m, BP);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.ellipse(BP.x, BP.y, 0.13 * m, 0.1 * m, 0, 0, TAU);
  ctx.fill();
}

export function drawLawn(ctx: CanvasRenderingContext2D, lawn: Lawn, m: number, time: number) {
  forEachLawnPerson(lawn, (p) => drawFigure(ctx, p.pose, p.look, m));
  const d = lawn.disc;
  if (!d.flying) return;
  project(d.x, d.y, d.z * m, BP);
  const r = 0.14 * m * BP.k;
  ctx.fillStyle = "#ff8a5c";
  ctx.beginPath();
  ctx.arc(BP.x, BP.y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 240, 220, 0.8)";
  ctx.lineWidth = 0.8;
  const spin = 20 * time;
  ctx.beginPath();
  ctx.arc(BP.x, BP.y, 0.6 * r, spin, spin + 2);
  ctx.stroke();
}
