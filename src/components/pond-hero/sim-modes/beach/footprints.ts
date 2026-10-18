import { seededRandom, TAU, type Ctx2D } from "./util";

type Footprint = {
  x: number;
  y: number;
  angle: number;
  isLeft: boolean;
  appearTime: number;
  life: number;
  maxLife: number;
};

type Trail = { prints: Footprint[] };

export type FootprintState = {
  trails: Trail[];
  elapsed: number;
  nextTrailAt: number;
  seed: number;
};

/** Walk directions a passer-by can take, with the start-row band (fraction of height). */
const TRAIL_DIRECTIONS: { angle: number; startY: [number, number] }[] = [
  { angle: 0, startY: [0.45, 0.8] },
  { angle: Math.PI, startY: [0.45, 0.8] },
  { angle: 0.25, startY: [0.5, 0.75] },
  { angle: Math.PI - 0.25, startY: [0.5, 0.75] },
  { angle: -0.25, startY: [0.55, 0.85] },
  { angle: Math.PI + 0.25, startY: [0.55, 0.85] },
  { angle: -Math.PI / 2, startY: [0.65, 0.88] },
  { angle: Math.PI / 2, startY: [0.42, 0.55] },
  { angle: -Math.PI / 5, startY: [0.55, 0.8] },
  { angle: Math.PI + Math.PI / 5, startY: [0.55, 0.8] },
];

/** Toe pads: [x, y, rx, ry, alpha]. */
const TOES: [number, number, number, number, number][] = [
  [4.2, -12, 2.1, 1.8, 0.32],
  [1.6, -12.8, 1.5, 1.3, 0.24],
  [-0.5, -12.5, 1.3, 1.2, 0.18],
  [-2.5, -11.6, 1.1, 1, 0.13],
  [-4.2, -10.2, 0.9, 0.8, 0.08],
];

export function createFootprints(): FootprintState {
  return { trails: [], elapsed: 0, nextTrailAt: 2.5, seed: 42 };
}

function makeTrail(state: FootprintState, w: number, h: number, now: number): Trail {
  const rand = seededRandom(state.seed++);
  const prints: Footprint[] = [];
  const dir = TRAIL_DIRECTIONS[(rand() * TRAIL_DIRECTIONS.length) | 0];
  let x = 0.06 * w + 0.88 * rand() * w;
  let y = h * (dir.startY[0] + rand() * (dir.startY[1] - dir.startY[0]));
  let angle = dir.angle + (rand() - 0.5) * 0.35;
  const stride = 22 + 10 * rand();
  let turn = (rand() - 0.5) * 0.3;
  if (Math.abs(turn) < 0.06) turn = (rand() > 0.5 ? 1 : -1) * (0.08 + 0.15 * rand());
  const steps = 6 + ((5 * rand()) | 0);
  for (let i = 0; i < steps; i++) {
    const isLeft = (1 & i) === 0;
    const side = angle + Math.PI / 2;
    const off = (isLeft ? -1 : 1) * 6;
    const px = x + Math.cos(side) * off;
    const py = y + Math.sin(side) * off;
    if (px > 12 && px < w - 12 && py > 0.35 * h && py < h - 12) {
      prints.push({ x: px, y: py, angle, isLeft, appearTime: now + 0.45 * i, life: 6, maxLife: 6 });
    }
    x += Math.cos(angle) * stride;
    y += Math.sin(angle) * stride;
    angle += turn;
    if (0.4 > rand()) turn += (rand() - 0.5) * 0.1;
  }
  return { prints };
}

export function updateFootprints(state: FootprintState, w: number, h: number, dt: number) {
  state.elapsed += dt;
  if (state.elapsed >= state.nextTrailAt && state.trails.length < 1) {
    state.trails.push(makeTrail(state, w, h, state.elapsed));
    state.nextTrailAt = state.elapsed + 10 + (Math.random() - 0.5) * 4;
  }
  let n = state.trails.length;
  for (let i = n - 1; i >= 0; i--) {
    let done = true;
    for (const p of state.trails[i].prints) {
      if (state.elapsed >= p.appearTime) {
        p.life -= dt;
        if (p.life > 0) done = false;
      } else {
        done = false;
      }
    }
    if (done) state.trails[i] = state.trails[--n];
  }
  state.trails.length = n;
}

function drawFootprint(e: Ctx2D, x: number, y: number, angle: number, isLeft: boolean, alpha: number) {
  if (alpha < 0.02) return;
  e.save();
  e.translate(x, y);
  e.rotate(angle + Math.PI / 2);
  if (isLeft) e.scale(-1, 1);
  e.fillStyle = "rgb(245,232,210)";
  e.globalAlpha = 0.1 * alpha;
  e.beginPath();
  e.ellipse(0, 1, 7.5, 14, 0, 0, TAU);
  e.fill();
  e.fillStyle = "rgb(140,118,85)";
  e.globalAlpha = 0.45 * alpha;
  e.beginPath();
  e.ellipse(0.5, 10, 5, 4.8, 0, 0, TAU);
  e.fill();
  e.globalAlpha = 0.25 * alpha;
  e.beginPath();
  e.ellipse(0.5, 10.3, 3.5, 3.2, 0, 0, TAU);
  e.fill();
  e.globalAlpha = 0.38 * alpha;
  e.beginPath();
  e.ellipse(1, -5, 5.5, 3.6, 0.05, 0, TAU);
  e.fill();
  e.globalAlpha = 0.06 * alpha;
  e.beginPath();
  e.ellipse(-3, 2.5, 1.4, 6, -0.05, 0, TAU);
  e.fill();
  for (const [tx, ty, rx, ry, a] of TOES) {
    e.globalAlpha = a * alpha;
    e.beginPath();
    e.ellipse(tx, ty, rx, ry, 0, 0, TAU);
    e.fill();
  }
  e.restore();
}

export function drawFootprints(ctx: Ctx2D, state: FootprintState) {
  for (const trail of state.trails) {
    for (const p of trail.prints) {
      if (state.elapsed < p.appearTime || p.life <= 0) continue;
      const fadeIn = Math.min(1, (state.elapsed - p.appearTime) / 0.3);
      const fadeOut = Math.min(1, p.life / 2.4000000000000004);
      drawFootprint(ctx, p.x, p.y, p.angle, p.isLeft, fadeIn * fadeOut * 0.8);
    }
  }
}
