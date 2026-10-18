import { FIRST_SHEEP, MEADOW_BANDS, idlePose, meadowPose, type Band, type Member, type Pose } from "./bands";
import {
  MEADOW_CENTER,
  MEADOW_ROCKS,
  MEADOW_SUBJECT_SCALE,
  MEADOW_TREES,
  MEADOW_TROUGH,
  keepOffTrees,
  keepOffWalls,
  meadowPath,
  meadowTerrainHeight,
  nearestWall,
  pondDepth,
  wallHit,
  type Point,
} from "./world";

export const MAX_SHEEP = 192;
export const DUST_COUNT = 96;
export const RING_COUNT = 12;
const NEWBORN_TINTS = ["#fff9ed", "#f6ecd8", "#fdfbf4", "#eee5d2"];

type Play = {
  age: number;
  next: number;
  phase: number;
  cheerAt: number;
  cheerAge: number;
  turnAge: number;
  reactAfter: number;
};

type Jump = {
  age: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startLift: number;
  height: number;
  heading: number;
};

type StackWalk = { age: number; heading: number; speed: number; stride: number; homeX: number; homeY: number };

export type Actor = {
  band: Band;
  member: Member;
  slot: number;
  pose: Pose;
  play: Play;
  jump: Jump;
  stackWalk: StackWalk;
  homeX: number;
  homeY: number;
  lift: number;
  falling: boolean;
  velocity: number;
  landAge: number;
  dustDistance: number;
  waterWet: boolean;
  wadeDistance: number;
  /** Index of the sheep this one is stacked on, or -1. */
  support: number;
  bumpX: number;
  bumpY: number;
  following: boolean;
};

export type DustParticle = { age: number; x: number; y: number; vx: number; vy: number; size: number };
export type Ring = { x: number; y: number; at: number; amplitude: number };
export type SoundKind = "land" | "hoof" | "splash";
type SoundCue = { pending: boolean; x: number; y: number; strength: number };
type Follower = {
  index: number;
  dx: number;
  dy: number;
  speed: number;
  stride: number;
  delay: number;
  pace: number;
  acceleration: number;
  stop: number;
};

export type MeadowWorld = {
  time: number;
  members: Actor[];
  sheepCount: number;
  spawnSerial: number;
  dust: { next: number; particles: DustParticle[] };
  water: { next: number; rings: Ring[] };
  sound: { active: boolean; time: number; nextHoof: number; distance: number } & Record<SoundKind, SoundCue>;
  target: Point;
  aimVisible: boolean;
  drag: { index: number; x: number; y: number; followers: Follower[] };
};

export const SOUND_KINDS: SoundKind[] = ["land", "hoof", "splash"];

function createActor(band: Band, member: Member, slot: number, serial: number, time = 0): Actor {
  return {
    band,
    member,
    slot,
    pose: meadowPose(band, member, time, idlePose()),
    play: {
      age: -1,
      next: 1.5 + (serial % 8) * 1.7 + member.phase,
      phase: member.phase,
      cheerAt: -1,
      cheerAge: -1,
      turnAge: 0,
      reactAfter: 0,
    },
    jump: { age: -1, fromX: 0, fromY: 0, toX: 0, toY: 0, startLift: 0, height: 0, heading: 0 },
    stackWalk: { age: -1, heading: 0, speed: 0, stride: 0, homeX: 0, homeY: 0 },
    homeX: 0,
    homeY: 0,
    lift: 0,
    falling: false,
    velocity: 0,
    landAge: -1,
    dustDistance: 0,
    waterWet: false,
    wadeDistance: 0,
    support: -1,
    bumpX: 0,
    bumpY: 0,
    following: false,
  };
}

export function createMeadowWorld(): MeadowWorld {
  const perKind = new Map<string, number>();
  const cue = (): SoundCue => ({ pending: false, x: 0, y: 0, strength: 1 });
  return {
    time: 0,
    members: MEADOW_BANDS.flatMap((band, b) =>
      band.members.map((member, m) => {
        const slot = perKind.get(member.kind) ?? 0;
        perKind.set(member.kind, slot + 1);
        return createActor(band, member, slot, m + 3 * b);
      }),
    ),
    sheepCount: perKind.get("sheep") ?? 0,
    spawnSerial: 0,
    dust: {
      next: 0,
      particles: Array.from({ length: DUST_COUNT }, () => ({ age: -1, x: 0, y: 0, vx: 0, vy: 0, size: 0 })),
    },
    water: { next: 0, rings: Array.from({ length: RING_COUNT }, () => ({ x: 0, y: 0, at: -100, amplitude: 0 })) },
    sound: { active: false, time: 0, nextHoof: 0, distance: 0, land: cue(), hoof: cue(), splash: cue() },
    target: { ...MEADOW_CENTER },
    aimVisible: false,
    drag: { index: -1, x: 0, y: 0, followers: [] },
  };
}

/* ---------------------------------------------------------------- effects */

