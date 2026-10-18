import { sfx } from "../../audio/sfx";
import { antHoles, holeIndexNear } from "./ground";
import { pushZapBurst } from "./particles";
import type { Ant, AntCaste, AntState, Circle, Nest, Particle } from "./types";
import { angleDiff, dist2, turnToward } from "./util";

export const COLONY_SIZE = 24;
export const TRAIL_ANT_COUNT = 10;
const TRAIL_SPACING = 28;

/** Heading of the marching column (top-right → left). */
export const TRAIL_ANGLE = Math.atan2(0.3, -0.8999999999999999);

const SKITTISH: ReadonlySet<AntState> = new Set(["fleeing", "panicking", "greeting", "dodging", "alarmed"]);

export function createAnt(x: number, y: number, angle: number, emergeTimer = 0): Ant {
  const roll = Math.random();
  const { caste, size, baseSpeed } =
    roll < 0.3
      ? { caste: "minor" as AntCaste, size: 0.7 + 0.15 * Math.random(), baseSpeed: 36 * (0.9 + 0.2 * Math.random()) }
      : roll < 0.8
        ? { caste: "media" as AntCaste, size: 0.9 + 0.1 * Math.random(), baseSpeed: 28 * (0.9 + 0.2 * Math.random()) }
        : { caste: "major" as AntCaste, size: 1.05 + 0.15 * Math.random(), baseSpeed: 20 * (0.85 + 0.3 * Math.random()) };
  return {
    x,
    y,
    angle,
    speed: baseSpeed * (0.6 + 0.4 * Math.random()),
    targetSpeed: baseSpeed,
    meanderPhase: Math.random() * Math.PI * 2,
    meanderFreq:
      caste === "minor"
        ? 1 + 0.6 * Math.random()
        : caste === "major"
          ? 0.6 + 0.3 * Math.random()
          : 0.8 + 0.5 * Math.random(),
    meanderAmp:
      0.35 *
      (caste === "minor"
        ? 0.5 + 0.3 * Math.random()
        : caste === "major"
          ? 0.8 + 0.4 * Math.random()
          : 0.6 + 0.4 * Math.random()),
    turnTimer: 1 + 3 * Math.random(),
    targetAngle: angle,
    state: "wandering",
    stateTimer: 2 + 4 * Math.random(),
    prevState: "wandering",
    scanAngle: 0,
    legPhase: Math.random() * Math.PI * 2,
    burnProgress: 0,
    alive: true,
    burnDodged: false,
    timesHurt: 0,
    caste,
    size,
    baseSpeed,
    shade: Math.random(),
    phase: 100 * Math.random(),
    trail: [],
    trailTimer: 0,
    followTarget: -1,
    carryingFood: false,
    emergeTimer,
    enteringHole: -1,
    enterProgress: 0,
  };
}

/** New ant somewhere inside the field, or walking in from a random edge. */
export function spawnAnt(w: number, h: number, fromEdge = false): Ant {
  let x: number;
  let y: number;
  let angle: number;
  if (fromEdge) {
    const side = (4 * Math.random()) | 0;
    if (side === 0) {
      x = Math.random() * w;
      y = -12;
      angle = 0.5 * Math.PI;
    } else if (side === 1) {
      x = w + 12;
      y = Math.random() * h;
      angle = Math.PI;
    } else if (side === 2) {
      x = Math.random() * w;
      y = h + 12;
      angle = -(0.5 * Math.PI);
    } else {
      x = -12;
      y = Math.random() * h;
      angle = 0;
    }
  } else {
    x = 50 + Math.random() * (w - 100);
    y = 50 + Math.random() * (h - 100);
    angle = Math.random() * Math.PI * 2;
  }
  return createAnt(x, y, angle);
}

export function spawnFromHole(w: number, h: number): Ant {
  const holes = antHoles(w, h);
  const hole = holes[(Math.random() * holes.length) | 0];
  return createAnt(hole.x, hole.y, Math.random() * Math.PI * 2, 0.6);
}

