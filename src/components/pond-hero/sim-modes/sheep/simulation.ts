import { sfx } from "../../audio/sfx";
import { PALETTE_COUNT } from "./sheep-sprite";

export const SheepState = {
  WALKING_IN: 0,
  ANTICIPATION: 1,
  JUMPING: 2,
  LANDING: 3,
  WALKING_OUT: 4,
  STUCK: 5,
  STRUGGLING: 6,
  TUMBLE: 7,
} as const;
export type SheepState = (typeof SheepState)[keyof typeof SheepState];

export type Sheep = {
  x: number;
  y: number;
  state: SheepState;
  /** Seconds spent in the current state. */
  t: number;
  size: number;
  colorIdx: number;
  legFrame: number;
  legTimer: number;
  jumpStartX: number;
  jumpEndX: number;
  /** Per-sheep random phase driving speed / jump-point variation. */
  wobble: number;
  vy: number;
  /** Vertical offset above the ground (negative is up). */
  jumpY: number;
  willStuck: boolean;
  cachedSpeed: number;
  cachedJumpVar: number;
};

export type Flock = {
  sheep: Sheep[];
  spawnTimer: number;
  /** Successful (or tumbled-over) crossings. */
  count: number;
  time: number;
};

export const JUMP_DURATION = 0.55;
export const ANTICIPATION_DURATION = 0.12;
export const LANDING_DURATION = 0.15;
export const STUCK_DURATION = 0.3;
export const STRUGGLE_DURATION = 0.5;
export const TUMBLE_DURATION = 0.3;
/** Top rail height the stuck sheep hangs on (0.8 × post height). */
export const RAIL_TOP = 68 * 0.8;
export const JUMP_VELOCITY = 176 / (0.55 * 0.38);
const GRAVITY = 176 / (0.55 * 0.38 * (0.55 * 0.38));
const WALK_SPEED = 260;
const MAX_SHEEP = 8;
/** Distance before the take-off point where sheep start to speed up. */
export const RUN_UP = 200;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Ground line: a gentle bowl across the field. */
export function groundY(x: number, w: number, h: number): number {
  const u = (x - 0.5 * w) / (0.78 * w);
  return 0.48 * h + u * u * h * 0.18;
}

function cacheWobble(s: Sheep) {
  s.cachedSpeed = 0.8 + (Math.cos(2.3 * s.wobble) + 1) * 0.2;
  s.cachedJumpVar = (15 * Math.sin(3.7 * s.wobble)) | 0;
}

export function createSheep(w: number, h: number): Sheep {
  const size = 54 + rand(-3, 5);
  const x = -(1.5 * size);
  const sheep: Sheep = {
    x,
    y: groundY(x, w, h),
    state: SheepState.WALKING_IN,
    t: 0,
    size,
    colorIdx: (PALETTE_COUNT * Math.random()) | 0,
    legFrame: 0,
    legTimer: 0,
    jumpStartX: 0.5 * w - 95,
    jumpEndX: 0.5 * w + 95,
    wobble: rand(0, 2 * Math.PI),
    vy: 0,
    jumpY: 0,
    willStuck: false,
    cachedSpeed: 0,
    cachedJumpVar: 0,
  };
  cacheWobble(sheep);
  return sheep;
}

export function createFlock(w: number, h: number): Flock {
  const first = createSheep(w, h);
  first.x = 0.15 * w;
  return { sheep: [first], spawnTimer: rand(1.2, 2.8), count: 0, time: 0 };
}

function recycle(s: Sheep, w: number, h: number) {
  s.x = -(1.5 * s.size);
  s.y = groundY(s.x, w, h);
  s.state = SheepState.WALKING_IN;
  s.t = 0;
  s.legFrame = 0;
  s.legTimer = 0;
  s.jumpStartX = 0.5 * w - 95;
  s.jumpEndX = 0.5 * w + 95;
  s.wobble = rand(0, 2 * Math.PI);
  s.vy = 0;
  s.jumpY = 0;
  s.willStuck = false;
  cacheWobble(s);
}

