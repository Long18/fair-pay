import { spawnAnt } from "./ants";
import { pushSmoke, pushSpark } from "./particles";
import type { Ant, Nest, Particle, Stick } from "./types";
import { seeded, segmentDistance } from "./util";

/** Twig pile the colony gathers around (deterministic layout per field size). */
export function createNest(w: number, h: number): Nest {
  const rng = seeded(5555);
  const cx = w * (0.22 + 0.12 * rng());
  const cy = h * (0.55 + 0.15 * rng());
  const m = Math.min(w, h);
  const sticks: Stick[] = [];
  const base = 0.6 * rng() - 0.3;
  const stick = (ox: number, oy: number, a: number, len: number, width: number): Stick => ({
    x1: cx + ox - Math.cos(a) * len * 0.5,
    y1: cy + oy - Math.sin(a) * len * 0.5,
    x2: cx + ox + Math.cos(a) * len * 0.5,
    y2: cy + oy + Math.sin(a) * len * 0.5,
    width,
    health: 1,
    charLevel: 0,
    burning: false,
  });
  for (let i = 0; i < 3; i++) {
    const a = base + (i - 1) * 0.35 + (rng() - 0.5) * 0.15;
    const len = m * (0.06 + 0.03 * rng());
    const ox = (rng() - 0.5) * m * 0.01;
    const oy = (rng() - 0.5) * m * 0.01;
    sticks.push(stick(ox, oy, a, len, 1.4 + 0.8 * rng()));
  }
  for (let i = 0; i < 5; i++) {
    const a = base + 0.5 * Math.PI + (rng() - 0.5) * 0.6;
    const len = m * (0.02 + 0.025 * rng());
    const ox = (rng() - 0.5) * m * 0.035;
    const oy = (rng() - 0.5) * m * 0.025;
    sticks.push(stick(ox, oy, a, len, 0.8 + 0.7 * rng()));
  }
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI;
    const len = m * (0.012 + 0.018 * rng());
    const off = m * (0.02 + 0.025 * rng());
    const dir = rng() * Math.PI * 2;
    sticks.push(stick(Math.cos(dir) * off, Math.sin(dir) * off, a, len, 0.5 + 0.5 * rng()));
  }
  return { cx, cy, sticks, collapsed: false, panicTriggered: false, burnPercent: 0 };
}

/** Char, smoke and spark the twigs near the sunspot; fire creeps to touching twigs. */
export function burnNest(nest: Nest, fx: number, fy: number, dt: number, particles: Particle[]) {
  let anyStanding = false;
  for (const s of nest.sticks) {
    if (s.health <= 0) continue;
    anyStanding = true;
    const d = segmentDistance(fx, fy, s.x1, s.y1, s.x2, s.y2);
    if (d < 18) {
      s.burning = true;
      const heat = 1 - d / 18;
      s.charLevel = Math.min(1, s.charLevel + 0.7 * dt * heat);
      s.health -= 0.2 * dt * heat;
      if (s.charLevel > 0.4) {
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        for (const other of nest.sticks) {
          if (other === s || other.health <= 0) continue;
          if (segmentDistance(mx, my, other.x1, other.y1, other.x2, other.y2) < 12) {
            other.burning = true;
            other.charLevel = Math.min(1, other.charLevel + 0.15 * dt);
            other.health -= 0.05 * dt;
          }
        }
      }
      if (Math.random() < dt * (4 + 8 * s.charLevel) * heat) {
        const at = 0.2 + 0.6 * Math.random();
        const px = s.x1 + (s.x2 - s.x1) * at;
        const py = s.y1 + (s.y2 - s.y1) * at;
        const charred = s.charLevel > 0.5;
        pushSmoke(particles, px, py, {
          vx: (Math.random() - 0.5) * 4,
          vy: -15 - 15 * Math.random(),
          life: 0.8 + 0.8 * Math.random(),
          r: charred ? (50 + 20 * Math.random()) | 0 : (100 + 30 * Math.random()) | 0,
          g: charred ? (45 + 15 * Math.random()) | 0 : (90 + 25 * Math.random()) | 0,
          b: charred ? (40 + 10 * Math.random()) | 0 : (80 + 20 * Math.random()) | 0,
        });
      }
      if (Math.random() < dt * (s.charLevel > 0.3 ? 2 + 4 * s.charLevel : 0) * heat) {
        const at = Math.random();
        pushSpark(particles, s.x1 + (s.x2 - s.x1) * at, s.y1 + (s.y2 - s.y1) * at, {
          speed: 8 + 25 * Math.random(),
          decay: 1.5 + 1.5 * Math.random(),
          size: 0.6 + 1.2 * Math.random(),
          r: 255,
          g: (140 + 80 * Math.random()) | 0,
          b: (20 + 50 * Math.random()) | 0,
        });
      }
      if (s.charLevel > 0.15 && Math.random() < 3 * dt * heat) {
        const at = 0.2 + 0.6 * Math.random();
        const px = s.x1 + (s.x2 - s.x1) * at;
        const py = s.y1 + (s.y2 - s.y1) * at;
        particles.push({
          x: px + (Math.random() - 0.5) * 3,
          y: py,
          vx: (Math.random() - 0.5) * 3,
          vy: -20 - 15 * Math.random(),
          life: 1,
          decay: 3 + 2 * Math.random(),
          size: 2 + 3 * Math.random(),
          sizeEnd: 0.5,
          type: "spark",
          r: 255,
          g: (200 + 55 * Math.random()) | 0,
          b: (50 + 80 * Math.random()) | 0,
          phase: 0,
        });
      }
    } else if (s.burning && s.charLevel > 0.3) {
      s.charLevel = Math.min(1, s.charLevel + 0.1 * dt);
      s.health -= 0.04 * dt;
      if (Math.random() < 1.5 * dt) {
        const at = Math.random();
        pushSmoke(particles, s.x1 + (s.x2 - s.x1) * at, s.y1 + (s.y2 - s.y1) * at, {
          vy: -8 - 8 * Math.random(),
          life: 0.5 + 0.5 * Math.random(),
          decay: 0.5 + 0.3 * Math.random(),
          size: 1.5 + 2 * Math.random(),
          sizeEnd: 6 + 4 * Math.random(),
          r: 70,
          g: 65,
          b: 60,
        });
      }
    } else if (s.burning && s.charLevel < 0.3) {
      s.burning = false;
    }
    if (s.health <= 0) {
      s.health = 0;
      const mx = (s.x1 + s.x2) / 2;
      const my = (s.y1 + s.y2) / 2;
      for (let i = 0; i < 6; i++) {
        pushSmoke(particles, mx, my, {
          vx: (Math.random() - 0.5) * 5,
          vy: -10 - 10 * Math.random(),
          life: 1 + 0.5 * Math.random(),
          decay: 0.3 + 0.2 * Math.random(),
          size: 3 + 3 * Math.random(),
          sizeEnd: 12 + 6 * Math.random(),
          r: 60,
          g: 55,
          b: 50,
        });
      }
      for (let i = 0; i < 8; i++) pushSpark(particles, mx, my);
    }
  }
  let health = 0;
  let count = 0;
  for (const s of nest.sticks) {
    count += 1;
    health += s.health;
  }
  nest.burnPercent = count > 0 ? 1 - health / count : 1;
  nest.collapsed = !anyStanding;
}