function spawnQueen(w: number, h: number): Ant {
  const holes = antHoles(w, h);
  const hole = holes[(Math.random() * holes.length) | 0];
  const ant = createAnt(hole.x, hole.y, Math.random() * Math.PI * 2, 1.2);
  const baseSpeed = 20 * (0.6 + 0.2 * Math.random());
  Object.assign(ant, {
    caste: "queen",
    size: 2 + 0.4 * Math.random(),
    baseSpeed,
    speed: 0.3 * baseSpeed,
    targetSpeed: baseSpeed,
    meanderFreq: 0.4 + 0.2 * Math.random(),
    meanderAmp: 0.13999999999999999,
    shade: 0.8 + 0.2 * Math.random(),
    stateTimer: 6 + 8 * Math.random(),
    turnTimer: 2 + 3 * Math.random(),
  } satisfies Partial<Ant>);
  return ant;
}

export function frighten(ant: Ant, fromX: number, fromY: number) {
  if (ant.state === "fleeing" || ant.state === "panicking") return;
  ant.state = "fleeing";
  ant.stateTimer = 0.5 + 0.8 * Math.random();
  ant.targetAngle = Math.atan2(ant.y - fromY, ant.x - fromX);
  ant.timesHurt++;
  ant.followTarget = -1;
}

function nearestAnt(ants: Ant[], self: Ant): { ant: Ant; dist: number } | null {
  let best: Ant | null = null;
  let bestD = Infinity;
  for (const other of ants) {
    if (other === self || !other.alive) continue;
    const d = dist2(self.x, self.y, other.x, other.y);
    if (d < bestD) {
      bestD = d;
      best = other;
    }
  }
  return best ? { ant: best, dist: Math.sqrt(bestD) } : null;
}

function nearestScent(ants: Ant[], self: Ant): { x: number; y: number; angle: number } | null {
  let bestD = 2500;
  let bestDot: { x: number; y: number } | null = null;
  let owner: Ant | null = null;
  for (const other of ants) {
    if (other === self || !other.alive || other.trail.length < 3) continue;
    for (const dot of other.trail) {
      if (dot.age > 2.5) continue;
      const d = dist2(self.x, self.y, dot.x, dot.y);
      if (d < bestD) {
        bestD = d;
        bestDot = dot;
        owner = other;
      }
    }
  }
  return bestDot && owner ? { x: bestDot.x, y: bestDot.y, angle: owner.angle } : null;
}

function stepWandering(ant: Ant, ants: Ant[], dt: number) {
  ant.meanderPhase += ant.meanderFreq * Math.PI * 2 * dt;
  const wobble = Math.sin(ant.meanderPhase) * ant.meanderAmp;
  ant.angle = turnToward(ant.angle, ant.targetAngle + wobble, 4 * dt);
  if (ant.turnTimer <= 0) {
    ant.targetAngle += ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 1.4;
    ant.turnTimer = 0.8 + 2.5 * Math.random();
  }
  ant.targetSpeed = ant.baseSpeed * (0.7 + 0.1 * Math.random());
  ant.speed += (ant.targetSpeed - ant.speed) * dt * 3;
  if (ant.stateTimer > 0) return;
  const roll = Math.random();
  if (roll < 0.12) {
    ant.state = "scanning";
    ant.stateTimer = 0.6 + Math.random();
    ant.scanAngle = 0;
  } else if (roll < 0.22 && ant.caste === "minor") {
    ant.state = "foraging";
    ant.stateTimer = 5 + 6 * Math.random();
    ant.followTarget = -1;
  } else if (roll < 0.35) {
    const scent = nearestScent(ants, ant);
    if (scent) {
      ant.state = "trailing";
      ant.targetAngle = scent.angle;
      ant.stateTimer = 6 + 8 * Math.random();
    } else {
      const near = nearestAnt(ants, ant);
      if (near && near.dist < 96 && near.ant.speed > 8) {
        ant.state = "trailing";
        ant.followTarget = ants.indexOf(near.ant);
        ant.targetAngle = Math.atan2(near.ant.y - ant.y, near.ant.x - ant.x);
        ant.stateTimer = 6 + 8 * Math.random();
      } else {
        ant.stateTimer = 3 + 5 * Math.random();
      }
    }
  } else {
    ant.stateTimer = 2 + 5 * Math.random();
  }
}

