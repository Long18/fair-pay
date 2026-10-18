import { sampleWaveHeight } from "../wave-height";
import { pondSound } from "../sound";

export type DuckColor = "pink" | "yellow" | "green" | "blue";

export type EntityVariant =
  | { kind: "duck"; color: DuckColor; mallard: boolean }
  | { kind: "fish" }
  | { kind: "person"; color: DuckColor };

export type PondEntity = {
  id: number;
  variant: EntityVariant;
  nx: number;
  ny: number;
  offsetY: number;
  rotation: number;
  scale: number;
  opacity: number;
  heading: number;
  speed: number;
  paddleIntensity: number;
  turnRate: number;
  action: "float" | "paddle" | "leaving" | "drowning";
  actionEnd: number;
  phase: number;
  spawnTime: number;
  lastRipple: number;
  speedBoost: number;
  waveVx: number;
  waveVy: number;
};

export type FoodItem = {
  id: number;
  nx: number;
  ny: number;
  startTime: number;
  arrivedTime: number | null;
  /** Normalized Y where pellets arc from (above water). */
  dropFromY: number;
};

export type FoodVisual = {
  foodId: number;
  pellets: Array<{ x: number; y: number; size: number; hue: number; blur: number }>;
};

export type PondSceneState = {
  entities: PondEntity[];
  foods: FoodItem[];
  foodVisuals: FoodVisual[];
  nextEntityId: number;
  nextFoodId: number;
  fishSpawnCounter: number;
};

const DUCK_COLORS: DuckColor[] = ["pink", "yellow", "green", "blue"];
const BOID_R2 = 0.2 * 0.2;
const SEP_R2 = 0.06 * 0.06;

let nextId = 0;

function lerpAngle(from: number, to: number, t: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return from + d * t;
}

function clampEntity(e: PondEntity) {
  const edge = e.nx < 0.03 || e.nx > 0.97 || e.ny < 0.03 || e.ny > 0.97;
  e.nx = Math.max(0.03, Math.min(0.97, e.nx));
  e.ny = Math.max(0.03, Math.min(0.97, e.ny));
  if (edge && (e.variant.kind === "duck" || e.variant.kind === "fish")) {
    e.heading = Math.atan2(0.5 - e.ny, 0.5 - e.nx) + (Math.random() - 0.5) * 0.6;
  }
}

function boidForces(entities: PondEntity[], self: PondEntity) {
  let fx = 0;
  let fy = 0;
  let count = 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const o of entities) {
    if (o.id === self.id) continue;
    const dx = o.nx - self.nx;
    const dy = o.ny - self.ny;
    const d2 = dx * dx + dy * dy;
    if (d2 > BOID_R2 || d2 < 1e-6) continue;
    count++;
    sinSum += Math.sin(o.heading);
    cosSum += Math.cos(o.heading);
    if (d2 < SEP_R2) {
      const d = Math.sqrt(d2);
      const push = (0.06 - d) / 0.06;
      fx -= (dx / d) * push;
      fy -= (dy / d) * push;
    }
  }
  if (count === 0) return { fx: 0, fy: 0, alignH: null };
  const cx = entities.reduce((s, e) => s + e.nx, 0) / entities.length;
  const cy = entities.reduce((s, e) => s + e.ny, 0) / entities.length;
  fx += (cx - self.nx) * 0.008;
  fy += (cy - self.ny) * 0.008;
  const alignH = Math.atan2(sinSum / count, cosSum / count);
  return { fx: fx * 0.03, fy: fy * 0.03, alignH };
}

export function createPondState(): PondSceneState {
  return {
    entities: [],
    foods: [],
    foodVisuals: [],
    nextEntityId: 0,
    nextFoodId: 0,
    fishSpawnCounter: 0,
  };
}

export function spawnDuck(state: PondSceneState, nx: number, ny: number, time: number) {
  const active = state.entities.filter(
    (e) => e.action !== "leaving" && e.opacity > 0 && e.variant.kind === "duck",
  );
  if (active.length >= 15) {
    const oldest = active[0];
    oldest.action = "leaving";
    oldest.actionEnd = time + 4;
    oldest.speed = 1.2;
    oldest.speedBoost = 1.5;
  }
  const heading = Math.random() * Math.PI * 2;
  state.entities.push({
    id: nextId++,
    variant: {
      kind: "duck",
      color: DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)],
      mallard: Math.random() < 0.06,
    },
    nx,
    ny,
    offsetY: 0,
    rotation: (heading * 180) / Math.PI,
    scale: 0,
    opacity: 1,
    heading,
    speed: 0,
    paddleIntensity: 0,
    turnRate: (Math.random() - 0.5) * 0.6,
    action: "float",
    actionEnd: time + 1 + Math.random() * 2,
    phase: Math.random() * 100,
    spawnTime: time,
    lastRipple: 0,
    speedBoost: 1,
    waveVx: 0,
    waveVy: 0,
  });
}