function emitDust(dust: MeadowWorld["dust"], x: number, y: number, heading: number, burst = false) {
  if (pondDepth(x, y) > 0.015) return;
  const count = burst ? 7 : 1;
  for (let i = 0; i < count; i += 1) {
    const slot = dust.next;
    dust.next = (slot + 1) % dust.particles.length;
    const p = dust.particles[slot];
    const angle = burst ? (i * Math.PI * 2) / count : heading + Math.PI + 0.5 * Math.sin(2.4 * slot);
    const offset = burst ? 0.65 : 0.35;
    p.x = x + Math.cos(angle) * offset;
    p.y = y + Math.sin(angle) * offset;
    p.age = 0;
    p.vx = Math.cos(angle) * (burst ? 3.2 : 1.1);
    p.vy = Math.sin(angle) * (burst ? 3.2 : 1.1);
    p.size = burst ? 0.9 : 0.7 + (slot % 3) * 0.08;
  }
}

export function resetSound(sound: MeadowWorld["sound"]) {
  sound.active = false;
  sound.distance = 0;
  for (const kind of SOUND_KINDS) sound[kind].pending = false;
}

function cue(sound: MeadowWorld["sound"], kind: SoundKind, x: number, y: number, strength = 1) {
  if (!sound.active) return;
  Object.assign(sound[kind], { pending: true, x, y, strength });
  if (kind === "land" || kind === "splash") {
    sound.hoof.pending = false;
    sound.nextHoof = sound.time + 0.24;
  }
}

export function addRing(water: MeadowWorld["water"], x: number, y: number, at: number, amplitude: number) {
  Object.assign(water.rings[water.next], { x, y, at, amplitude });
  water.next = (water.next + 1) % water.rings.length;
}

/* ------------------------------------------------------------- motion */

/** Gravity, landing squash and lift for a sheep (optionally resting on a stack at `floor`). */
function updateFall(actor: Actor, pose: Pose, dt: number, still: boolean, dust: MeadowWorld["dust"], floor = 0) {
  if (still) {
    actor.lift = floor;
    actor.falling = false;
    actor.velocity = 0;
    actor.landAge = -1;
    actor.dustDistance = 0;
  } else if (actor.falling) {
    actor.velocity -= 65 * dt;
    actor.lift = Math.max(floor, actor.lift + actor.velocity * dt);
    if (actor.lift === floor) {
      actor.falling = false;
      actor.landAge = 0;
      if (floor === 0) emitDust(dust, pose.x, pose.y, pose.heading, true);
    }
  } else if (actor.landAge >= 0) {
    actor.lift = floor;
    actor.landAge += dt;
    if (actor.landAge >= 0.36) actor.landAge = -1;
  }
  if (!actor.falling) actor.lift = floor;
  if (actor.falling) {
    pose.sy *= 1.08;
    pose.sx *= 0.96;
    pose.sz *= 0.96;
    pose.pitch += 0.06 * Math.sin(0.35 * actor.lift);
  }
  pose.z += actor.lift;
  const age = actor.landAge;
  if (age < 0) return;
  const squash = age < 0.12 ? 0.32 * Math.pow(1 - age / 0.12, 2) : -0.1 * Math.sin((Math.PI * (age - 0.12)) / 0.24);
  pose.sx *= 1 + 0.65 * squash;
  pose.sz *= 1 + 0.65 * squash;
  pose.sy *= 1 - squash;
  if (age >= 0.12) pose.z += 0.22 * Math.sin((Math.PI * (age - 0.12)) / 0.24);
}

function trailDust(actor: Actor, pose: Pose, moved: number, hopping: boolean, still: boolean, dust: MeadowWorld["dust"]) {
  if (hopping || still || actor.falling || actor.landAge >= 0) {
    actor.dustDistance = 0;
    return;
  }
  actor.dustDistance += moved;
  if (actor.dustDistance >= 1.7) {
    actor.dustDistance %= 1.7;
    emitDust(dust, pose.x - 0.6 * Math.cos(pose.heading), pose.y - 0.6 * Math.sin(pose.heading), pose.heading);
  }
}

/** Ease the heading towards the direction of travel since the previous frame. */
function faceTravel(pose: Pose, prevX: number, prevY: number, prevHeading: number, dt: number) {
  const dx = pose.x - prevX;
  const dy = pose.y - prevY;
  if (Math.hypot(dx, dy) < 0.002) {
    pose.heading = prevHeading;
    return;
  }
  const turn = Math.atan2(dy, dx) - prevHeading;
  pose.heading = prevHeading + Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-(20 * dt)));
}

const jumpWall = wallHit();