function stepTrailing(ant: Ant, ants: Ant[], index: number, dt: number) {
  ant.targetSpeed = 0.85 * ant.baseSpeed;
  if (ant.followTarget >= 0) {
    // Break follow cycles (A follows B follows ... follows A).
    let cursor = ant.followTarget;
    for (let hop = 0; hop < 6 && cursor >= 0 && cursor < ants.length; hop++) {
      const link = ants[cursor];
      if (link.followTarget === index) {
        link.followTarget = -1;
        break;
      }
      cursor = link.followTarget;
    }
  }
  let steering = false;
  if (ant.followTarget >= 0 && ant.followTarget < ants.length) {
    const leader = ants[ant.followTarget];
    if (leader.alive) {
      const tx = leader.x - 28.8 * Math.cos(leader.angle);
      const ty = leader.y - 28.8 * Math.sin(leader.angle);
      const toward = Math.atan2(ty - ant.y, tx - ant.x);
      const gap = Math.sqrt(dist2(ant.x, ant.y, tx, ty));
      if (Math.sqrt(dist2(ant.x, ant.y, leader.x, leader.y)) > 115.2) {
        ant.followTarget = -1;
      } else if (gap > 14.4) {
        ant.targetAngle = toward;
        const k = Math.min(gap / 28.8, 1.5);
        ant.targetSpeed = ant.baseSpeed * (0.8 + 0.4 * k);
        steering = true;
      } else {
        ant.targetAngle = leader.angle;
        ant.targetSpeed = 0.98 * leader.speed;
        steering = true;
      }
    } else {
      ant.followTarget = -1;
    }
  }
  if (!steering) {
    let bestD = 14400;
    let bestIdx = -1;
    let bestPriority = 0;
    for (let n = 0; n < ants.length; n++) {
      const other = ants[n];
      if (
        other === ant ||
        !other.alive ||
        other.state === "alarmed" ||
        other.state === "dodging" ||
        other.state === "fleeing" ||
        other.state === "panicking" ||
        other.state === "greeting" ||
        other.followTarget === index
      )
        continue;
      const d = dist2(ant.x, ant.y, other.x, other.y);
      const priority =
        other.state === "foraging"
          ? 3
          : other.state === "wandering" && other.speed > 8
            ? 2
            : Number(other.state === "trailing" || other.state === "carrying");
      if (priority !== 0 && d < bestD && (priority > bestPriority || (priority === bestPriority && d < 0.7 * bestD))) {
        const dx = other.x - ant.x;
        const dy = other.y - ant.y;
        if (dx * Math.cos(ant.angle) + dy * Math.sin(ant.angle) > -5) {
          bestD = d;
          bestIdx = n;
          bestPriority = priority;
        }
      }
    }
    if (bestIdx >= 0) {
      // Join the back of the queue rather than crowding the leader.
      let target = bestIdx;
      for (let e = 0; e < ants.length; e++) {
        if (e !== index && ants[e].alive && ants[e].followTarget === target && ants[e].state === "trailing") {
          target = e;
          break;
        }
      }
      ant.followTarget = target;
    } else if (ant.stateTimer > 2) {
      ant.stateTimer = 2;
    }
  }
  ant.meanderPhase += ant.meanderFreq * Math.PI * 2 * dt;
  ant.angle = turnToward(ant.angle, ant.targetAngle + 0.05 * Math.sin(ant.meanderPhase), 7 * dt);
  ant.speed += (ant.targetSpeed - ant.speed) * dt * 5;
  if (ant.stateTimer <= 0) {
    ant.state = "wandering";
    ant.stateTimer = 3 + 4 * Math.random();
    ant.followTarget = -1;
  }
}