/** Once a third of the pile is gone, a burst of ants pours out and nearby ants scatter. */
export function nestPanic(nest: Nest, ants: Ant[], w: number, h: number) {
  nest.panicTriggered = true;
  const count = 5 + ((3 * Math.random()) | 0);
  for (let i = 0; i < count; i++) {
    const ant = spawnAnt(w, h, false);
    ant.x = nest.cx + (Math.random() - 0.5) * 10;
    ant.y = nest.cy + (Math.random() - 0.5) * 10;
    ant.angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    ant.targetAngle = ant.angle;
    ant.state = "panicking";
    ant.stateTimer = 2.5 + 2.5 * Math.random();
    ant.speed = 60 + 40 * Math.random();
    ant.emergeTimer = 0.15;
    ants.push(ant);
  }
  for (const ant of ants) {
    if (!ant.alive || ant.state === "panicking") continue;
    const dx = ant.x - nest.cx;
    const dy = ant.y - nest.cy;
    if (dx * dx + dy * dy < 3600) {
      ant.state = "panicking";
      ant.stateTimer = 2 + 2 * Math.random();
      ant.followTarget = -1;
      ant.angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1;
      ant.targetAngle = ant.angle;
    }
  }
}

export function drawNest(ctx: CanvasRenderingContext2D, nest: Nest) {
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#0a0804";
  for (const s of nest.sticks) {
    if (s.health <= 0) continue;
    ctx.lineWidth = s.width + 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x1 + 1.5, s.y1 + 2);
    ctx.lineTo(s.x2 + 1.5, s.y2 + 2);
    ctx.stroke();
  }
  for (const s of nest.sticks) {
    if (s.health <= 0) continue;
    const c = s.charLevel;
    const r = Math.round(130 * (1 - c) + 25 * c);
    const g = Math.round(95 * (1 - c) + 15 * c);
    const b = Math.round(55 * (1 - c) + 8 * c);
    ctx.globalAlpha = Math.min(1, s.health + 0.3);
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    if (c < 0.6) {
      ctx.globalAlpha = 0.12 * (1 - c);
      ctx.strokeStyle = "rgba(210, 185, 145, 0.7)";
      ctx.lineWidth = 0.3 * s.width;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    if (s.burning && s.charLevel > 0.15) {
      ctx.globalAlpha = 0.3 * s.charLevel;
      ctx.strokeStyle = "rgba(255, 100, 20, 0.5)";
      ctx.lineWidth = s.width + 5;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.globalAlpha = 0.5 * s.charLevel;
      ctx.strokeStyle = "rgba(255, 180, 50, 0.8)";
      ctx.lineWidth = s.width + 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