export function spawnPerson(
  state: PondSceneState,
  nx: number,
  ny: number,
  time: number,
) {
  const heading = Math.random() * Math.PI * 2;
  state.entities.push({
    id: nextId++,
    variant: {
      kind: "person",
      color: DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)],
    },
    nx,
    ny,
    offsetY: 0,
    rotation: 0,
    scale: 0,
    opacity: 1,
    heading,
    speed: 0,
    paddleIntensity: 0,
    turnRate: 0,
    action: "float",
    actionEnd: time + 3 + Math.random() * 4,
    phase: Math.random() * 100,
    spawnTime: time,
    lastRipple: 0,
    speedBoost: 1,
    waveVx: 0,
    waveVy: 0,
  });
}

export function spawnFish(state: PondSceneState, nx: number, ny: number, time: number) {
  const heading = Math.random() * Math.PI * 2;
  state.entities.push({
    id: nextId++,
    variant: { kind: "fish" },
    nx,
    ny,
    offsetY: 0,
    rotation: (heading * 180) / Math.PI,
    scale: 0,
    opacity: 1,
    heading,
    speed: 0,
    paddleIntensity: 0,
    turnRate: 0,
    action: "paddle",
    actionEnd: time + 1 + Math.random() * 2,
    phase: Math.random() * 100,
    spawnTime: time,
    lastRipple: 0,
    speedBoost: 1,
    waveVx: 0,
    waveVy: 0,
  });
}

export function dropFood(
  state: PondSceneState,
  nx: number,
  ny: number,
  time: number,
  onRipple: (nx: number, ny: number, amp?: number) => void,
): { spawnedFish: boolean } {
  state.fishSpawnCounter++;
  if (state.fishSpawnCounter % 4 === 0) {
    spawnFish(state, nx, ny, time);
    onRipple(nx, ny, 0.5);
    pondSound.surface(nx);
    return { spawnedFish: true };
  }
  const foodId = state.nextFoodId++;
  const dropFromY = -0.08 - Math.random() * 0.06;
  state.foods.push({
    id: foodId,
    nx,
    ny,
    startTime: time,
    arrivedTime: null,
    dropFromY,
  });
  state.foodVisuals.push({
    foodId,
    pellets: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({
      x: nx + (Math.random() - 0.5) * 0.08,
      y: ny + (Math.random() - 0.5) * 0.08,
      size: 5 + Math.random() * 6,
      hue: 28 + Math.random() * 16,
      blur: 2 + Math.random() * 2,
    })),
  });
  onRipple(nx, ny);
  pondSound.pellets(nx);
  return { spawnedFish: false };
}

