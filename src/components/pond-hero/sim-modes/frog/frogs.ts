import { sfx } from "../../audio/sfx";

export const FROG_SHEET_SRC = "/pond-hero/frog/frog-hop-sheet-256.webp";
export const FROG_CELL = 256;
export const FROG_FRAMES = 11;
export const FROG_SIZE = 180;

const FRAME_MS = [180, 130, 180, 105, 95, 105, 135, 150, 120, 130, 220];
const FRAME_START = new Float32Array(12);
for (let i = 0, t = 0; i < 11; i++) {
  FRAME_START[i] = t;
  t += FRAME_MS[i];
  FRAME_START[11] = t;
}
const HOP_CYCLE_MS = FRAME_START[11];
/** Fraction of the hop where the feet leave / touch the ground (frames 4 and 10). */
const TAKEOFF = 595 / HOP_CYCLE_MS;
const LANDING = 1330 / HOP_CYCLE_MS;

const BURST_TURN = (10 * Math.PI) / 180;
const REST_TURN_SPREAD = (95 * Math.PI) / 180;
const TONGUE_FOV = (60 * Math.PI) / 180;
const SPAWN_SPACING_SQ = (1.35 * FROG_SIZE) ** 2;
const NEIGHBOR_RADIUS_SQ = (2.2 * FROG_SIZE) ** 2;
const TONGUE_REACH_SQ = 36e4;
const SCARED_HOP_MS = 720;
const WRAP_MARGIN = 80;

export const FrogMode = { rest: 0, hop: 1 } as const;
export type FrogMode = (typeof FrogMode)[keyof typeof FrogMode];

export const Tongue = { idle: 0, aim: 1, extend: 2, retract: 3 } as const;
export type Tongue = (typeof Tongue)[keyof typeof Tongue];

export type Fly = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wigglePhase: number;
  alive: boolean;
  ttlMs: number;
  ageMs: number;
  targeted: boolean;
  cruiseSpeed: number;
  maxSpeed: number;
  nervousness: number;
  boldness: number;
  size: number;
  dartTimerMs: number;
  dartCooldownMs: number;
};