/** Hop over a dry-stone wall when walking into it: 0 none, 1 airborne, 2 just landed. */
function wallJump(jump: Jump, pose: Pose, prevX: number, prevY: number, dt: number, still: boolean, blocked: boolean): 0 | 1 | 2 {
  if (still || blocked) {
    jump.age = -1;
    jump.height = 0;
    return 0;
  }
  if (jump.age < 0) {
    const dx = pose.x - prevX;
    const dy = pose.y - prevY;
    const step = Math.hypot(dx, dy);
    if (step < 1e-4) return 0;
    nearestWall(prevX, prevY, jumpWall);
    const into = -(dx * jumpWall.nx + dy * jumpWall.ny) / step;
    if (jumpWall.distance > 3.4 || into < 0.12) return 0;
    const slide = Math.max(-1.8, Math.min(1.8, ((-(dx * jumpWall.ny) + dy * jumpWall.nx) / step) * 2));
    jump.fromX = prevX;
    jump.fromY = prevY;
    jump.toX = jumpWall.x - 3.4 * jumpWall.nx - jumpWall.ny * slide;
    jump.toY = jumpWall.y - 3.4 * jumpWall.ny + jumpWall.nx * slide;
    jump.heading = Math.atan2(jump.toY - prevY, jump.toX - prevX);
    jump.startLift = pose.z;
    jump.age = 0;
  }
  jump.age += dt;
  const t = Math.min(1, jump.age / 0.82);
  const arc = Math.sin(Math.PI * t);
  pose.x = jump.fromX + (jump.toX - jump.fromX) * t;
  pose.y = jump.fromY + (jump.toY - jump.fromY) * t;
  jump.height = Math.max(0, 3.5 * arc + jump.startLift * (1 - t));
  pose.z = jump.height;
  pose.heading = jump.heading;
  pose.pitch += 0.16 * Math.sin(2 * Math.PI * t);
  pose.sy *= 1 + 0.1 * arc;
  if (t < 1) return 1;
  jump.age = -1;
  jump.height = 0;
  pose.z = 0;
  return 2;
}

/** Slow down, float and leave ripples while a sheep is in the pond. */
function wade(world: MeadowWorld, actor: Actor, prevX: number, prevY: number, dt: number, still: boolean) {
  const pose = actor.pose;
  if (actor.support >= 0) return;
  let depth = pondDepth(pose.x, pose.y);
  if (!actor.falling && actor.landAge < 0 && actor.jump.age < 0 && depth > 0 && pose.z <= depth + 0.02 && !still && dt > 0) {
    const drag = 1 - 0.58 * Math.min(1, depth / 0.8);
    const beforeX = pose.x;
    const beforeY = pose.y;
    pose.x = prevX + (pose.x - prevX) * drag;
    pose.y = prevY + (pose.y - prevY) * drag;
    actor.homeX += pose.x - beforeX;
    actor.homeY += pose.y - beforeY;
    depth = pondDepth(pose.x, pose.y);
  }
  if (!(depth > 0.015 && pose.z <= depth + (actor.waterWet ? 0.22 : 0.02))) {
    actor.waterWet = false;
    actor.wadeDistance = 0;
    return;
  }
  const entering = !actor.waterWet;
  actor.waterWet = true;
  if (!actor.falling && actor.jump.age < 0) {
    const float = Math.max(0, depth - 0.48 * pose.sy);
    pose.z += Math.max(
      0,
      float + (still ? 0 : 0.035 * Math.sin(2.6 * world.time + 6 * actor.member.phase) * Math.min(1, depth)),
    );
    pose.roll += still ? 0 : 0.035 * Math.sin(1.7 * world.time + actor.slot) * Math.min(1, depth);
  }
  if (still) {
    actor.wadeDistance = 0;
    return;
  }
  if (entering) {
    addRing(world.water, pose.x, pose.y, world.time, 0.5);
    if (actor.landAge < 0) cue(world.sound, "splash", pose.x, pose.y, 0.26);
  }
  if (actor.falling || actor.landAge >= 0) return;
  actor.wadeDistance += Math.hypot(pose.x - prevX, pose.y - prevY);
  if (actor.wadeDistance >= 1.6) {
    actor.wadeDistance %= 1.6;
    addRing(
      world.water,
      pose.x - 0.65 * Math.cos(pose.heading),
      pose.y - 0.65 * Math.sin(pose.heading),
      world.time,
      0.15,
    );
  }
}

const pathSamples = meadowPath();
const landWall = wallHit();

/** True when grass at (x, y) is free for a new sheep. */
export function canLand(world: MeadowWorld, x: number, y: number): boolean {
  const blocked =
    !Number.isFinite(x + y) ||
    Math.abs(x - MEADOW_CENTER.x) > 210 ||
    Math.abs(y - MEADOW_CENTER.y) > 400 ||
    nearestWall(x, y, landWall).distance < 2.5 ||
    MEADOW_TREES.some((t) => Math.hypot(x - t.x, y - t.y) < 3 + t.scale) ||
    MEADOW_ROCKS.some(([rx, ry, r]) => Math.hypot(x - rx, y - ry) < r + 1.1) ||
    (Math.abs(x - MEADOW_TROUGH.x) < MEADOW_TROUGH.halfWidth + 1.1 &&
      Math.abs(y - MEADOW_TROUGH.y) < MEADOW_TROUGH.halfDepth + 1.1) ||
    pathSamples.some((p) => Math.hypot(x - p.x, y - p.y) < p.width + 0.65);
  return !blocked && !world.members.some((m) => m.member.kind !== "sheep" && Math.hypot(x - m.pose.x, y - m.pose.y) < 8);
}

