import { sfx } from "../../audio/sfx";
import { say, spawnPuff, spawnSparkle, type Fx } from "./fx";
import type { Park } from "./layout";
import { angleDelta, easeInOutCubic, rand, TAU } from "./math";
import { drawFigure, drawFigureShadow, J, poseSkeleton, type Joint3, type Look, type Pose } from "./people";
import { project, pt, type Pt } from "./projection";

export enum SmokerState {
  Rest = 0,
  Raise = 1,
  Drag = 2,
  Lower = 3,
  Exhale = 4,
  ToBin = 5,
  Pockets = 6,
  Light = 7,
}

export type Smoker = {
  x: number;
  y: number;
  face: number;
  s: SmokerState;
  t: number;
  dur: number;
  /** Hand from lap (0) to lips (1). */
  raise: number;
  /** Cigarette left, 1 = fresh. */
  length: number;
  drags: number;
  glow: number;
  lit: boolean;
  look: number;
  lookTo: number;
  lookT: number;
  cough: number;
  talkT: number;
  line: number;
  emitT: number;
  flame: number;
  hand: Pt;
  ember: Pt;
  mouth: Pt;
};

export const SMOKER_LOOK: Look = {
  coat: "#f5f2ea",
  legs: "#2e3a52",
  shoes: "#3a2c24",
  hair: "#3a2e26",
  skin: "#d8ac88",
  hairStyle: 0,
  hat: 0,
  hatColor: "#000000",
  scarf: null,
  longCoat: false,
  bag: null,
  scale: 1,
};

const pose: Pose & { handR: Joint3 } = {
  x: 0,
  y: 0,
  heading: 0,
  ph: 0,
  stride: 0,
  sitting: true,
  look: 0,
  handR: [0, 0, 0],
  handL: null,
};

/** Left hand cupped at the lips while the lighter is struck. */
const LIGHTER_HAND: Joint3 = [0.08, -0.05, 1.08];

export function createSmoker(park: Park, lineCount: number): Smoker {
  const b = park.benches[park.smokerBench];
  return {
    x: b.x - Math.cos(b.face) * park.m * 0.08,
    y: b.y - Math.sin(b.face) * park.m * 0.08,
    face: b.face,
    s: SmokerState.Rest,
    t: 0,
    dur: 3,
    raise: 0,
    length: 0.8,
    drags: 0,
    glow: 0.3,
    lit: true,
    look: 0,
    lookTo: 0,
    lookT: 2,
    cough: 0,
    talkT: rand(4, 9),
    line: (Math.random() * lineCount) | 0,
    emitT: 0,
    flame: 0,
    hand: pt(),
    ember: pt(),
    mouth: pt(),
  };
}

export function smokerPose(sm: Smoker, time: number, m: number): Pose {
  const shake = sm.cough > 0 ? Math.sin(60 * time) * m * 0.025 * sm.cough : 0;
  pose.x = sm.x + shake;
  pose.y = sm.y + Math.sin(1.1 * time) * m * 0.006;
  pose.heading = sm.face;
  pose.look = sm.look;
  const h = pose.handR;
  if (sm.s === SmokerState.ToBin) {
    const k = Math.sin(Math.min(1, sm.t / sm.dur) * Math.PI);
    h[0] = 0.26 - 0.3 * k;
    h[1] = 0.18 + 0.75 * k;
    h[2] = 0.56 - 0.2 * k;
  } else {
    const k = sm.raise;
    h[0] = 0.26 - 0.2 * k;
    h[1] = 0.18 - 0.12 * k;
    h[2] = 0.56 + 0.54 * k;
  }
  pose.handL = sm.s === SmokerState.Light ? LIGHTER_HAND : null;
  return pose;
}

function enter(sm: Smoker, s: SmokerState, dur: number) {
  sm.s = s;
  sm.t = 0;
  sm.dur = dur;
}

/** Heading towards the nearest passer-by within 4.5 m, if any. */
export function nearestPasserBy(sm: Smoker, people: { pose: { x: number; y: number } }[], m: number): number | null {
  for (const p of people) {
    if (Math.hypot(p.pose.x - sm.x, p.pose.y - sm.y) < 4.5 * m) return Math.atan2(p.pose.y - sm.y, p.pose.x - sm.x);
  }
  return null;
}