export function stepPondSimulation(
  state: PondSceneState,
  time: number,
  dt: number,
  aspect: number,
  onRipple: (nx: number, ny: number, amp?: number) => void,
) {
  const smooth = 1 - Math.pow(0.01, dt);
  const ducks = state.entities.filter((e) => e.variant.kind === "duck");
  const fish = state.entities.filter((e) => e.variant.kind === "fish");

  for (const food of state.foods) {
    const visual = state.foodVisuals.find((v) => v.foodId === food.id);
    if (!visual) continue;
    const flyT = Math.min(1, (time - food.startTime) / 0.55);
    const ease = 1 - (1 - flyT) ** 3;
    const fromY = food.dropFromY;
    for (let i = 0; i < visual.pellets.length; i++) {
      const p = visual.pellets[i];
      const ox = (i % 5) * 0.012 - 0.024;
      p.x = food.nx + ox;
      p.y = fromY + (food.ny - fromY) * ease;
    }
    if (flyT >= 1 && food.arrivedTime === null) {
      food.arrivedTime = time;
      onRipple(food.nx, food.ny, 0.45);
    }
  }

  for (const e of state.entities) {
    if (e.action === "leaving") {
      const progress = Math.min(1, (time - (e.actionEnd - 4)) / 4);
      const vx = 0.08 * Math.cos(e.heading) * e.speed * e.speedBoost;
      const vy = 0.08 * Math.sin(e.heading) * e.speed * e.speedBoost;
      e.nx += vx * dt;
      e.ny += vy * dt;
      if (progress > 0.5) {
        const t = (progress - 0.5) / 0.5;
        e.scale = Math.max(0, 1 - 0.7 * t);
        e.opacity = Math.max(0, 1 - t);
      }
      continue;
    }

    if (e.variant.kind === "person") {
      const personAge = time - e.spawnTime;
      if (personAge < 0.35) {
        const t = personAge / 0.35;
        e.scale = t < 0.6 ? (t / 0.6) * 1.1 : 1.1 - ((t - 0.6) / 0.4) * 0.1;
      } else if (e.scale < 1) {
        e.scale = 1;
      }
      if (e.action === "drowning") {
        e.offsetY += (2.5 - e.offsetY) * Math.min(1, dt * 2);
        e.opacity = Math.max(0, e.opacity - dt * 0.35);
        continue;
      }
      const wave = sampleWaveHeight(e.nx, e.ny, time, aspect);
      e.offsetY += (0.6 * wave.height - e.offsetY) * smooth;
      if (time > e.actionEnd) {
        e.action = "leaving";
        e.actionEnd = time + 5;
        e.heading = Math.atan2(-0.1, Math.random() - 0.5);
        e.speed = 0.6;
      }
      e.nx += Math.cos(e.heading) * 0.02 * dt;
      e.ny += Math.sin(e.heading) * 0.02 * dt;
      clampEntity(e);
      const crowd = state.entities.filter(
        (o) => o.variant.kind === "duck" && o.action !== "leaving",
      ).length;
      if (crowd > 12 && Math.random() < 0.002) {
        e.action = "drowning";
        e.actionEnd = time + 3;
      }
      continue;
    }

    const age = time - e.spawnTime;
    if (age < 0.35) {
      const t = age / 0.35;
      e.scale = t < 0.6 ? (t / 0.6) * 1.15 : 1.15 - ((t - 0.6) / 0.4) * 0.15;
    } else {
      e.scale = 1;
    }

    const wave = sampleWaveHeight(e.nx, e.ny, time, aspect);
    e.offsetY += (0.8 * wave.height - e.offsetY) * smooth;
    const wLerp = Math.min(1, 3 * dt);
    e.waveVx += (-wave.slopeX * 0.006 - e.waveVx) * wLerp;
    e.waveVy += (-wave.slopeY * 0.006 - e.waveVy) * wLerp;

    if (e.variant.kind === "fish") {
      let targetX = 0.5;
      let targetY = 0.5;
      let minD = Infinity;
      for (const f of state.foods) {
        if (f.arrivedTime !== null) continue;
        const dx = f.nx - e.nx;
        const dy = f.ny - e.ny;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD) {
          minD = d2;
          targetX = f.nx;
          targetY = f.ny;
        }
      }
      const dx = targetX - e.nx;
      const dy = targetY - e.ny;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.01) {
        e.heading = Math.atan2(dy, dx) + 0.12 * Math.sin(e.phase + 2 * time);
        e.action = "paddle";
      }
      e.speed += ((dist < 0.06 ? 1.8 : 0.4) - e.speed) * Math.min(1, dt * 8);
      e.paddleIntensity = e.speed > 0.5 ? 1 : 0.2;
      const move = 0.06 * e.speed;
      e.nx += (Math.cos(e.heading) * move + e.waveVx) * dt;
      e.ny += (Math.sin(e.heading) * move + e.waveVy) * dt;
      if (e.speed > 0.5 && time - e.lastRipple > 0.2) {
        onRipple(e.nx - 0.015 * Math.cos(e.heading), e.ny - 0.015 * Math.sin(e.heading), 0.35);
        e.lastRipple = time;
      }
      clampEntity(e);
      continue;
    }

    if (e.variant.kind === "duck") {
      let foodTarget: FoodItem | null = null;
      let foodD2 = Infinity;
      for (const f of state.foods) {
        if (f.arrivedTime === null && time - f.startTime < 0.5) continue;
        const dx = f.nx - e.nx;
        const dy = f.ny - e.ny;
        const d2 = dx * dx + dy * dy;
        if (d2 < foodD2 && d2 < 0.12 * 0.12) {
          foodD2 = d2;
          foodTarget = f;
        }
      }
      const { alignH } = boidForces(ducks, e);
      if (foodTarget) {
        e.action = "paddle";
        e.heading = Math.atan2(foodTarget.ny - e.ny, foodTarget.nx - e.nx);
        e.actionEnd = time + 1.5;
        e.speed = Math.min(1.2, e.speed + dt * 2);
      } else if (time > e.actionEnd) {
        if (e.action === "float") {
          e.action = "paddle";
          e.turnRate = (Math.random() - 0.5) * 0.5;
          const dx = 0.5 - e.nx;
          const dy = 0.5 - e.ny;
          e.heading =
            Math.sqrt(dx * dx + dy * dy) > 0.25
              ? Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8
              : alignH !== null
                ? alignH + (Math.random() - 0.5) * 0.4
                : e.heading + (Math.random() - 0.5) * Math.PI * 0.7;
          e.actionEnd = time + 2 + Math.random() * 3;
        } else {
          e.action = "float";
          e.actionEnd = time + 2 + Math.random() * 4;
        }
      }

      const paddling = e.action === "paddle";
      const targetSpeed = paddling ? 0.8 + 0.2 * Math.sin(e.phase) : 0;
      e.speed += (targetSpeed - e.speed) * Math.min(1, 2.5 * dt);
      e.paddleIntensity += ((paddling ? 1 : 0) - e.paddleIntensity) * Math.min(1, 3 * dt);
      e.speedBoost += (1 - e.speedBoost) * Math.min(1, 1.5 * dt);

      let turn = e.turnRate;
      if (alignH !== null && e.paddleIntensity > 0.1) {
        turn += 1.2 * Math.atan2(Math.sin(alignH - e.heading), Math.cos(alignH - e.heading)) * e.paddleIntensity;
      }

      e.heading += turn * dt;
      const move = 0.05 * e.speed * e.speedBoost;
      const dx = Math.cos(e.heading) * move + e.waveVx;
      const dy = Math.sin(e.heading) * move + e.waveVy;
      e.nx += dx * dt;
      e.ny += dy * dt;

      if (Math.sqrt(dx * dx + dy * dy) > 0.0003) {
        const targetRot =
          (Math.atan2(dx, -dy) * 180) / Math.PI +
          (e.paddleIntensity > 0.1 ? 0.8 * Math.sin(5 * time + e.phase) * e.paddleIntensity : 0);
        e.rotation = lerpAngle(e.rotation, targetRot, e.speed > 0.1 ? 0.18 : 0.04);
      }

      for (const f of state.foods) {
        if (f.arrivedTime !== null) continue;
        const ddx = f.nx - e.nx;
        const ddy = f.ny - e.ny;
        if (ddx * ddx + ddy * ddy < 0.045 * 0.045) {
          f.arrivedTime = time;
          pondSound.chirp(e.nx);
          break;
        }
      }

      if (e.speed > 0.15 && time - e.lastRipple > 0.3) {
        const rx = e.nx - 0.02 * Math.cos(e.heading);
        const ry = e.ny - 0.02 * Math.sin(e.heading);
        if (rx > 0.02 && rx < 0.98 && ry > 0.02 && ry < 0.98) {
          onRipple(rx, ry, 0.55);
          e.lastRipple = time;
        }
      }
      clampEntity(e);
    }
  }

  for (const f of state.foods) {
    if (f.arrivedTime !== null && time - f.arrivedTime > 0.05) {
      const eaten = state.entities.some(
        (e) =>
          e.variant.kind === "duck" &&
          (e.nx - f.nx) ** 2 + (e.ny - f.ny) ** 2 < 0.04 * 0.04,
      );
      if (eaten) {
        state.foods = state.foods.filter((x) => x.id !== f.id);
        state.foodVisuals = state.foodVisuals.filter((v) => v.foodId !== f.id);
        continue;
      }
    }
    if (f.arrivedTime !== null && time - f.arrivedTime > 2.5) {
      state.foods = state.foods.filter((x) => x.id !== f.id);
      state.foodVisuals = state.foodVisuals.filter((v) => v.foodId !== f.id);
    }
  }

  state.entities = state.entities.filter((e) => e.opacity > 0);

  if (fish.length === 0 && ducks.length >= 2 && Math.random() < 0.0008) {
    spawnFish(state, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, time);
  }

  const people = state.entities.filter((e) => e.variant.kind === "person");
  if (
    people.length === 0 &&
    ducks.length >= 4 &&
    Math.random() < 0.0004 * dt * 60
  ) {
    spawnPerson(
      state,
      0.25 + Math.random() * 0.5,
      0.35 + Math.random() * 0.3,
      time,
    );
  }
}