/** Drop a new sheep from the sky; returns its index or -1. */
export function spawnSheep(world: MeadowWorld, x: number, y: number): number {
  if (world.sheepCount >= MAX_SHEEP || !canLand(world, x, y)) return -1;
  const serial = world.spawnSerial++;
  const k = (0.61803398875 * serial + 0.17) % 1;
  const member: Member = {
    ...FIRST_SHEEP,
    ahead: 0,
    side: 0,
    phase: k,
    radius: 1.2 + k,
    rate: 0,
    scale: FIRST_SHEEP.scale * (0.94 + 0.12 * k),
    shade: 0.96 + 0.04 * k,
    tint: NEWBORN_TINTS[serial % NEWBORN_TINTS.length],
  };
  const actor = createActor(
    {
      id: `meadow-newborn-${serial}`,
      region: "Meadow",
      motion: "graze",
      footing: "land",
      seconds: 38 + 10 * k,
      points: [{ x, y }],
      members: [member],
    },
    member,
    world.sheepCount++,
    serial,
    world.time,
  );
  actor.homeX = x - actor.pose.x;
  actor.homeY = y - actor.pose.y;
  let height = 24;
  for (const other of world.members) {
    if (other.member.kind === "sheep" && other.falling && Math.hypot(x - other.pose.x, y - other.pose.y) < 2.5) {
      height = Math.max(height, other.lift + 2.4);
    }
  }
  actor.pose.x = x;
  actor.pose.y = y;
  actor.pose.z = height;
  actor.lift = height;
  actor.falling = true;
  actor.play.next = world.time + 12 + 18 * k;
  world.sound.active = true;
  world.members.push(actor);
  return world.members.length - 1;
}

/** Re-anchor the grazing loop so the sheep continues from where it stands. */
function rehome(world: MeadowWorld, actor: Actor) {
  const x = actor.pose.x;
  const y = actor.pose.y;
  meadowPose(actor.band, actor.member, world.time, actor.pose);
  actor.homeX = x - actor.pose.x;
  actor.homeY = y - actor.pose.y;
  actor.pose.x = x;
  actor.pose.y = y;
}

function stackDepth(world: MeadowWorld, index: number): number {
  let depth = 0;
  while ((world.members[index]?.support ?? -1) >= 0 && depth < 4) {
    index = world.members[index].support;
    depth++;
  }
  return depth;
}

function isSupporting(world: MeadowWorld, index: number): boolean {
  for (const m of world.members) if (m.support === index) return true;
  return false;
}

function stackTop(world: MeadowWorld, index: number): number {
  for (let k = 0; k < 4; k++) {
    let above = -1;
    for (let i = 0; i < world.members.length; i++) {
      if (world.members[i].support === index) {
        above = i;
        break;
      }
    }
    if (above < 0) break;
    index = above;
  }
  return index;
}

function applyBump(actor: Actor, dt: number, still: boolean) {
  if (still) {
    actor.bumpX = actor.bumpY = 0;
    return;
  }
  if (Math.hypot(actor.bumpX, actor.bumpY) < 0.02) return;
  const x = actor.pose.x;
  const y = actor.pose.y;
  actor.pose.x += actor.bumpX * dt;
  actor.pose.y += actor.bumpY * dt;
  keepOffWalls(actor.pose.x, actor.pose.y, actor.pose);
  keepOffTrees(actor.pose.x, actor.pose.y, actor.pose);
  actor.homeX += actor.pose.x - x;
  actor.homeY += actor.pose.y - y;
  actor.pose.roll += Math.sin(7 * actor.play.phase) * Math.min(0.1, 0.006 * Math.hypot(actor.bumpX, actor.bumpY));
  actor.bumpX *= Math.exp(-8 * dt);
  actor.bumpY *= Math.exp(-8 * dt);
}

/** Lift a sheep (and send anything stacked on it tumbling); nearby sheep start following. */
export function pickUp(world: MeadowWorld, index: number): boolean {
  const actor = world.members[index];
  if (!actor || actor.member.kind !== "sheep" || world.drag.index >= 0) return false;
  const below = actor.support;
  let base = index;
  for (let k = 0; k < 4; k++) {
    let above = -1;
    for (let i = 0; i < world.members.length; i++) {
      if (world.members[i].support === base) {
        above = i;
        break;
      }
    }
    if (above < 0) break;
    const rider = world.members[above];
    rider.support = -1;
    rider.falling = true;
    rider.lift = rider.pose.z;
    rider.velocity = 0;
    rider.landAge = -1;
    const lift = rider.lift;
    rehome(world, rider);
    rider.pose.z = lift;
    base = above;
  }
  actor.support = -1;
  actor.falling = false;
  actor.velocity = 0;
  actor.landAge = -1;
  if (below >= 0 && world.members[below].support < 0 && !isSupporting(world, below)) rehome(world, world.members[below]);
  actor.waterWet = false;
  actor.wadeDistance = 0;
  actor.play.age = actor.jump.age = -1;
  actor.bumpX = actor.bumpY = 0;
  world.drag.index = index;
  world.drag.x = actor.pose.x;
  world.drag.y = actor.pose.y;
  world.drag.followers.length = 0;
  for (let i = 0; i < world.members.length; i++) {
    const other = world.members[i];
    const dx = other.pose.x - actor.pose.x;
    const dy = other.pose.y - actor.pose.y;
    if (
      i !== index &&
      other.member.kind === "sheep" &&
      !other.falling &&
      other.support < 0 &&
      !isSupporting(world, i) &&
      Math.hypot(dx, dy) < 22
    ) {
      other.following = true;
      other.bumpX = other.bumpY = 0;
      const k = (0.61803398875 * other.slot + 0.37 * other.member.phase) % 1;
      world.drag.followers.push({
        index: i,
        dx,
        dy,
        speed: 0,
        stride: other.member.phase * Math.PI * 2,
        delay: 0.02 + 0.35 * k,
        pace: 6.5 + 6 * k,
        acceleration: 12 + 15 * k,
        stop: 0.65 + 0.7 * k,
      });
    }
  }
  world.sound.active = true;
  return true;
}