function stepCarrying(ant: Ant, dt: number, w: number, h: number) {
  ant.targetSpeed = 0.7 * ant.baseSpeed;
  ant.speed += (ant.targetSpeed - ant.speed) * dt * 3;
  const home = Math.atan2(0.5 * h - ant.y, 0.5 * w - ant.x);
  ant.targetAngle += angleDiff(ant.targetAngle, home) * dt * 0.3;
  ant.angle = turnToward(ant.angle, ant.targetAngle, 4 * dt);
  ant.angle += 0.015 * Math.sin(ant.phase + 0.3 * ant.legPhase);
  if (ant.stateTimer <= 0) {
    ant.carryingFood = false;
    ant.state = "wandering";
    ant.stateTimer = 3 + 5 * Math.random();
  }
}

function stepAlarmed(ant: Ant) {
  ant.speed *= 0.7;
  ant.angle += (Math.random() - 0.5) * 0.08;
  if (ant.stateTimer > 0) return;
  ant.state = "dodging";
  ant.burnDodged = true;
  ant.stateTimer = 0.25 + 0.2 * Math.random();
  const side = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
  ant.targetAngle = ant.angle + side + (Math.random() - 0.5) * 0.5;
}

function stepRegrouping(ant: Ant, ants: Ant[], dt: number) {
  const near = nearestAnt(ants, ant);
  if (near && near.dist > 32) {
    ant.targetAngle = Math.atan2(near.ant.y - ant.y, near.ant.x - ant.x) + (Math.random() - 0.5) * 0.4;
  }
  ant.angle = turnToward(ant.angle, ant.targetAngle, 5 * dt);
  ant.targetSpeed = 32 * ant.size;
  ant.speed += (ant.targetSpeed - ant.speed) * dt * 3;
  if (ant.stateTimer <= 0) {
    ant.state = "wandering";
    ant.stateTimer = 3 + 4 * Math.random();
  }
  if (near && near.dist < 48 && ant.stateTimer < 1) {
    ant.state = "wandering";
    ant.stateTimer = 2 + 3 * Math.random();
  }
}

/** Ants that bump into each other greet, and wanderers get recruited onto trails. */
function socialise(ants: Ant[]) {
  for (let i = 0; i < ants.length; i++) {
    const a = ants[i];
    if (!a.alive || a.enteringHole >= 0 || SKITTISH.has(a.state)) continue;
    for (let j = i + 1; j < ants.length; j++) {
      const b = ants[j];
      if (!b.alive || b.enteringHole >= 0 || SKITTISH.has(b.state)) continue;
      const d = dist2(a.x, a.y, b.x, b.y);
      if (d < 1600 && Math.random() < 0.008) {
        a.prevState = a.state;
        a.state = "greeting";
        a.stateTimer = 0.3 + 0.4 * Math.random();
        b.prevState = b.state;
        b.state = "greeting";
        b.stateTimer = 0.3 + 0.4 * Math.random();
      }
      if (d < 6400) {
        if ((a.state === "trailing" || a.state === "foraging") && b.state === "wandering" && Math.random() < 0.008) {
          b.state = "trailing";
          b.stateTimer = 6 + 8 * Math.random();
          b.followTarget = i;
        } else if (
          (b.state === "trailing" || b.state === "foraging") &&
          a.state === "wandering" &&
          Math.random() < 0.008
        ) {
          a.state = "trailing";
          a.stateTimer = 6 + 8 * Math.random();
          a.followTarget = j;
        }
      }
    }
  }
}

function ageTrail(ant: Ant, dt: number) {
  for (let i = ant.trail.length - 1; i >= 0; i--) {
    ant.trail[i].age += dt;
    if (ant.trail[i].age > 4.5) ant.trail.splice(i, 1);
  }
}

