type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  r: number;
  life: number;
};

export type ParticleState = { pool: Particle[]; ambient: Particle[] };

export function createParticleState(): ParticleState {
  return { pool: [], ambient: [] };
}

/** Floating pollen motes drifting up over the pitch. */
export function ensureAmbient(state: ParticleState, w: number, h: number) {
  while (state.ambient.length < 10) {
    state.ambient.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.08 - 0.12 * Math.random(),
      a: 0.06 + 0.08 * Math.random(),
      r: 1.5 + 2 * Math.random(),
      life: 0,
    });
  }
}

/** Kick up a puff of dust behind a running duck. */
export function spawnDust(state: ParticleState, x: number, y: number, heading: number) {
  if (state.pool.length >= 80) return;
  const count = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    state.pool.push({
      x: x - 12 * Math.sin(heading) + (Math.random() - 0.5) * 10,
      y: y + 12 * Math.cos(heading) + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.4 - 0.6 * Math.random(),
      a: 0.18 + 0.12 * Math.random(),
      r: 1.2 + 1.8 * Math.random(),
      life: 0,
    });
  }
}

export function tickParticles(
  ctx: CanvasRenderingContext2D,
  state: ParticleState,
  w: number,
  h: number,
  dt: number,
) {
  ctx.clearRect(0, 0, w, h);
  const pool = state.pool;
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy *= 0.98;
    p.life += dt;
    p.a *= 0.97;
    if (p.a < 0.015) {
      pool[i] = pool[pool.length - 1];
      pool.pop();
      continue;
    }
    ctx.globalAlpha = p.a;
    ctx.fillStyle = "rgb(180,172,158)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = "rgb(225,218,195)";
  for (const m of state.ambient) {
    m.x += m.vx + 0.08 * Math.sin(0.5 * m.life);
    m.y += m.vy;
    m.life += dt;
    if (m.y < -10) {
      m.y = h + 10;
      m.x = Math.random() * w;
    }
    if (m.x < -10 || m.x > w + 10) m.x = Math.random() * w;
    const alpha = m.a * (0.7 + 0.3 * Math.sin(1.5 * m.life));
    ctx.globalAlpha = 0.25 * alpha;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r + 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