export function moveDrag(world: MeadowWorld, x: number, y: number): boolean {
  if (world.drag.index < 0 || !canLand(world, x, y)) return false;
  world.drag.x = x;
  world.drag.y = y;
  return true;
}

/** Release the carried sheep, optionally onto another sheep's back (stacks up to 3 high). */
export function drop(world: MeadowWorld, onto = -1): boolean {
  const index = world.drag.index;
  const actor = world.members[index];
  if (!actor) return false;
  actor.pose.x = world.drag.x;
  actor.pose.y = world.drag.y;
  actor.pose.z = Math.max(6, actor.pose.z);
  if (
    onto >= 0 &&
    onto !== index &&
    world.members[onto]?.member.kind === "sheep" &&
    !world.members[onto].falling &&
    (onto = stackTop(world, onto)) !== index &&
    stackDepth(world, onto) < 3
  ) {
    const base = world.members[onto];
    actor.support = onto;
    actor.pose.x = base.pose.x;
    actor.pose.y = base.pose.y;
    actor.lift = Math.max(actor.pose.z, base.pose.z + 1.28 * base.pose.sy + 3);
  }
  if (actor.support < 0) actor.lift = Math.max(6, actor.pose.z);
  actor.falling = true;
  actor.velocity = 0;
  actor.landAge = -1;
  rehome(world, actor);
  actor.pose.z = actor.lift;
  for (const f of world.drag.followers) {
    const follower = world.members[f.index];
    const heading = follower.pose.heading;
    const z = follower.pose.z;
    follower.following = false;
    rehome(world, follower);
    follower.pose.heading = heading;
    follower.pose.z = z;
    follower.play.turnAge = 0.5;
  }
  world.drag.index = -1;
  world.drag.followers.length = 0;
  return true;
}

/* --------------------------------------------------------- frame update */

/** Nudge (or, when still, place) sheep away from a fresh landing. */
function scatterAround(world: MeadowWorld, lander: Actor, still: boolean) {
  for (const other of world.members) {
    if (
      other === lander ||
      other.member.kind !== "sheep" ||
      other.falling ||
      other.support >= 0 ||
      world.members[world.drag.index] === other
    )
      continue;
    const dx = other.pose.x - lander.pose.x;
    const dy = other.pose.y - lander.pose.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= 3.6) continue;
    const angle = dist > 0.01 ? Math.atan2(dy, dx) : 2.39996 * other.slot + 0.4;
    const push = 13 + (3.6 - dist) * 4;
    if (still) {
      other.pose.x += Math.cos(angle) * (3.8 - dist);
      other.pose.y += Math.sin(angle) * (3.8 - dist);
      keepOffWalls(other.pose.x, other.pose.y, other.pose);
      keepOffTrees(other.pose.x, other.pose.y, other.pose);
      rehome(world, other);
    } else {
      other.bumpX += Math.cos(angle) * push;
      other.bumpY += Math.sin(angle) * push;
      const speed = Math.hypot(other.bumpX, other.bumpY);
      if (speed > 30) {
        other.bumpX *= 30 / speed;
        other.bumpY *= 30 / speed;
      }
    }
    other.play.age = -1;
    other.play.next = world.time + 8;
    other.play.turnAge = 0.3;
  }
}

/** A landing makes one or two nearby sheep hop in sympathy. */
function rouseNeighbours(world: MeadowWorld, lander: Actor) {
  const seed = 1.73 * lander.slot + 0.41 * Math.floor(3 * world.time);
  let cheering = 0;
  for (const m of world.members) {
    if (
      m.member.kind === "sheep" &&
      (m.play.cheerAt >= 0 || m.play.cheerAge >= 0) &&
      Math.hypot(m.pose.x - lander.pose.x, m.pose.y - lander.pose.y) < 24
    )
      cheering++;
  }
  const wanted = Math.min(1 + (lander.slot % 2), Math.max(0, 2 - cheering));
  for (let k = 0; k < wanted; k++) {
    let pick: Actor | undefined;
    let bestScore = -Infinity;
    let pickDist = 0;
    for (let i = 0; i < world.members.length; i++) {
      const m = world.members[i];
      const play = m.play;
      if (
        m === lander ||
        m.member.kind !== "sheep" ||
        m.falling ||
        m.support >= 0 ||
        m.following ||
        i === world.drag.index ||
        isSupporting(world, i) ||
        m.jump.age >= 0 ||
        m.landAge >= 0 ||
        play.cheerAt >= 0 ||
        play.cheerAge >= 0 ||
        play.reactAfter > world.time
      )
        continue;
      const dist = Math.hypot(m.pose.x - lander.pose.x, m.pose.y - lander.pose.y);
      if (dist >= 24) continue;
      const score = 0.6 * Math.sin(12.9898 * m.slot + seed) - dist / 24;
      if (score > bestScore) {
        pick = m;
        bestScore = score;
        pickDist = dist;
      }
    }
    if (!pick) break;
    const delay = 0.18 + 0.025 * pickDist + 0.25 * pick.member.phase;
    pick.play.cheerAt = world.time + delay;
    pick.play.reactAfter = world.time + delay + 5 + 4 * pick.member.phase;
  }
}

