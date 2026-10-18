import type { Particle } from "./types";

type ParticleInit = Omit<Particle, "phase" | "sizeEnd"> & { phase?: number; sizeEnd?: number };

function particle(init: ParticleInit): Particle {
  return { phase: Math.random() * Math.PI * 2, sizeEnd: init.size, ...init };
}

type SmokeOpts = Partial<Pick<Particle, "vx" | "vy" | "life" | "decay" | "size" | "sizeEnd" | "r" | "g" | "b">>;

export function pushSmoke(list: Particle[], x: number, y: number, o: SmokeOpts) {
  list.push({
    x: x + (Math.random() - 0.5) * 5,
    y,
    vx: o.vx ?? (Math.random() - 0.5) * 2,
    vy: o.vy ?? -12 - 10 * Math.random(),
    life: o.life ?? 0.8 + 0.6 * Math.random(),
    decay: o.decay ?? 0.4 + 0.3 * Math.random(),
    size: o.size ?? 2.5 + 3 * Math.random(),
    sizeEnd: o.sizeEnd ?? 10 + 8 * Math.random(),
    type: "smoke",
    r: o.r ?? 100,
    g: o.g ?? 90,
    b: o.b ?? 80,
    phase: Math.random() * Math.PI * 2,
  });
}

type SparkOpts = { speed?: number; decay?: number; size?: number; r?: number; g?: number; b?: number };

export function pushSpark(list: Particle[], x: number, y: number, o?: SparkOpts) {
  const a = Math.random() * Math.PI * 2;
  const speed = o?.speed ?? 10 + 20 * Math.random();
  list.push({
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed - 8,
    life: 1,
    decay: o?.decay ?? 2 + Math.random(),
    size: o?.size ?? 0.5 + Math.random(),
    sizeEnd: 0.3,
    type: "spark",
    r: o?.r ?? 255,
    g: o?.g ?? (160 + 60 * Math.random()) | 0,
    b: o?.b ?? (30 + 40 * Math.random()) | 0,
    phase: 0,
  });
}

/** Flash, sparks, ember, scorch, heat shimmer and smoke when an ant is zapped. */
export function pushZapBurst(list: Particle[], x: number, y: number) {
  list.push(particle({ x, y, vx: 0, vy: 0, life: 1, decay: 3.5, size: 24, type: "flash", r: 255, g: 255, b: 245 }));
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 25 + 55 * Math.random();
    list.push(
      particle({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        decay: 1.6 + Math.random(),
        size: 1 + 2 * Math.random(),
        type: "spark",
        r: 255,
        g: (160 + 60 * Math.random()) | 0,
        b: (30 + 60 * Math.random()) | 0,
      }),
    );
  }
  list.push(particle({ x, y, vx: 0, vy: 0, life: 1, decay: 0.6, size: 8, type: "ember", r: 255, g: 120, b: 20 }));
  list.push(particle({ x, y, vx: 0, vy: 0, life: 1, decay: 0.04, size: 14, type: "scorch", r: 35, g: 25, b: 15 }));
  for (let i = 0; i < 4; i++) {
    list.push(
      particle({
        x: x + (Math.random() - 0.5) * 3,
        y: y - 2 * Math.random(),
        vx: (Math.random() - 0.5) * 1.5,
        vy: -14 - 10 * Math.random(),
        life: 1,
        decay: 1.2 + 0.5 * Math.random(),
        size: 10 + 6 * Math.random(),
        sizeEnd: 30 + 12 * Math.random(),
        type: "heat",
        r: 200,
        g: 180,
        b: 150,
      }),
    );
  }
  for (let i = 0; i < 8; i++) {
    const extra = 0.07 * i;
    list.push(
      particle({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -18 - 16 * Math.random(),
        life: 1.3 + extra,
        decay: 0.2 + 0.08 * Math.random(),
        size: 4 + 3 * Math.random(),
        sizeEnd: 18 + 12 * Math.random(),
        type: "smoke",
        r: (130 + 50 * Math.random()) | 0,
        g: (125 + 45 * Math.random()) | 0,
        b: (118 + 40 * Math.random()) | 0,
      }),
    );
  }
  for (let i = 0; i < 8; i++) {
    const rise = 20 + 24 * Math.random();
    list.push(
      particle({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 3,
        vy: -rise,
        life: 1,
        decay: 0.2 + 0.1 * Math.random(),
        size: 1.5 + 2 * Math.random(),
        sizeEnd: 8 + 7 * Math.random(),
        type: "wisp",
        r: (160 + 40 * Math.random()) | 0,
        g: (155 + 35 * Math.random()) | 0,
        b: (148 + 30 * Math.random()) | 0,
        phase: Math.random() * Math.PI * 2,
      }),
    );
  }
  for (let i = 0; i < 4; i++) {
    list.push(
      particle({
        x: x + (Math.random() - 0.5) * 2,
        y,
        vx: (Math.random() - 0.5) * 1,
        vy: -8 - 10 * Math.random(),
        life: 1.6,
        decay: 0.16 + 0.06 * Math.random(),
        size: 2.5 + 2 * Math.random(),
        sizeEnd: 16 + 8 * Math.random(),
        type: "smoke",
        r: (145 + 35 * Math.random()) | 0,
        g: (140 + 30 * Math.random()) | 0,
        b: (135 + 25 * Math.random()) | 0,
      }),
    );
  }
  list.push(
    particle({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -5 - 4 * Math.random(),
      life: 2.2,
      decay: 0.13,
      size: 3,
      sizeEnd: 24 + 8 * Math.random(),
      type: "smoke",
      r: 150,
      g: 145,
      b: 138,
    }),
  );
}