export function updateColony(ants: Ant[], dt: number, w: number, h: number, obstacle: Circle, nest: Nest) {
  socialise(ants);
  for (let i = 0; i < ants.length; i++) {
    const ant = ants[i];
    if (!ant.alive) continue;
    if (ant.emergeTimer > 0) {
      ant.emergeTimer = Math.max(0, ant.emergeTimer - dt);
      ant.speed = 0.3 * ant.baseSpeed;
      ant.x += Math.cos(ant.angle) * ant.speed * dt;
      ant.y += Math.sin(ant.angle) * ant.speed * dt;
      ant.legPhase += ant.speed * dt * 0.55;
      continue;
    }
    if (ant.enteringHole >= 0) {
      ant.enterProgress = Math.min(1, ant.enterProgress + 2.5 * dt);
      const hole = antHoles(w, h)[ant.enteringHole];
      if (hole) {
        const dx = hole.x - ant.x;
        const dy = hole.y - ant.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
          ant.x += (dx / d) * ant.speed * dt * 2;
          ant.y += (dy / d) * ant.speed * dt * 2;
        }
      }
      if (ant.enterProgress >= 1) ant.alive = false;
      continue;
    }
    ant.stateTimer -= dt;
    ant.turnTimer -= dt;
    switch (ant.state) {
      case "wandering":
        stepWandering(ant, ants, dt);
        break;
      case "scanning":
        ant.speed *= 0.9;
        ant.scanAngle += 2.5 * dt * Math.sin(8 * ant.stateTimer);
        ant.angle += ant.scanAngle * dt;
        if (ant.stateTimer <= 0) {
          ant.state = "wandering";
          ant.stateTimer = 2 + 4 * Math.random();
          ant.targetAngle = ant.angle + (Math.random() - 0.5) * 1.2;
        }
        break;
      case "greeting":
        ant.speed *= 0.85;
        ant.angle += 0.02 * Math.sin(16 * ant.stateTimer);
        if (ant.stateTimer <= 0) {
          ant.state =
            ant.prevState === "trailing" ? "trailing" : ant.prevState === "foraging" ? "foraging" : "wandering";
          ant.stateTimer = 2 + 3 * Math.random();
        }
        break;
      case "trailing":
        stepTrailing(ant, ants, i, dt);
        break;
      case "foraging":
        ant.targetSpeed = ant.baseSpeed * (ant.caste === "minor" ? 1.1 : 0.9);
        ant.speed += (ant.targetSpeed - ant.speed) * dt * 3;
        ant.meanderPhase += 1.5 * ant.meanderFreq * Math.PI * 2 * dt;
        ant.targetAngle += Math.sin(ant.meanderPhase) * ant.meanderAmp * 0.6 * dt;
        if (ant.turnTimer <= 0) {
          ant.targetAngle += (Math.random() - 0.5) * 0.8;
          ant.turnTimer = 0.5 + 1.5 * Math.random();
        }
        ant.angle = turnToward(ant.angle, ant.targetAngle, 5 * dt);
        if (ant.stateTimer <= 0) {
          if (Math.random() < 0.35) {
            ant.state = "carrying";
            ant.carryingFood = true;
            ant.targetAngle = Math.atan2(0.5 * h - ant.y, 0.5 * w - ant.x) + (Math.random() - 0.5) * 0.6;
            ant.stateTimer = 4 + 5 * Math.random();
          } else {
            ant.state = "wandering";
            ant.stateTimer = 3 + 4 * Math.random();
          }
        }
        break;
      case "carrying":
        stepCarrying(ant, dt, w, h);
        break;
      case "alarmed":
        stepAlarmed(ant);
        break;
      case "dodging":
        ant.angle = turnToward(ant.angle, ant.targetAngle, 12 * dt);
        ant.targetSpeed = 60 * ant.size;
        ant.speed += (ant.targetSpeed - ant.speed) * dt * 10;
        if (ant.stateTimer <= 0) {
          ant.state = "scanning";
          ant.stateTimer = 0.5 + 0.5 * Math.random();
          ant.scanAngle = 0;
        }
        break;
      case "fleeing":
        ant.angle = turnToward(ant.angle, ant.targetAngle, 8 * dt);
        ant.targetSpeed = 75 * ant.size;
        ant.speed += (ant.targetSpeed - ant.speed) * dt * 6;
        if (ant.stateTimer <= 0) {
          if (ant.timesHurt > 0 && Math.random() < 0.5) {
            ant.state = "regrouping";
            ant.stateTimer = 1.5 + 2 * Math.random();
          } else {
            ant.state = "wandering";
            ant.stateTimer = 2 + 3 * Math.random();
          }
        }
        break;
      case "panicking":
        ant.angle += (5 * Math.sin(18 * ant.stateTimer) + (Math.random() - 0.5) * 4) * dt;
        if (Math.random() < 2 * dt) ant.angle += (Math.random() - 0.5) * Math.PI;
        ant.targetSpeed = 50 * ant.size * 1.4;
        ant.speed += (ant.targetSpeed - ant.speed) * dt * 8;
        if (ant.stateTimer <= 0) {
          ant.state = "fleeing";
          ant.targetAngle = Math.random() * Math.PI * 2;
          ant.stateTimer = 1 + 1.5 * Math.random();
        }
        break;
      case "regrouping":
        stepRegrouping(ant, ants, dt);
        break;
    }

    ant.x += Math.cos(ant.angle) * ant.speed * dt;
    ant.y += Math.sin(ant.angle) * ant.speed * dt;
    ant.legPhase += ant.speed * dt * 0.55;
    if (ant.x < 35) ant.targetAngle = turnToward(ant.targetAngle, 0, 3 * dt);
    if (ant.x > w - 35) ant.targetAngle = turnToward(ant.targetAngle, Math.PI, 3 * dt);
    if (ant.y < 35) ant.targetAngle = turnToward(ant.targetAngle, 0.5 * Math.PI, 3 * dt);
    if (ant.y > h - 35) ant.targetAngle = turnToward(ant.targetAngle, -(0.5 * Math.PI), 3 * dt);

    if (obstacle.r > 0) {
      const dx = ant.x - obstacle.x;
      const dy = ant.y - obstacle.y;
      if (dx * dx + dy * dy < obstacle.r * obstacle.r) {
        const away = Math.atan2(dy, dx);
        ant.targetAngle = turnToward(ant.targetAngle, away, 8 * dt);
        ant.x += Math.cos(away) * dt * 15;
        ant.y += Math.sin(away) * dt * 15;
      }
    }

    ant.x = Math.max(-15, Math.min(w + 15, ant.x));
    ant.y = Math.max(-15, Math.min(h + 15, ant.y));
    if (ant.state === "wandering" && ant.enteringHole < 0 && Math.random() < 0.001) {
      const hole = holeIndexNear(ant.x, ant.y, w, h);
      if (hole >= 0) {
        ant.enteringHole = hole;
        ant.enterProgress = 0;
      }
    }
    if (ant.state === "wandering" && Math.random() < 0.003 && !nest.collapsed) {
      const dx = nest.cx - ant.x;
      const dy = nest.cy - ant.y;
      const d = dx * dx + dy * dy;
      if (d < 6400 && d > 225) ant.targetAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
    }

    ant.trailTimer -= dt;
    const strength = ant.state === "trailing" || ant.state === "foraging" || ant.state === "carrying" ? 1 : 0.4;
    if (ant.trailTimer <= 0 && ant.speed > 5) {
      ant.trail.push({ x: ant.x, y: ant.y, age: 0, strength });
      if (ant.trail.length > 25) ant.trail.shift();
      ant.trailTimer = 0.12;
    }
    ageTrail(ant, dt);
    if (ant.burnProgress <= 0) ant.burnDodged = false;
  }
}