const strollWall = wallHit();

/** A sheep carrying others on its back wanders slowly around its spot. */
function stackStroll(actor: Actor, dt: number, still: boolean) {
  const walk = actor.stackWalk;
  const pose = actor.pose;
  const phase = actor.member.phase;
  if (walk.age < 0) {
    walk.age = 0;
    walk.heading = pose.heading;
    walk.speed = 0;
    walk.homeX = pose.x;
    walk.homeY = pose.y;
  }
  if (still || dt <= 0) return;
  walk.age += dt;
  const cycle = walk.age % (5.8 + 2 * phase);
  walk.speed += ((cycle < 4 + phase ? 3.4 + 1.6 * phase : 0) - walk.speed) * (1 - Math.exp(-(3 * dt)));
  const x = pose.x;
  const y = pose.y;
  const heading = pose.heading;
  if (Math.hypot(x - walk.homeX, y - walk.homeY) > 14) walk.heading = Math.atan2(walk.homeY - y, walk.homeX - x);
  const desired = walk.heading + 0.65 * Math.sin(0.38 * walk.age + 6 * phase);
  const turn = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
  pose.heading += turn * (1 - Math.exp(-(2.5 * dt)));
  const cos = Math.cos(pose.heading);
  const sin = Math.sin(pose.heading);
  nearestWall(x + 3 * cos, y + 3 * sin, strollWall);
  if (strollWall.distance < 3 && cos * strollWall.nx + sin * strollWall.ny < 0) walk.heading += 3 * dt;
  pose.x += cos * walk.speed * dt;
  pose.y += sin * walk.speed * dt;
  const freeX = pose.x;
  const freeY = pose.y;
  keepOffWalls(pose.x, pose.y, pose);
  keepOffTrees(pose.x, pose.y, pose);
  if (Math.hypot(pose.x - freeX, pose.y - freeY) > 0.01) walk.heading += 5 * dt;
  faceTravel(pose, x, y, heading, dt);
  walk.stride += 2.1 * Math.hypot(pose.x - x, pose.y - y);
  const gait = walk.speed / 5;
  pose.z = 0.1 * Math.abs(Math.sin(walk.stride)) * gait;
  pose.roll += 0.1 * Math.sin(walk.stride) * gait;
  pose.pitch += 0.035 * Math.cos(2 * walk.stride) * gait;
}

/** Occasional frolic (hop out and back) or a sympathetic "cheer" hop; true while airborne. */
function playStep(play: Play, pose: Pose, time: number, dt: number, busy: boolean, landAge: number, still: boolean): boolean {
  play.turnAge = Math.max(0, play.turnAge - dt);
  if (still || busy || landAge >= 0) {
    play.age = play.cheerAge = play.cheerAt = -1;
    play.turnAge = 0;
    return false;
  }
  if (play.cheerAt >= 0 && time >= play.cheerAt && play.age < 0) {
    play.cheerAge = 0;
    play.cheerAt = -1;
  }
  if (play.cheerAge >= 0) {
    play.age = -1;
    play.cheerAge += dt;
    const t = Math.min(1, play.cheerAge / 0.65);
    const arc = Math.sin(Math.PI * t);
    pose.z += 1.8 * arc;
    pose.pitch += 0.16 * Math.sin(2 * Math.PI * t);
    pose.sy *= 1 + 0.1 * arc;
    if (t === 1) {
      play.cheerAge = -1;
      play.next = time + 12 + 14 * play.phase;
    }
    return arc > 0.05;
  }
  if (play.age < 0 && time >= play.next) {
    play.age = 0;
    play.next = time + 20 + 18 * play.phase;
  }
  if (play.age < 0) return false;
  play.turnAge = 0.25;
  play.age += dt;
  const t = Math.min(1, play.age / 2.2);
  const out = Math.sin(Math.PI * t) ** 2;
  const forward = 5 * out;
  const sideways = 2.2 * Math.sin(2 * Math.PI * t) * out;
  const heading = pose.heading;
  const hop = Math.max(0, Math.sin(4 * Math.PI * t)) ** 1.3;
  pose.x += Math.cos(heading) * forward - Math.sin(heading) * sideways;
  pose.y += Math.sin(heading) * forward + Math.cos(heading) * sideways;
  pose.z += 1.9 * hop;
  pose.pitch += 0.12 * Math.sin(4 * Math.PI * t);
  pose.sy *= 1 + 0.1 * hop;
  if (t === 1) play.age = -1;
  return hop > 0.05;
}