export function updateParticles(list: Particle[], dt: number, time: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= p.decay * dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === "spark") {
      p.vy += 40 * dt;
      p.size *= 0.995;
    } else if (p.type === "smoke") {
      p.vy -= 8 * dt;
      p.vx += 3 * Math.sin(1.8 * time + 5 * p.phase) * dt;
      p.vx *= 0.93;
      p.vy *= 0.99;
      p.size += (p.sizeEnd - p.size) * dt * 2.5;
      const age = 0.15 * (1 - Math.max(0, Math.min(1, p.life)));
      p.r = Math.max(95, p.r - 80 * age * dt);
      p.g = Math.max(95, p.g - 60 * age * dt);
    } else if (p.type === "wisp") {
      p.vx += 5 * Math.sin(3 * time + 7 * p.phase) * dt;
      p.vy -= 5 * dt;
      p.vx *= 0.92;
      p.vy *= 0.99;
      p.size += (p.sizeEnd - p.size) * dt * 2;
    } else if (p.type === "heat") {
      p.vy -= 4 * dt;
      p.size += (p.sizeEnd - p.size) * dt * 4;
      p.vx *= 0.9;
    }
  }
}

function radial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stops: [number, string][],
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/** Three passes: scorch marks, then soft vapour, then hot bits on top. */
export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  if (list.length === 0) return;
  for (const p of list) {
    if (p.type !== "scorch") continue;
    ctx.globalAlpha = Math.min(p.life, 0.3);
    radial(ctx, p.x, p.y, 1.6 * p.size, [
      [0, `rgba(${p.r}, ${p.g}, ${p.b}, 0.9)`],
      [0.3, `rgba(${p.r}, ${p.g}, ${p.b}, 0.5)`],
      [0.6, `rgba(${p.r + 15}, ${p.g + 10}, ${p.b + 5}, 0.2)`],
      [1, `rgba(${p.r + 25}, ${p.g + 15}, ${p.b + 8}, 0)`],
    ]);
  }
  for (const p of list) {
    if (p.type === "heat") {
      ctx.globalAlpha = 0.07 * p.life;
      radial(ctx, p.x, p.y, p.size, [
        [0, `rgba(${p.r}, ${p.g}, ${p.b}, 0.5)`],
        [1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`],
      ]);
    } else if (p.type === "smoke") {
      ctx.globalAlpha = 0.45 * p.life;
      radial(ctx, p.x, p.y, p.size, [
        [0, `rgba(${p.r}, ${p.g}, ${p.b}, 0.6)`],
        [0.5, `rgba(${p.r}, ${p.g}, ${p.b}, 0.15)`],
        [1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`],
      ]);
    } else if (p.type === "wisp") {
      ctx.globalAlpha = 0.32 * p.life;
      const stretch = Math.min(2.5, 1 + 0.05 * Math.sqrt(p.vx * p.vx + p.vy * p.vy));
      const heading = Math.atan2(p.vy, p.vx);
      const len = p.size * stretch;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(heading);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
      g.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, 0.6)`);
      g.addColorStop(0.4, `rgba(${p.r}, ${p.g}, ${p.b}, 0.25)`);
      g.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, 0.7 * p.size, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }
  for (const p of list) {
    if (p.type === "flash") {
      ctx.globalAlpha = 0.85 * p.life;
      radial(ctx, p.x, p.y, p.size * p.life, [
        [0, `rgba(${p.r}, ${p.g}, ${p.b}, 1)`],
        [0.2, "rgba(255, 240, 180, 0.6)"],
        [0.5, "rgba(255, 210, 100, 0.15)"],
        [1, "rgba(255, 200, 80, 0)"],
      ]);
    } else if (p.type === "ember") {
      const flicker = 0.7 + 0.3 * Math.sin(20 * p.life);
      ctx.globalAlpha = 0.6 * p.life * flicker;
      radial(ctx, p.x, p.y, p.size * p.life, [
        [0, `rgba(${p.r}, ${p.g}, ${p.b}, 1)`],
        [0.4, "rgba(220, 80, 15, 0.5)"],
        [1, "rgba(150, 30, 0, 0)"],
      ]);
    } else if (p.type === "spark") {
      ctx.globalAlpha = 0.85 * p.life;
      ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
      const r = p.size * Math.max(0.3, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