/** 0 at the column's start (top-right), 1 at its end (left). */
function trailProgress(x: number, y: number, w: number, h: number): number {
  const sx = 0.95 * w;
  const sy = 0.05 * h;
  const dx = 0.05 * w - sx;
  const dy = 0.35 * h - sy;
  return ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy);
}

export function createTrailAnt(x: number, y: number): Ant {
  const minor = Math.random() < 0.6;
  const size = minor ? 0.7 + 0.12 * Math.random() : 0.88 + 0.08 * Math.random();
  const baseSpeed = minor ? 36 * (0.55 + 0.15 * Math.random()) : 28 * (0.55 + 0.15 * Math.random());
  return {
    x,
    y,
    angle: TRAIL_ANGLE,
    speed: 22 + (Math.random() - 0.5) * 4,
    targetSpeed: 22,
    meanderPhase: Math.random() * Math.PI * 2,
    meanderFreq: 1.2 + 0.4 * Math.random(),
    meanderAmp: 0.0875,
    turnTimer: 99,
    targetAngle: TRAIL_ANGLE,
    state: "trailing",
    stateTimer: 999,
    prevState: "trailing",
    scanAngle: 0,
    legPhase: Math.random() * Math.PI * 2,
    burnProgress: 0,
    alive: true,
    burnDodged: false,
    timesHurt: 0,
    caste: minor ? "minor" : "media",
    size,
    baseSpeed,
    shade: Math.random(),
    phase: 100 * Math.random(),
    trail: [],
    trailTimer: 0,
    followTarget: -1,
    carryingFood: false,
    emergeTimer: 0,
    enteringHole: -1,
    enterProgress: 0,
  };
}