export function updateSmoker(
  fx: Fx,
  sm: Smoker,
  park: Park,
  dt: number,
  time: number,
  windX: number,
  windY: number,
  watch: number | null,
  musings: readonly string[],
) {
  const m = park.m;
  sm.t += dt;
  const f = Math.min(1, sm.t / sm.dur);
  switch (sm.s) {
    case SmokerState.Rest:
      sm.raise += (0 - sm.raise) * Math.min(1, 4 * dt);
      if (f >= 1) enter(sm, SmokerState.Raise, rand(0.8, 1.1));
      break;
    case SmokerState.Raise:
      sm.raise = easeInOutCubic(f);
      if (f >= 1) enter(sm, SmokerState.Drag, rand(1.2, 2.1));
      break;
    case SmokerState.Drag:
      sm.length -= 0.045 * dt;
      if (f >= 1) {
        sm.drags++;
        enter(sm, SmokerState.Lower, rand(0.7, 1));
      }
      break;
    case SmokerState.Lower:
      sm.raise = 1 - easeInOutCubic(f);
      if (f >= 1) enter(sm, SmokerState.Exhale, rand(1.6, 2.4));
      break;
    case SmokerState.Exhale:
      if (f >= 1) {
        if (Math.random() < 0.12) {
          sm.cough = 0.6;
          sfx.cough(sm.x / park.w, 0.45);
        }
        if (sm.length < 0.28) enter(sm, SmokerState.ToBin, 1.6);
        else enter(sm, SmokerState.Rest, rand(3.5, 8));
      }
      break;
    case SmokerState.ToBin:
      if (f > 0.5 && sm.lit) {
        sm.lit = false;
        sfx.flick(park.bin.x / park.w);
      }
      if (f >= 1) enter(sm, SmokerState.Pockets, rand(6, 13));
      break;
    case SmokerState.Pockets:
      if (f >= 1) enter(sm, SmokerState.Light, 2.2);
      break;
    case SmokerState.Light:
      sm.raise = Math.min(1, sm.t / 0.6);
      if (sm.t > 0.9 && sm.t - dt <= 0.9) sfx.flick(sm.x / park.w);
      if (sm.t > 1.25 && sm.t - dt <= 1.25) {
        sfx.flick(sm.x / park.w);
        sm.flame = 0.8;
      }
      if (sm.t > 1.4 && !sm.lit) {
        sm.lit = true;
        sm.length = 0.95;
        sm.drags = 0;
      }
      if (f >= 1) enter(sm, SmokerState.Drag, 1.6);
      break;
  }
  sm.flame = Math.max(0, sm.flame - dt);
  sm.cough = Math.max(0, sm.cough - dt);
  const glowTo = sm.lit ? (sm.s === SmokerState.Drag ? 1 : 0.28 + 0.04 * Math.sin(2.3 * sm.t)) : 0;
  sm.glow += (glowTo - sm.glow) * Math.min(1, dt * (glowTo > sm.glow ? 3 : 1.5));

  sm.lookT -= dt;
  if (watch !== null && sm.s !== SmokerState.Drag) sm.lookTo = Math.max(-1.1, Math.min(1.1, angleDelta(sm.face, watch)));
  else if (sm.lookT <= 0) {
    sm.lookT = rand(2, 6);
    sm.lookTo = Math.random() < 0.5 ? 0 : rand(-0.9, 0.9);
  }
  if (sm.s === SmokerState.Drag || sm.s === SmokerState.Light) sm.lookTo = 0;
  sm.look += (sm.lookTo - sm.look) * Math.min(1, 2.5 * dt);

  const p = smokerPose(sm, time, m);
  poseSkeleton(p, SMOKER_LOOK, m, false);
  sm.hand.x = J[11].x;
  sm.hand.y = J[11].y;
  sm.hand.k = J[11].k;
  const head = J[13];
  const face = p.heading + p.look;
  const lip = 0.1 * m * SMOKER_LOOK.scale * head.k;
  sm.mouth.x = head.x + Math.cos(face) * lip;
  sm.mouth.y = head.y + Math.sin(face) * lip;
  sm.mouth.k = head.k;

  const tilt = sm.face + 0.6 * (1 - sm.raise);
  const reach = (0.05 + 0.07 * Math.max(0, sm.length)) * m * sm.hand.k;
  sm.ember.x = sm.hand.x + Math.cos(tilt) * reach;
  sm.ember.y = sm.hand.y + Math.sin(tilt) * reach;
  if (sm.lit && Math.random() < dt * (sm.s === SmokerState.Drag ? 1.2 : 0.15 * +(sm.s === SmokerState.Rest))) {
    spawnSparkle(fx, sm.ember.x, sm.ember.y, m, sm.s === SmokerState.Rest ? 3 : 1, 0.4 * m, "255, 176, 96", 0.7);
  }
  if (sm.lit) {
    for (sm.emitT -= dt; sm.emitT <= 0; ) {
      sm.emitT += 0.035;
      spawnPuff(fx, sm.ember.x, sm.ember.y, windX * m * 0.2, windY * m * 0.2, m, false);
    }
  }
  if (sm.s === SmokerState.Exhale && f < 0.75) {
    const a = sm.face + sm.look + 0.25;
    const v = m * (1.4 - 1.4 * f);
    if (Math.random() < 0.85) {
      spawnPuff(
        fx,
        sm.mouth.x,
        sm.mouth.y,
        Math.cos(a) * v + (Math.random() - 0.5) * m * 0.3,
        Math.sin(a) * v + (Math.random() - 0.5) * m * 0.3,
        m,
        true,
      );
    }
  }
  sm.talkT -= dt;
  if (sm.talkT <= 0 && sm.s === SmokerState.Rest && musings.length) {
    sm.line = (sm.line + 1 + ((3 * Math.random()) | 0)) % musings.length;
    const sp = fx.speech;
    if (!(sp.t < sp.life && sp.life > 0)) {
      say(fx, musings[sm.line], sm.mouth.x, sm.mouth.y - 12);
      sm.talkT = rand(14, 22);
    }
  }
}

