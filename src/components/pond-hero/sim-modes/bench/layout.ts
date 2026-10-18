import { clamp01, seeded, TAU, type Rng } from "./math";

export type Pond = { cx: number; cy: number; rx: number; ry: number; ph: [number, number, number, number] };

export type ParkPath = {
  xs: Float32Array;
  ys: Float32Array;
  /** Arc length at each sample. */
  s: Float32Array;
  n: number;
  total: number;
  /** Arc length where the path passes closest to the plaza. */
  junction: number;
};

export type PathSample = { x: number; y: number; tx: number; ty: number };
export type Bench = { x: number; y: number; face: number; occupied: boolean };
export type Tree = { x: number; y: number; r: number; tone: number; seed: number };
export type Blanket = { x: number; y: number; ang: number; check: string };
export type Plaza = { x: number; y: number; r: number };

type DistanceField = { field: Float32Array; fieldW: number; fieldStep: number };

export type Park = DistanceField & {
  w: number;
  h: number;
  /** One "metre" in CSS px. */
  m: number;
  pond: Pond;
  paths: [ParkPath, ParkPath];
  pathHW: number;
  plaza: Plaza;
  benches: Bench[];
  smokerBench: number;
  trees: Tree[];
  /** Crowns outside the frame that only cast shade. */
  shades: Tree[];
  blankets: Blanket[];
  frisbee: [number, number, number, number];
  bin: { x: number; y: number };
};

function wobble(pond: Pond, a: number) {
  return (
    1 +
    0.09 * Math.sin(2 * a + pond.ph[0]) +
    0.06 * Math.sin(3 * a + pond.ph[1]) +
    0.035 * Math.sin(5 * a + pond.ph[2]) +
    0.018 * Math.sin(9 * a + pond.ph[3])
  );
}

/** > 0 inside the pond (1 at the centre), < 0 outside. */
export function pondField(pond: Pond, x: number, y: number): number {
  const dx = (x - pond.cx) / pond.rx;
  const dy = (y - pond.cy) / pond.ry;
  return 1 - Math.sqrt(dx * dx + dy * dy) / wobble(pond, Math.atan2(dy, dx));
}

/** A point on the shore at angle `a`, `scale` of the way out. */
export function pondPoint(pond: Pond, a: number, scale: number) {
  const r = wobble(pond, a);
  return { x: pond.cx + Math.cos(a) * pond.rx * r * scale, y: pond.cy + Math.sin(a) * pond.ry * r * scale };
}

function buildPath(points: [number, number][], w: number, h: number, plaza: Plaza): ParkPath {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < 40; j++) {
      const t = j / 40;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      xs.push(cr(p0[0], p1[0], p2[0], p3[0]) * w);
      ys.push(cr(p0[1], p1[1], p2[1], p3[1]) * h);
    }
  }
  const last = points[points.length - 1];
  xs.push(last[0] * w);
  ys.push(last[1] * h);
  const n = xs.length;
  const s = new Float32Array(n);
  let nearest = 0;
  let nearestD = Infinity;
  for (let i = 0; i < n; i++) {
    if (i) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    const d = Math.hypot(xs[i] - plaza.x, ys[i] - plaza.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = i;
    }
  }
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), s, n, total: s[n - 1], junction: s[nearest] };
}

export function samplePath(path: ParkPath, at: number, out: PathSample): PathSample {
  if (at <= 0) at = 0;
  else if (at >= path.total) at = path.total - 0.001;
  let lo = 0;
  let hi = path.n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.s[mid] <= at) lo = mid;
    else hi = mid;
  }
  const seg = path.s[hi] - path.s[lo] || 1;
  const f = (at - path.s[lo]) / seg;
  const dx = path.xs[hi] - path.xs[lo];
  const dy = path.ys[hi] - path.ys[lo];
  const len = Math.hypot(dx, dy) || 1;
  out.x = path.xs[lo] + dx * f;
  out.y = path.ys[lo] + dy * f;
  out.tx = dx / len;
  out.ty = dy / len;
  return out;
}