function followStep(world: MeadowWorld, f: Follower, dt: number, still: boolean) {
  const actor = world.members[f.index];
  const pose = actor.pose;
  if (actor.falling || actor.support >= 0 || still || dt <= 0) return;
  const x = pose.x;
  const y = pose.y;
  const heading = pose.heading;
  meadowPose(actor.band, actor.member, world.time, pose);
  pose.x = x;
  pose.y = y;
  pose.heading = heading;
  pose.z = 0;
  actor.play.age = actor.play.cheerAge = actor.play.cheerAt = -1;
  actor.play.next = world.time + 12;
  const dx = world.drag.x + f.dx - x;
  const dy = world.drag.y + f.dy - y;
  const dist = Math.hypot(dx, dy);
  const gap = Math.max(0, dist - f.stop);
  if (gap > 0) f.delay = Math.max(0, f.delay - dt);
  const sway = 0.9 + 0.1 * Math.sin(world.time * (1.2 + actor.member.phase) + 2.4 * actor.slot);
  const want = f.delay > 0 ? 0 : Math.min(f.pace * sway * (1 + Math.min(0.45, gap / 65)), 3 * gap);
  const accel = f.acceleration * dt;
  f.speed += Math.max(-(1.5 * accel), Math.min(accel, want - f.speed));
  const step = Math.min(gap, f.speed * dt);
  if (dist > 0) {
    pose.x += (dx / dist) * step;
    pose.y += (dy / dist) * step;
  }
  applyBump(actor, dt, false);
  keepOffTrees(pose.x, pose.y, pose);
  const hop = wallJump(actor.jump, pose, x, y, dt, false, false);
  if (!hop) {
    keepOffWalls(pose.x, pose.y, pose);
    const gait = Math.min(1, f.speed / f.pace);
    pose.z = 0.14 * Math.abs(Math.sin(f.stride)) * gait;
    pose.roll += 0.055 * Math.sin(f.stride) * gait;
  }
  wade(world, actor, x, y, dt, still);
  faceTravel(pose, x, y, heading, dt);
  const moved = Math.hypot(pose.x - x, pose.y - y);
  f.stride += 2.5 * moved;
  if (hop === 2) {
    emitDust(world.dust, pose.x, pose.y, pose.heading, true);
    cue(world.sound, pondDepth(pose.x, pose.y) > 0.015 ? "splash" : "land", pose.x, pose.y, 0.4);
  }
  trailDust(actor, pose, moved, hop === 1, false, world.dust);
}

function updateDrag(world: MeadowWorld, dt: number, still: boolean) {
  const actor = world.members[world.drag.index];
  if (!actor) return;
  const x = actor.pose.x;
  const y = actor.pose.y;
  const heading = actor.pose.heading;
  meadowPose(actor.band, actor.member, world.time, actor.pose);
  actor.pose.x = world.drag.x;
  actor.pose.y = world.drag.y;
  actor.pose.z = actor.lift = 6;
  faceTravel(actor.pose, x, y, heading, dt);
  actor.pose.roll = still ? 0 : 0.065 * Math.sin(4 * world.time);
  actor.pose.sy *= 1.06;
  for (const f of world.drag.followers) followStep(world, f, dt, still);
}

function updateStacks(world: MeadowWorld, dt: number, still: boolean) {
  for (let level = 1; level < 4; level++) {
    for (let i = 0; i < world.members.length; i++) {
      const rider = world.members[i];
      if (rider.support < 0 || stackDepth(world, i) !== level) continue;
      const base = world.members[rider.support];
      const wasFalling = rider.falling;
      meadowPose(rider.band, rider.member, world.time, rider.pose);
      const wobble = still ? 0 : 0.055 * Math.sin(1.8 * world.time + 0.7 * i);
      rider.pose.x = base.pose.x + wobble * level;
      rider.pose.y = base.pose.y + 0.4 * wobble;
      rider.pose.heading = base.pose.heading + wobble;
      rider.pose.roll += wobble;
      const floor =
        meadowTerrainHeight(base.pose.x, base.pose.y) +
        base.pose.z +
        base.member.scale * MEADOW_SUBJECT_SCALE * 1.28 -
        meadowTerrainHeight(rider.pose.x, rider.pose.y);
      rider.pose.z = 0;
      updateFall(rider, rider.pose, dt, still, world.dust, floor);
      if (wasFalling && !rider.falling) cue(world.sound, "land", rider.pose.x, rider.pose.y, 0.35);
    }
  }
}

function hoofStep(sound: MeadowWorld["sound"], dt: number, stride: number, x: number, y: number) {
  sound.time += dt;
  if (!sound.active || stride <= 0) {
    sound.distance = 0;
    return;
  }
  sound.distance += stride;
  if (sound.distance < 2.1 || sound.time < sound.nextHoof) return;
  sound.distance %= 2.1;
  sound.nextHoof = sound.time + 0.2;
  cue(sound, "hoof", x, y, 0.65);
}