export function drawSmokerShadow(ctx: CanvasRenderingContext2D, sm: Smoker, m: number, time: number) {
  drawFigureShadow(ctx, smokerPose(sm, time, m), SMOKER_LOOK, m);
}

const CUP = pt();

export function drawSmoker(ctx: CanvasRenderingContext2D, sm: Smoker, m: number, time: number) {
  const c = Math.cos(sm.face);
  const s = Math.sin(sm.face);
  project(sm.x + (-0.04 * c + 0.62 * s) * m, sm.y + (-0.04 * s - 0.62 * c) * m, 0.56 * m, CUP);
  ctx.fillStyle = "#3c6a9a";
  ctx.beginPath();
  ctx.arc(CUP.x, CUP.y, 0.065 * m, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f6f2ea";
  ctx.beginPath();
  ctx.arc(CUP.x, CUP.y, 0.052 * m, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#8a7a68";
  ctx.beginPath();
  ctx.ellipse(CUP.x + 0.025 * m, CUP.y, 0.012 * m, 0.006 * m, 0, 0, TAU);
  ctx.fill();
  drawFigure(ctx, smokerPose(sm, time, m), SMOKER_LOOK, m);
  if (!(sm.lit || sm.s === SmokerState.ToBin || (sm.s === SmokerState.Light && sm.t > 0.4))) return;
  const h = sm.hand;
  const e = sm.ember;
  const fx = h.x + (e.x - h.x) * 0.3;
  const fy = h.y + (e.y - h.y) * 0.3;
  ctx.lineCap = "butt";
  ctx.lineWidth = 0.03 * m;
  ctx.strokeStyle = "#d0a060";
  ctx.beginPath();
  ctx.moveTo(h.x, h.y);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  ctx.strokeStyle = "#fbf8f2";
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  if (sm.lit) {
    ctx.fillStyle = `rgb(255, ${120 + 100 * sm.glow}, ${50 + 60 * sm.glow})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 0.022 * m, 0, TAU);
    ctx.fill();
  }
}

/** Ember and lighter flame, drawn additively on the air layer. */
export function drawSmokerGlow(ctx: CanvasRenderingContext2D, sm: Smoker, m: number) {
  if (sm.lit) {
    const e = sm.ember;
    const k = sm.glow;
    const r = m * (0.16 + 0.3 * k);
    const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
    g.addColorStop(0, `rgba(255, ${170 + 60 * k}, 90, ${0.55 + 0.45 * k})`);
    g.addColorStop(0.25, `rgba(255, 120, 50, ${0.18 + 0.3 * k})`);
    g.addColorStop(1, "rgba(255, 90, 30, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.fill();
  }
  if (sm.flame > 0) {
    const p = sm.mouth;
    const k = sm.flame / 0.8;
    const r = 0.3 * m * (0.8 + 0.3 * Math.random());
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(255, 230, 150, ${0.9 * k})`);
    g.addColorStop(1, "rgba(255, 160, 60, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
  }
}