/** A random spot well inside the pond, away from the top edge. */
export function pondSpot(park: Park, r: Rng) {
  for (let i = 0; i < 40; i++) {
    const x = park.pond.cx + (2 * r() - 1) * park.pond.rx * 0.75;
    const y = park.pond.cy + (2 * r() - 1) * park.pond.ry * 0.75;
    if (pondField(park.pond, x, y) > 0.4 && y > 0.12 * park.h && x < 0.9 * park.w) return { x, y };
  }
  return { x: park.pond.cx - 0.2 * park.pond.rx, y: park.pond.cy + 0.2 * park.pond.ry };
}

/** Distance to the nearest path centreline. */
export function pathDistance(f: DistanceField, x: number, y: number): number {
  const rows = f.field.length / f.fieldW;
  const gx = Math.max(0, Math.min(f.fieldW - 1.001, x / f.fieldStep));
  const gy = Math.max(0, Math.min(rows - 1.001, y / f.fieldStep));
  const ix = gx | 0;
  const iy = gy | 0;
  const fx = gx - ix;
  const fy = gy - iy;
  const i = iy * f.fieldW + ix;
  const d = f.field;
  return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + f.fieldW] * (1 - fx) + d[i + f.fieldW + 1] * fx) * fy;
}

export function buildPark(w: number, h: number): Park {
  const r = seeded(1904);
  const m = Math.min(w, h) / 22;
  const pond: Pond = { cx: 0.74 * w, cy: 0.25 * h, rx: 0.27 * w, ry: 0.31 * h, ph: [r() * TAU, r() * TAU, r() * TAU, r() * TAU] };
  const plaza: Plaza = { x: 0.4 * w, y: 0.56 * h, r: 2.6 * m };
  const paths: [ParkPath, ParkPath] = [
    buildPath(
      [
        [0.3, -0.12],
        [0.33, 0.12],
        [0.37, 0.36],
        [0.4, 0.56],
        [0.36, 0.8],
        [0.26, 1.12],
      ],
      w,
      h,
      plaza,
    ),
    buildPath(
      [
        [-0.12, 0.62],
        [0.16, 0.58],
        [0.4, 0.56],
        [0.6, 0.66],
        [0.82, 0.72],
        [1.12, 0.66],
      ],
      w,
      h,
      plaza,
    ),
  ];
  const pathHW = 1.3 * m;

  const fieldW = Math.ceil(w / 3) + 1;
  const fieldH = Math.ceil(h / 3) + 1;
  const field = new Float32Array(fieldW * fieldH);
  for (let gy = 0; gy < fieldH; gy++) {
    for (let gx = 0; gx < fieldW; gx++) {
      const px = 3 * gx;
      const py = 3 * gy;
      let best = Infinity;
      for (const p of paths) {
        for (let i = 0; i < p.n; i++) {
          const dx = p.xs[i] - px;
          const dy = p.ys[i] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < best) best = d2;
        }
      }
      field[gy * fieldW + gx] = Math.sqrt(best);
    }
  }

  // Benches ring the plaza in the gaps between the four path exits.
  const sample: PathSample = { x: 0, y: 0, tx: 0, ty: 0 };
  const exits: number[] = [];
  for (const p of paths) {
    for (const sign of [-1, 1]) {
      samplePath(p, p.junction + sign * plaza.r, sample);
      exits.push((Math.atan2(sample.y - plaza.y, sample.x - plaza.x) + TAU) % TAU);
    }
  }
  exits.sort((a, b) => a - b);
  const benches: Bench[] = [];
  for (let i = 0; i < 4; i++) {
    const start = exits[i];
    const gap = (i === 3 ? exits[0] + TAU : exits[i + 1]) - start;
    const count = gap > 2.4 ? 2 : +(gap > 1.1);
    for (let k = 1; k <= count; k++) {
      const a = start + (gap * k) / (count + 1);
      const dist = plaza.r + 0.35 * m;
      const bx = plaza.x + Math.cos(a) * dist;
      const by = plaza.y + Math.sin(a) * dist;
      if (pathDistance({ field, fieldW, fieldStep: 3 }, bx, by) < pathHW + 0.9 * m) continue;
      benches.push({ x: bx, y: by, face: a + Math.PI, occupied: false });
    }
  }

  const sx = plaza.x + (pond.cx - plaza.x) * 0.3;
  const sy = plaza.y + (pond.cy - plaza.y) * 0.42;
  for (let i = benches.length - 1; i >= 0; i--) {
    if (Math.hypot(benches[i].x - sx, benches[i].y - sy) < 2.2 * m) benches.splice(i, 1);
  }
  benches.push({ x: sx, y: sy, face: Math.atan2(pond.cy - sy, pond.cx - sx), occupied: true });
  const smokerBench = benches.length - 1;

  const alongPath = (p: ParkPath, frac: number, side: number, flip: boolean) => {
    samplePath(p, p.total * frac, sample);
    const nx = sample.ty * side;
    const ny = -sample.tx * side;
    const d = pathHW + 0.75 * m;
    const bx = sample.x + nx * d;
    const by = sample.y + ny * d;
    if (bx < 0.05 * w || bx > 0.95 * w || by < 0.05 * h || by > 0.95 * h || pondField(pond, bx, by) > -0.05) return;
    benches.push({ x: bx, y: by, face: Math.atan2(flip ? ny : -ny, flip ? nx : -nx), occupied: false });
  };
  alongPath(paths[0], 0.22, -1, false);
  alongPath(paths[0], 0.33, -1, false);
  alongPath(paths[1], 0.66, 1, true);
  alongPath(paths[1], 0.8, 1, true);
  alongPath(paths[1], 0.2, -1, false);

  const trees: Tree[] = [
    { x: plaza.x - 4.6 * m, y: plaza.y + 4.4 * m, r: 3.2 * m, tone: 0 },
    { x: 0.1 * w, y: 0.84 * h, r: 3.8 * m, tone: 1 },
    { x: 0.1 * w, y: 0.14 * h, r: 3.4 * m, tone: 2 },
    { x: 0.93 * w, y: 0.9 * h, r: 3.6 * m, tone: 0 },
    { x: 0.64 * w, y: 0.97 * h, r: 2.8 * m, tone: 2 },
  ].map((t, i) => ({ ...t, seed: 7 + 31 * i }));
  const shades: Tree[] = [{ x: 0.8 * w, y: 1.25 * h, r: 4.5 * m, tone: 0, seed: 223 }];

  const sb = benches[smokerBench];
  const fc = Math.cos(sb.face);
  const fs = Math.sin(sb.face);
  return {
    w,
    h,
    m,
    pond,
    paths,
    pathHW,
    plaza,
    benches,
    smokerBench,
    trees,
    shades,
    blankets: [
      { x: 0.56 * w, y: 0.86 * h, ang: 0.2, check: "rgba(214, 86, 74, 0.5)" },
      { x: 0.13 * w, y: 0.34 * h, ang: -0.35, check: "rgba(70, 120, 200, 0.45)" },
      { x: 0.84 * w, y: 0.9 * h, ang: 0.5, check: "rgba(232, 180, 60, 0.55)" },
    ],
    frisbee: [0.07 * w, 0.12 * h, 0.24 * w, 0.2 * h],
    bin: { x: sb.x - fs * m * 1.5 - fc * m * 0.2, y: sb.y + fc * m * 1.5 - fs * m * 0.2 },
    field,
    fieldW,
    fieldStep: 3,
  };
}

/**
 * Half-resolution terrain map for the scene shader:
 * r = path / plaza, g = pond depth, b = plaza paver mask.
 */
export function buildTerrainMap(park: Park) {
  const mw = Math.ceil(park.w / 2);
  const mh = Math.ceil(park.h / 2);
  const data = new Uint8Array(mw * mh * 4);
  const soft = 1.8 * park.m;
  const { plaza } = park;
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const px = 2 * x + 1;
      const py = 2 * y + 1;
      const i = (y * mw + x) * 4;
      const dp = Math.hypot(px - plaza.x, py - plaza.y);
      const onPath = Math.max(clamp01(0.5 + (park.pathHW - pathDistance(park, px, py)) / soft), clamp01(0.5 + (plaza.r - dp) / soft));
      data[i] = 255 * onPath;
      data[i + 1] = 255 * clamp01(0.5 + pondField(park.pond, px, py));
      data[i + 2] = 255 * clamp01((plaza.r - 0.3 * park.m - dp) / park.m);
      data[i + 3] = 255;
    }
  }
  return { data, mw, mh };
}