export type Frog = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  heading: number;
  size: number;
  hopDistance: number;
  hopMs: number;
  burstSize: number;
  hopsLeft: number;
  shortRestMs: number;
  longRestMs: number;
  mode: FrogMode;
  modeTimer: number;
  frame: number;
  lift: number;
  restTargetHeading: number;
  tongueState: Tongue;
  tongueExtent: number;
  tongueDistance: number;
  targetFly: Fly | null;
  scaredHops: number;
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Signed shortest angle from `from` to `to` (same wrap formula as the original). */
function angleDelta(to: number, from: number): number {
  return ((to - from + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

function hopFrame(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 10;
  const t = progress * HOP_CYCLE_MS;
  for (let i = 0; i < 11; i++) if (t < FRAME_START[i + 1]) return i;
  return 10;
}

function hopEase(progress: number): number {
  if (progress <= TAKEOFF) return 0;
  if (progress >= LANDING) return 1;
  const t = (progress - TAKEOFF) / (LANDING - TAKEOFF);
  return t * t * (3 - 2 * t);
}

export function isMatureFly(fly: Fly): boolean {
  return fly.alive && fly.ageMs >= 2e3;
}

/** Deterministic layout (seed 31337) so frogs land in the same spots on every visit. */
export function spawnFrogs(w: number, h: number, count: number): Frog[] {
  let seed = 31337;
  const next = () => (seed = (16807 * seed) % 0x7fffffff) / 0x7fffffff;
  const frogs: Frog[] = [];
  for (let n = 0; n < count; n++) {
    const heading = next() * Math.PI * 2;
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      const cx = 90 + next() * (w - 180);
      const cy = 90 + next() * (h - 180);
      let clear = true;
      for (const other of frogs) {
        const dx = cx - other.x;
        const dy = cy - other.y;
        if (dx * dx + dy * dy < SPAWN_SPACING_SQ) {
          clear = false;
          break;
        }
      }
      x = cx;
      y = cy;
      if (clear) break;
    }
    const kind = next();
    const lazy = kind < 0.3;
    const bursty = !lazy && kind < 0.65;
    const hopMs = 1450 + 250 * next();
    const hopDistance =
      FROG_SIZE * (bursty ? 0.55 + (0.85 - 0.55) * next() : 0.75 + (1.15 - 0.75) * next());
    const burstSize = bursty ? Math.floor(4 + 4 * next()) : 1;
    const shortRestMs = bursty ? 0 + 50 * next() : 0;
    const longRestMs = lazy ? 5e3 + 6e3 * next() : bursty ? 1500 + 1500 * next() : 500 + 1500 * next();
    const startsResting = 0.5 > next();
    const restTimer = startsResting ? next() * longRestMs : 0;
    frogs.push({
      x,
      y,
      startX: x,
      startY: y,
      targetX: x + Math.cos(heading) * hopDistance,
      targetY: y + Math.sin(heading) * hopDistance,
      heading,
      size: FROG_SIZE,
      hopDistance,
      hopMs,
      burstSize,
      hopsLeft: burstSize,
      shortRestMs,
      longRestMs,
      mode: startsResting ? FrogMode.rest : FrogMode.hop,
      modeTimer: startsResting ? restTimer : next() * hopMs,
      frame: 0,
      lift: 0,
      restTargetHeading: heading,
      tongueState: Tongue.idle,
      tongueExtent: 0,
      tongueDistance: 0,
      targetFly: null,
      scaredHops: 0,
    });
  }
  return frogs;
}

export function spawnFly(x: number, y: number): Fly {
  const angle = Math.random() * Math.PI * 2;
  const size = rand(0.85, 1.25);
  const cruiseSpeed = rand(70, 165) * (1.35 - 0.4 * size);
  return {
    x,
    y,
    vx: Math.cos(angle) * cruiseSpeed,
    vy: Math.sin(angle) * cruiseSpeed,
    wigglePhase: Math.random() * Math.PI * 2,
    alive: true,
    ttlMs: 1e4,
    ageMs: 0,
    targeted: false,
    cruiseSpeed,
    maxSpeed: cruiseSpeed * rand(1.6, 2.4),
    nervousness: rand(0.55, 1.4),
    boldness: Math.random(),
    size,
    dartTimerMs: 0,
    dartCooldownMs: rand(200, 1e3),
  };
}

/** Rest heading that points away from crowded neighbours, or a wide random turn if alone. */
function awayFromNeighbors(frog: Frog, frogs: Frog[], self: number): number {
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < frogs.length; i++) {
    if (i === self) continue;
    const other = frogs[i];
    const dx = frog.x - other.x;
    const dy = frog.y - other.y;
    const d = dx * dx + dy * dy;
    if (d < NEIGHBOR_RADIUS_SQ && d > 0.01) {
      const inv = 1 / d;
      ax += dx * inv;
      ay += dy * inv;
    }
  }
  return ax * ax + ay * ay > 1e-9
    ? Math.atan2(ay, ax) + (2 * Math.random() - 1) * REST_TURN_SPREAD * 0.35
    : frog.heading + (2 * Math.random() - 1) * REST_TURN_SPREAD;
}

/** Up to two nearest idle frogs facing the fly start aiming their tongues at it. */
export function assignHunters(frogs: Frog[], fly: Fly): boolean {
  let best = -1;
  let second = -1;
  let bestD = Infinity;
  let secondD = Infinity;
  for (let i = 0; i < frogs.length; i++) {
    const frog = frogs[i];
    if (frog.tongueState !== Tongue.idle) continue;
    const dx = fly.x - frog.x;
    const dy = fly.y - frog.y;
    const d = dx * dx + dy * dy;
    if (d > TONGUE_REACH_SQ) continue;
    if (Math.abs(angleDelta(Math.atan2(dy, dx), frog.heading)) > TONGUE_FOV) continue;
    if (d < bestD) {
      secondD = bestD;
      second = best;
      bestD = d;
      best = i;
    } else if (d < secondD) {
      secondD = d;
      second = i;
    }
  }
  let assigned = 0;
  for (const index of [best, second]) {
    if (index < 0) continue;
    const frog = frogs[index];
    frog.tongueState = Tongue.aim;
    frog.targetFly = fly;
    frog.mode = FrogMode.rest;
    frog.modeTimer = 0;
    frog.lift = 0;
    frog.frame = 0;
    if (frog.hopsLeft <= 0) frog.hopsLeft = frog.burstSize;
    assigned++;
  }
  return assigned > 0;
}

export function stepFlies(flies: Fly[], frogs: Frog[], dtMs: number, w: number, h: number) {
  const dt = dtMs / 1e3;
  for (let i = flies.length - 1; i >= 0; i--) {
    const fly = flies[i];
    fly.ttlMs -= dtMs;
    fly.ageMs += dtMs;
    if (!fly.alive || fly.ttlMs <= 0) {
      flies.splice(i, 1);
      continue;
    }
    if (fly.dartTimerMs > 0) fly.dartTimerMs -= dtMs;
    else if (fly.dartCooldownMs > 0) fly.dartCooldownMs -= dtMs;
    if (Math.random() < 5.5 * dt * fly.nervousness) {
      const a = Math.random() * Math.PI * 2;
      fly.vx += 70 * Math.cos(a);
      fly.vy += 70 * Math.sin(a);
    }
    if (isMatureFly(fly)) {
      const fear = 230 - 90 * fly.boldness;
      const fearSq = fear * fear;
      let fx = 0;
      let fy = 0;
      let hunted = false;
      for (const frog of frogs) {
        const dx = fly.x - frog.x;
        const dy = fly.y - frog.y;
        const d = dx * dx + dy * dy;
        if (d >= fearSq || d < 0.01) continue;
        const dist = Math.sqrt(d);
        let push = 1 - dist / fear;
        if (frog.targetFly === fly && frog.tongueState !== Tongue.idle) {
          push *= 3.4;
          hunted = true;
          if (frog.tongueState === Tongue.extend) {
            const px = -Math.sin(frog.heading);
            const py = Math.cos(frog.heading);
            const side = px * fly.vx + py * fly.vy >= 0 ? 1 : -1;
            fx += px * side * push * 1.4;
            fy += py * side * push * 1.4;
            continue;
          }
        }
        const inv = 1 / dist;
        fx += dx * inv * push;
        fy += dy * inv * push;
      }
      fly.vx += 280 * fx * dt;
      fly.vy += 280 * fy * dt;
      if (hunted && fly.dartTimerMs <= 0 && fly.dartCooldownMs <= 0) {
        fly.dartTimerMs = rand(180, 360);
        fly.dartCooldownMs = rand(900, 1800);
      }
    }
    const speed = Math.hypot(fly.vx, fly.vy);
    const limit = fly.dartTimerMs > 0 ? fly.maxSpeed : 1.3 * fly.cruiseSpeed;
    if (speed > limit) {
      fly.vx = (fly.vx / speed) * limit;
      fly.vy = (fly.vy / speed) * limit;
    } else if (speed < 0.35 * fly.cruiseSpeed) {
      const a = Math.random() * Math.PI * 2;
      fly.vx += 50 * Math.cos(a);
      fly.vy += 50 * Math.sin(a);
    }
    fly.vx *= 0.985;
    fly.vy *= 0.985;
    fly.wigglePhase += 40 * dt;
    if (speed > 1) {
      const wiggle = 12 * Math.sin(fly.wigglePhase);
      fly.x += (-fly.vy / speed) * wiggle * dt;
      fly.y += (fly.vx / speed) * wiggle * dt;
    }
    fly.x += fly.vx * dt;
    fly.y += fly.vy * dt;
    if (fly.x < 16) {
      fly.x = 16;
      fly.vx = Math.abs(fly.vx);
    } else if (fly.x > w - 16) {
      fly.x = w - 16;
      fly.vx = -Math.abs(fly.vx);
    }
    if (fly.y < 16) {
      fly.y = 16;
      fly.vy = Math.abs(fly.vy);
    } else if (fly.y > h - 16) {
      fly.y = h - 16;
      fly.vy = -Math.abs(fly.vy);
    }
  }
}

/** Advances the tongue; returns true while it owns the frog (no hopping). */
function stepTongue(frog: Frog, dtMs: number, w: number): boolean {
  if (frog.tongueState === Tongue.idle) return false;
  frog.frame = 0;
  frog.lift = 0;
  switch (frog.tongueState) {
    case Tongue.aim: {
      const fly = frog.targetFly;
      if (!fly || !fly.alive) {
        frog.tongueState = Tongue.idle;
        frog.targetFly = null;
        return true;
      }
      const dx = fly.x - frog.x;
      const dy = fly.y - frog.y;
      const want = Math.atan2(dy, dx);
      const delta = angleDelta(want, frog.heading);
      const turn = 0.012 * dtMs;
      if (Math.abs(delta) <= turn + 0.05) {
        frog.heading = want;
        frog.tongueState = Tongue.extend;
        frog.tongueExtent = 0;
        frog.tongueDistance = Math.hypot(dx, dy);
      } else {
        frog.heading += Math.sign(delta) * turn;
      }
      return true;
    }
    case Tongue.extend:
      frog.tongueExtent += dtMs / 180;
      if (frog.tongueExtent >= 1) {
        frog.tongueExtent = 1;
        if (frog.targetFly && frog.targetFly.alive) {
          frog.targetFly.alive = false;
          sfx.snap(frog.x / w);
        }
        frog.tongueState = Tongue.retract;
      } else if (frog.targetFly && !frog.targetFly.alive) {
        frog.tongueState = Tongue.retract;
      }
      return true;
    case Tongue.retract:
      frog.tongueExtent -= dtMs / 240;
      if (frog.tongueExtent <= 0) {
        frog.tongueExtent = 0;
        frog.tongueState = Tongue.idle;
        frog.targetFly = null;
      }
      return true;
  }
  return false;
}

export function stepFrogs(frogs: Frog[], dtMs: number, w: number, h: number) {
  const spanX = w + 2 * WRAP_MARGIN;
  const spanY = h + 2 * WRAP_MARGIN;
  for (let i = 0; i < frogs.length; i++) {
    const frog = frogs[i];
    if (stepTongue(frog, dtMs, w)) continue;
    frog.modeTimer -= dtMs;
    if (frog.mode === FrogMode.rest) {
      frog.frame = 0;
      frog.lift = 0;
      if (frog.heading !== frog.restTargetHeading) {
        const delta = angleDelta(frog.restTargetHeading, frog.heading);
        const turn = 0.004 * dtMs;
        if (Math.abs(delta) <= turn) frog.heading = frog.restTargetHeading;
        else frog.heading += Math.sign(delta) * turn;
      }
      if (frog.modeTimer <= 0) {
        const scared = frog.scaredHops > 0;
        const dist = scared ? 1.45 * frog.hopDistance : frog.hopDistance;
        frog.startX = frog.x;
        frog.startY = frog.y;
        frog.targetX = frog.x + Math.cos(frog.heading) * dist;
        frog.targetY = frog.y + Math.sin(frog.heading) * dist;
        frog.mode = FrogMode.hop;
        frog.modeTimer = scared ? SCARED_HOP_MS : frog.hopMs;
      }
    } else {
      const scared = frog.scaredHops > 0;
      const duration = scared ? SCARED_HOP_MS : frog.hopMs;
      const progress = (duration - frog.modeTimer) / duration;
      const eased = hopEase(progress);
      frog.x = frog.startX + (frog.targetX - frog.startX) * eased;
      frog.y = frog.startY + (frog.targetY - frog.startY) * eased;
      frog.lift =
        progress <= TAKEOFF || progress >= LANDING
          ? 0
          : Math.sin(((progress - TAKEOFF) / (LANDING - TAKEOFF)) * Math.PI);
      frog.frame = hopFrame(progress);
      if (frog.modeTimer <= 0) {
        frog.x = frog.targetX;
        frog.y = frog.targetY;
        frog.mode = FrogMode.rest;
        if (scared) {
          frog.scaredHops -= 1;
          if (frog.scaredHops > 0) {
            frog.modeTimer = 25;
          } else {
            frog.modeTimer = frog.longRestMs;
            frog.hopsLeft = frog.burstSize;
            frog.restTargetHeading = awayFromNeighbors(frog, frogs, i);
          }
        } else {
          frog.hopsLeft -= 1;
          if (frog.hopsLeft > 0) {
            frog.modeTimer = frog.shortRestMs;
            frog.restTargetHeading = frog.heading + (2 * Math.random() - 1) * BURST_TURN;
          } else {
            frog.modeTimer = frog.longRestMs;
            frog.hopsLeft = frog.burstSize;
            frog.restTargetHeading = awayFromNeighbors(frog, frogs, i);
          }
        }
      }
    }
    if (frog.x < -WRAP_MARGIN) {
      frog.x += spanX;
      frog.startX += spanX;
      frog.targetX += spanX;
    } else if (frog.x > w + WRAP_MARGIN) {
      frog.x -= spanX;
      frog.startX -= spanX;
      frog.targetX -= spanX;
    }
    if (frog.y < -WRAP_MARGIN) {
      frog.y += spanY;
      frog.startY += spanY;
      frog.targetY += spanY;
    } else if (frog.y > h + WRAP_MARGIN) {
      frog.y -= spanY;
      frog.startY -= spanY;
      frog.targetY -= spanY;
    }
  }
}

export function hitFrog(frogs: Frog[], x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < frogs.length; i++) {
    const frog = frogs[i];
    const r = 0.45 * frog.size;
    const dx = x - frog.x;
    const dy = y - frog.y;
    const d = dx * dx + dy * dy;
    if (d < r * r && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** Startle a frog: cancel its tongue, face away from the tap and bound off three times. */
export function scareFrog(frog: Frog, fromX: number, fromY: number) {
  if (frog.tongueState !== Tongue.idle) {
    frog.tongueState = Tongue.idle;
    frog.targetFly = null;
    frog.tongueExtent = 0;
  }
  const dx = frog.x - fromX;
  const dy = frog.y - fromY;
  if (dx * dx + dy * dy > 0.01) {
    frog.heading = Math.atan2(dy, dx);
    frog.restTargetHeading = frog.heading;
  }
  frog.scaredHops = 3;
  if (frog.mode === FrogMode.rest) {
    frog.modeTimer = 0;
    frog.lift = 0;
  }
}