export function stepFlock(flock: Flock, w: number, h: number, dt: number) {
  flock.time += dt;
  const speedScale = w / 900;
  flock.spawnTimer -= dt;
  if (flock.spawnTimer <= 0 && flock.sheep.length < MAX_SHEEP) {
    let entranceBusy = false;
    for (const s of flock.sheep) {
      if (s.x < 81) {
        entranceBusy = true;
        break;
      }
    }
    if (!entranceBusy) flock.sheep.push(createSheep(w, h));
    flock.spawnTimer = rand(1.2, 2.8);
  }

  const fenceX = 0.5 * w;
  for (let n = 0; n < flock.sheep.length; n++) {
    const s = flock.sheep[n];
    s.t += dt;
    s.legTimer += dt;
    const airborne = s.state === SheepState.JUMPING;
    const landing = s.state === SheepState.LANDING;
    const takeoffX = fenceX - 95 + s.cachedJumpVar;
    const runUpStart = takeoffX - RUN_UP;
    const rush = s.state === SheepState.WALKING_IN && s.x > runUpStart ? (s.x - runUpStart) / RUN_UP : 0;
    const pace = (1 + 0.8 * rush * rush) * s.cachedSpeed;
    const legInterval =
      s.state === SheepState.STUCK || s.state === SheepState.STRUGGLING ? 0.025 : 0.045 / pace;
    if (!airborne && !landing && s.legTimer > legInterval) {
      s.legFrame = (s.legFrame + 1) % 8;
      s.legTimer = 0;
    }

    switch (s.state) {
      case SheepState.WALKING_IN:
        s.x += WALK_SPEED * speedScale * pace * dt;
        if (s.x >= takeoffX) {
          s.state = SheepState.ANTICIPATION;
          s.t = 0;
          s.jumpStartX = s.x;
          s.jumpEndX = fenceX + 95 + 40;
        }
        break;
      case SheepState.ANTICIPATION: {
        const crouch = ANTICIPATION_DURATION * (0.5 + 0.5 * Math.sin(5.1 * s.wobble) + 0.5);
        const ease = 1 - s.t / crouch;
        s.x += WALK_SPEED * speedScale * 1.8 * ease * 0.3 * dt;
        if (s.t >= crouch) {
          s.state = SheepState.JUMPING;
          s.t = 0;
          s.jumpY = 0;
          s.jumpStartX = s.x;
          s.willStuck = flock.count >= 5 && Math.random() < 0.15;
          if (s.willStuck) {
            const apex = RAIL_TOP - 0.15 * s.size;
            s.vy = -Math.sqrt(2 * GRAVITY * apex);
          } else {
            s.vy = -JUMP_VELOCITY;
          }
        }
        break;
      }
      case SheepState.JUMPING: {
        s.vy += GRAVITY * dt;
        s.jumpY += s.vy * dt;
        s.x += ((s.jumpEndX - s.jumpStartX) / JUMP_DURATION) * dt;
        if (s.willStuck && s.x >= fenceX - 5 && s.vy > 0) {
          sfx.thump(s.x / w, 0.55);
          s.state = SheepState.STUCK;
          s.t = 0;
          s.x = fenceX;
          s.jumpY = -RAIL_TOP + 0.3 * s.size;
          s.vy = 0;
          break;
        }
        if (s.jumpY >= 0 && s.t > 0.05) {
          sfx.thump(s.x / w, s.size / 54);
          s.jumpY = 0;
          s.vy = 0;
          s.state = SheepState.LANDING;
          s.t = 0;
          flock.count++;
        }
        break;
      }
      case SheepState.STUCK:
        if (s.t >= STUCK_DURATION) {
          s.state = SheepState.STRUGGLING;
          s.t = 0;
        }
        break;
      case SheepState.STRUGGLING: {
        const shove = 35 * Math.max(0, Math.sin(14 * s.t));
        s.x += (15 + shove) * speedScale * dt;
        if (s.t >= STRUGGLE_DURATION) {
          s.state = SheepState.TUMBLE;
          s.t = 0;
          s.vy = 0;
        }
        break;
      }
      case SheepState.TUMBLE:
        s.vy += 0.8 * GRAVITY * dt;
        s.jumpY += s.vy * dt;
        s.x += 60 * speedScale * dt;
        if (s.jumpY >= 0) {
          sfx.thump(s.x / w, 1.15);
          s.jumpY = 0;
          s.vy = 0;
          s.state = SheepState.LANDING;
          s.t = 0;
          flock.count++;
        }
        break;
      case SheepState.LANDING:
        if (s.t >= LANDING_DURATION) {
          s.state = SheepState.WALKING_OUT;
          s.t = 0;
        }
        break;
      case SheepState.WALKING_OUT:
        s.x += WALK_SPEED * speedScale * dt;
        if (s.x > w + 2 * s.size) {
          let entranceClear = true;
          for (let i = 0; i < flock.sheep.length; i++) {
            if (i !== n && flock.sheep[i].x < 108) {
              entranceClear = false;
              break;
            }
          }
          if (entranceClear) recycle(s, w, h);
        }
        break;
    }

    if (
      s.state !== SheepState.JUMPING &&
      s.state !== SheepState.STUCK &&
      s.state !== SheepState.STRUGGLING &&
      s.state !== SheepState.TUMBLE
    ) {
      s.y = groundY(s.x, w, h);
    }
  }
}