export function createTrailColumn(w: number, h: number): Ant[] {
  const ants: Ant[] = [];
  const sx = 0.95 * w;
  const sy = 0.05 * h;
  const cos = Math.cos(TRAIL_ANGLE);
  const sin = Math.sin(TRAIL_ANGLE);
  for (let i = 0; i < TRAIL_ANT_COUNT; i++) {
    const back = -(TRAIL_SPACING * i);
    ants.push(createTrailAnt(sx + cos * back, sy + sin * back));
  }
  return ants;
}

/** Marching column: rides a fixed line with a gentle sideways weave, looping back to the start. */
export function updateTrailColumn(ants: Ant[], dt: number, w: number, h: number) {
  const cos = Math.cos(TRAIL_ANGLE);
  const sin = Math.sin(TRAIL_ANGLE);
  const nx = -sin;
  const lineLen = Math.sqrt((-0.8999999999999999 * w) ** 2 + (0.3 * h) ** 2);
  for (const ant of ants) {
    if (!ant.alive) continue;
    ant.meanderPhase += ant.meanderFreq * dt;
    const weave = 3 * Math.sin(ant.meanderPhase);
    ant.x += cos * ant.speed * dt;
    ant.y += sin * ant.speed * dt;
    const t = trailProgress(ant.x, ant.y, w, h);
    const lx = 0.95 * w + cos * t * lineLen;
    const ly = 0.05 * h + sin * t * lineLen;
    ant.x += (lx + nx * weave - ant.x) * dt * 2;
    ant.y += (ly + cos * weave - ant.y) * dt * 2;
    ant.angle = TRAIL_ANGLE;
    ant.legPhase += ant.speed * dt * 0.55;
    if (trailProgress(ant.x, ant.y, w, h) > 1.05) {
      ant.x = 0.95 * w + (Math.random() - 0.5) * 10;
      ant.y = 0.05 * h + (Math.random() - 0.5) * 10;
      ant.trail.length = 0;
    }
    ant.trailTimer -= dt;
    if (ant.trailTimer <= 0 && ant.speed > 5) {
      ant.trail.push({ x: ant.x, y: ant.y, age: 0, strength: 0.8 });
      if (ant.trail.length > 25) ant.trail.shift();
      ant.trailTimer = 0.12;
    }
    ageTrail(ant, dt);
  }
  for (let i = 0; i < ants.length; i++) {
    if (!ants[i].alive) {
      ants[i] = createTrailAnt(0.95 * w + (Math.random() - 0.5) * 10, 0.05 * h + (Math.random() - 0.5) * 10);
    }
  }
}