/** Advance the whole herd by `delta` seconds (clamped); `still` freezes everything at t = 0. */
export function stepMeadow(world: MeadowWorld, delta: number, still = false) {
  const dt = still ? 0 : Math.min(0.05, Math.max(0, delta));
  world.time = still ? 0 : world.time + dt;
  for (const p of world.dust.particles) {
    if (p.age < 0) continue;
    p.age += dt;
    if (still || p.age >= 0.72) p.age = -1;
  }
  if (still) {
    for (const ring of world.water.rings) {
      ring.at = -100;
      ring.amplitude = 0;
    }
  }
  let loudest = 0;
  let loudX = 0;
  let loudY = 0;
  for (let i = 0; i < world.members.length; i++) {
    const actor = world.members[i];
    if (i === world.drag.index || actor.support >= 0 || actor.following) continue;
    const pose = actor.pose;
    const prevX = pose.x;
    const prevY = pose.y;
    const prevHeading = pose.heading;
    meadowPose(actor.band, actor.member, world.time, pose);
    pose.x += actor.homeX;
    pose.y += actor.homeY;
    if (actor.member.kind !== "sheep") continue;
    const carrying = isSupporting(world, i);
    if (actor.falling || actor.landAge >= 0 || carrying) {
      pose.x = prevX;
      pose.y = prevY;
      pose.heading = prevHeading;
      pose.z = 0;
    }
    const wasFalling = actor.falling;
    const impact = Math.abs(actor.velocity);
    updateFall(actor, pose, dt, still, world.dust);
    if (wasFalling && !actor.falling) {
      const { z, sx, sy, sz } = pose;
      rehome(world, actor);
      pose.z = z;
      pose.sx = sx;
      pose.sy = sy;
      pose.sz = sz;
      pose.heading = prevHeading;
      if (pondDepth(pose.x, pose.y) > 0.015) {
        if (!actor.waterWet) cue(world.sound, "splash", pose.x, pose.y, still ? 0.2 : 0.4);
      } else {
        cue(world.sound, "land", pose.x, pose.y, still ? 0.45 : Math.max(0.35, Math.min(1, (impact + 65 * dt) / 32)));
      }
      scatterAround(world, actor, still);
      if (!still) rouseNeighbours(world, actor);
    }
    if (carrying && !actor.falling && actor.landAge < 0) stackStroll(actor, dt, still);
    else actor.stackWalk.age = -1;
    let hopping = playStep(
      actor.play,
      pose,
      world.time,
      dt,
      actor.falling || actor.jump.age >= 0 || carrying,
      actor.landAge,
      still,
    );
    applyBump(actor, dt, still);
    if (!actor.falling && actor.jump.age < 0 && keepOffTrees(pose.x, pose.y, pose)) {
      actor.play.age = -1;
      actor.play.next = world.time + 12 + 10 * actor.member.phase;
      actor.play.turnAge = 0.25;
      rehome(world, actor);
    }
    const hop = wallJump(actor.jump, pose, prevX, prevY, dt, still, actor.falling || actor.landAge >= 0 || carrying);
    if (hop) {
      actor.play.age = -1;
      actor.play.next = world.time + 12 + 10 * actor.member.phase;
      hopping = hop === 1;
      if (hop === 2) {
        rehome(world, actor);
        actor.pose.z = 0;
        actor.landAge = 0;
        updateFall(actor, pose, 0, false, world.dust);
        emitDust(world.dust, pose.x, pose.y, pose.heading, true);
        cue(world.sound, pondDepth(pose.x, pose.y) > 0.015 ? "splash" : "land", pose.x, pose.y, 0.4);
      }
    }
    wade(world, actor, prevX, prevY, dt, still);
    if (!hop && !still && !actor.falling && actor.landAge < 0 && actor.play.turnAge > 0) {
      faceTravel(pose, prevX, prevY, prevHeading, dt);
    }
    const moved = Math.hypot(pose.x - prevX, pose.y - prevY);
    trailDust(actor, pose, moved, hopping, still, world.dust);
    if (!still && !actor.waterWet && !hopping && !actor.falling && actor.landAge < 0 && moved > loudest) {
      loudest = moved;
      loudX = pose.x;
      loudY = pose.y;
    }
  }
  updateDrag(world, dt, still);
  updateStacks(world, dt, still);
  hoofStep(world.sound, dt, loudest, loudX, loudY);
}

/** Dust puff transform for rendering. */
export function dustPose(
  p: DustParticle,
  out: { x: number; y: number; z: number; sx: number; sy: number; sz: number; heading: number; alpha: number },
) {
  const t = Math.min(1, Math.max(0, p.age / 0.72));
  out.x = p.x + p.vx * p.age;
  out.y = p.y + p.vy * p.age;
  out.z = meadowTerrainHeight(out.x, out.y) + 0.18 + 0.8 * p.age;
  out.sx = p.size * (0.55 + 1.45 * t);
  out.sy = 0.6 * out.sx;
  out.sz = 0.8 * out.sx;
  out.heading = Math.atan2(p.vy, p.vx);
  out.alpha = 0.36 * Math.pow(1 - t, 2);
  return out;
}
