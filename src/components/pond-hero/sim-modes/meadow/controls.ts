import { MAX_SHEEP, drop, moveDrag, pickUp, resetSound, spawnSheep, type MeadowWorld } from "./simulation";
import { meadowTerrainHeight, type Point } from "./world";

/** Off-screen or tab hidden: silence queued sounds and hide the landing marker. */
export function quietWorld(world: MeadowWorld) {
  resetSound(world.sound);
  world.aimVisible = false;
}

/** Keyboard focus left: hide the marker and release any carried sheep. */
export function blurWorld(world: MeadowWorld) {
  world.aimVisible = false;
  drop(world);
}

export function showAim(world: MeadowWorld) {
  world.aimVisible = true;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-8, 0],
  ArrowRight: [8, 0],
  ArrowUp: [0, -8],
  ArrowDown: [0, 8],
};

export type KeyOutcome = "ignored" | "handled" | "spawned" | "full" | "empty";

/** Keyboard play: arrows move the marker, G picks up, Enter/Space drops or adds, Escape releases. */
export function meadowKey(world: MeadowWorld, key: string, repeat: boolean): KeyOutcome {
  const arrow = ARROWS[key];
  if (arrow) {
    world.target.x = Math.max(140, Math.min(390, world.target.x + arrow[0]));
    world.target.y = Math.max(400, Math.min(620, world.target.y + arrow[1]));
    if (world.drag.index >= 0) moveDrag(world, world.target.x, world.target.y);
    world.aimVisible = true;
    return "handled";
  }
  if (key.toLowerCase() === "g") {
    const index = sheepNear(world, world.target.x, world.target.y, 6);
    if (index >= 0) pickUp(world, index);
    return "handled";
  }
  if (key === "Escape") {
    drop(world);
    return "handled";
  }
  if (key !== "Enter" && key !== " ") return "ignored";
  if (repeat) return "handled";
  world.aimVisible = true;
  if (world.drag.index >= 0) {
    let onto = -1;
    for (let i = 0; i < world.members.length; i++) {
      if (
        i !== world.drag.index &&
        world.members[i].member.kind === "sheep" &&
        Math.hypot(world.members[i].pose.x - world.target.x, world.members[i].pose.y - world.target.y) < 3
      )
        onto = i;
    }
    drop(world, onto);
    return "handled";
  }
  if (spawnNearTarget(world) >= 0) return "spawned";
  return world.sheepCount >= MAX_SHEEP ? "full" : "empty";
}

/** Nearest sheep to the keyboard landing marker within `reach`. */
export function sheepNear(world: MeadowWorld, x: number, y: number, reach: number, skip = -1): number {
  let best = -1;
  let bestDist = reach;
  for (let i = 0; i < world.members.length; i++) {
    if (i === skip || world.members[i].member.kind !== "sheep") continue;
    const d = Math.hypot(world.members[i].pose.x - x, world.members[i].pose.y - y);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/** Keyboard drop: spiral out from the marker until free grass is found. */
export function spawnNearTarget(world: MeadowWorld): number {
  for (let k = 0; k < 25; k++) {
    const angle = 2.3999632297 * k;
    const r = k ? 3.6 * Math.sqrt(k) : 0;
    const index = spawnSheep(world, world.target.x + Math.cos(angle) * r, world.target.y + Math.sin(angle) * r);
    if (index >= 0) return index;
    if (world.sheepCount >= MAX_SHEEP) break;
  }
  return -1;
}

/** Bisect a ray (in meadow space) against the terrain lifted by `offset`. */
export function rayToGround(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  out: Point,
  offset = 0,
): boolean {
  if (dir.y >= -0.001) return false;
  let near = Math.max(0, (80 + offset - origin.y) / dir.y);
  let far = (-10 + offset - origin.y) / dir.y;
  if (far < near) return false;
  for (let i = 0; i < 24; i++) {
    const mid = (near + far) / 2;
    const x = origin.x + dir.x * mid;
    const z = origin.z + dir.z * mid;
    if (origin.y + dir.y * mid > meadowTerrainHeight(x, z) + offset) near = mid;
    else far = mid;
  }
  out.x = origin.x + (dir.x * (near + far)) / 2;
  out.y = origin.z + (dir.z * (near + far)) / 2;
  return Number.isFinite(out.x + out.y);
}

/** Ray vs. sheep ellipsoids; returns the nearest sheep index or -1. */
export function pickSheep(
  world: MeadowWorld,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  skip = -1,
  slop = 0,
): number {
  let best = -1;
  let bestT = Infinity;
  for (let i = 0; i < world.members.length; i++) {
    const actor = world.members[i];
    const p = actor.pose;
    if (i === skip || actor.member.kind !== "sheep") continue;
    const rx = Math.max(0.5, 1.05 * p.sx) + slop;
    const ry = Math.max(0.6, 0.85 * p.sy) + slop;
    const rz = Math.max(0.5, 0.8 * p.sz) + slop;
    const ox = (origin.x - p.x) / rx;
    const oy = (origin.y - meadowTerrainHeight(p.x, p.y) - p.z - 0.8 * p.sy) / ry;
    const oz = (origin.z - p.y) / rz;
    const dx = dir.x / rx;
    const dy = dir.y / ry;
    const dz = dir.z / rz;
    const a = dx * dx + dy * dy + dz * dz;
    const b = ox * dx + oy * dy + oz * dz;
    const disc = b * b - a * (ox * ox + oy * oy + oz * oz - 1);
    if (a <= 0 || disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / a;
    if (t >= 0 && t < bestT) {
      bestT = t;
      best = i;
    }
  }
  return best;
}