/** Heat ants under the sunspot; ants dodge at first, then flee once they've been hurt. */
export function heatAnts(ants: Ant[], fx: number, fy: number, dt: number, w: number) {
  for (const ant of ants) {
    if (!ant.alive) continue;
    const dx = ant.x - fx;
    const dy = ant.y - fy;
    if (Math.sqrt(dx * dx + dy * dy) < 18) {
      ant.burnProgress += dt / 0.85;
      sfx.sizzle(ant.x / w);
      if (
        ant.burnProgress > 0.15 &&
        !ant.burnDodged &&
        ant.state !== "alarmed" &&
        ant.state !== "dodging" &&
        ant.state !== "fleeing" &&
        ant.state !== "panicking"
      ) {
        ant.prevState = ant.state;
        ant.state = "alarmed";
        ant.stateTimer = 0.12 + 0.12 * Math.random();
      }
      if (ant.burnProgress > 0.45 && ant.burnDodged && ant.state !== "fleeing" && ant.state !== "panicking") {
        frighten(ant, fx, fy);
      }
      if (
        ant.burnProgress > 0.15 &&
        ant.timesHurt >= 2 &&
        ant.state !== "fleeing" &&
        ant.state !== "panicking" &&
        ant.state !== "dodging"
      ) {
        frighten(ant, fx, fy);
      }
    } else {
      ant.burnProgress = Math.max(0, ant.burnProgress - 0.7 * dt);
    }
  }
}

/** Zap fully-burnt ants; neighbours within 60px panic or flee. Returns whether any ant was zapped. */
export function zapBurntAnts(ants: Ant[], particles: Particle[], zapped: { value: number }, w: number): boolean {
  let any = false;
  for (const ant of ants) {
    if (!ant.alive || ant.burnProgress < 1) continue;
    ant.alive = false;
    zapped.value++;
    any = true;
    pushZapBurst(particles, ant.x, ant.y);
    sfx.crack(ant.x / w);
    for (const other of ants) {
      if (!other.alive || other === ant) continue;
      const dx = other.x - ant.x;
      const dy = other.y - ant.y;
      if (dx * dx + dy * dy >= 3600) continue;
      if (Math.random() < 0.6) {
        if (other.state !== "panicking") {
          other.state = "panicking";
          other.stateTimer = 1 + 1.5 * Math.random();
          other.followTarget = -1;
        }
      } else {
        frighten(other, ant.x, ant.y);
      }
    }
  }
  return any;
}

/** Dead slots refill after 2–4s, mostly from a hole, otherwise walking in from an edge. */
export function respawnAnts(ants: Ant[], timers: Map<number, number>, dt: number, w: number, h: number) {
  for (let i = 0; i < ants.length; i++) {
    if (!ants[i].alive && !timers.get(i)) timers.set(i, 2 + 2 * Math.random());
  }
  for (let i = 0; i < ants.length; i++) {
    const left = timers.get(i);
    if (left === undefined || left <= 0) continue;
    const next = left - dt;
    if (next <= 0) {
      timers.delete(i);
      ants[i] = Math.random() < 0.7 ? spawnFromHole(w, h) : spawnAnt(w, h, true);
    } else {
      timers.set(i, next);
    }
  }
  while (ants.length < COLONY_SIZE) ants.push(Math.random() < 0.7 ? spawnFromHole(w, h) : spawnAnt(w, h, true));
}

/** Occasionally a queen emerges if none is around. Returns the next countdown. */
export function maybeSpawnQueen(ants: Ant[], w: number, h: number): number {
  if (!ants.some((a) => a.alive && a.caste === "queen")) ants.push(spawnQueen(w, h));
  return 25 + 35 * Math.random();
}
