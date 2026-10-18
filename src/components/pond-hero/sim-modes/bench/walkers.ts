import { samplePath, type Park, type PathSample } from "./layout";
import { angleDelta, rand, TAU } from "./math";
import { drawFigure, drawFigureShadow, randomLook, type Look, type Pose } from "./people";
import { castShadow } from "./props";
import { project, pt, shadowOf, type Pt } from "./projection";

export enum WalkerKind {
  Walker = 0,
  Jogger = 1,
  Dog = 2,
  Stroller = 3,
  Parent = 4,
  Kid = 5,
}

export enum WalkerAct {
  Walk = 0,
  ToBench = 1,
  Sit = 2,
  Leave = 3,
}

export type Dog = { x: number; y: number; heading: number; ph: number; color: string; sniff: number };

export type Walker = {
  kind: WalkerKind;
  look: Look;
  pose: Pose;
  path: 0 | 1;
  /** Arc length along the path. */
  s: number;
  dir: number;
  lane: number;
  speed: number;
  act: WalkerAct;
  t: number;
  bench: number;
  /** Already took (or declined) a bench this visit. */
  sat: boolean;
  /** 0 nothing, 1 book, 2 newspaper, 3 phone. */
  reads: number;
  dog: Dog | null;
  leader: Walker | null;
  lookT: number;
  lookTo: number;
  alive: boolean;
};

const DOG_COLORS = ["#c8a070", "#2e2a26", "#e8dcc8", "#8a5a34", "#a8a49c"];
const sample: PathSample = { x: 0, y: 0, tx: 0, ty: 0 };

function laneSpot(w: Walker, park: Park) {
  samplePath(park.paths[w.path], w.s, sample);
  const off = w.lane * park.m;
  return {
    x: sample.x - sample.ty * w.dir * off,
    y: sample.y + sample.tx * w.dir * off,
    hx: sample.tx * w.dir,
    hy: sample.ty * w.dir,
  };
}

function makeWalker(park: Park, kind: WalkerKind, path: 0 | 1, s: number, dir: number, lane: number): Walker {
  const r = Math.random;
  const w: Walker = {
    kind,
    look: randomLook(r, kind === WalkerKind.Kid ? 0.62 : rand(0.92, 1.06)),
    pose: { x: 0, y: 0, heading: 0, ph: 6 * r(), stride: 1, sitting: false, look: 0 },
    path,
    s,
    dir,
    lane,
    speed: kind === WalkerKind.Jogger ? rand(2.6, 3.2) : kind === WalkerKind.Stroller ? rand(0.9, 1.1) : rand(1.05, 1.4),
    act: WalkerAct.Walk,
    t: 0,
    bench: -1,
    sat: kind !== WalkerKind.Walker || r() > 0.45,
    reads: (4 * r()) | 0,
    dog: null,
    leader: null,
    lookT: rand(1, 5),
    lookTo: 0,
    alive: true,
  };
  if (kind === WalkerKind.Jogger) {
    w.look.hat = 2 * +(r() > 0.5);
    w.look.bag = null;
    w.look.scarf = null;
    w.look.longCoat = false;
    w.look.shoes = "#f2f0ea";
  }
  if (kind === WalkerKind.Kid) {
    w.look.longCoat = false;
    w.look.bag = null;
  }
  const at = laneSpot(w, park);
  w.pose.x = at.x;
  w.pose.y = at.y;
  w.pose.heading = Math.atan2(at.hy, at.hx);
  if (kind === WalkerKind.Dog) {
    w.dog = {
      x: at.x + at.hx * park.m,
      y: at.y + at.hy * park.m,
      heading: w.pose.heading,
      ph: 0,
      color: DOG_COLORS[(r() * DOG_COLORS.length) | 0],
      sniff: 0,
    };
  }
  return w;
}

/** Someone enters (or, at start, is already on) one of the two paths. */
export function spawnWalker(people: Walker[], park: Park, anywhere: boolean) {
  const roll = Math.random();
  const path: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const p = park.paths[path];
  const s = anywhere ? rand(0.1, 0.9) * p.total : dir > 0 ? 1 : p.total - 1;
  const kind =
    roll < 0.42
      ? WalkerKind.Walker
      : roll < 0.57
        ? WalkerKind.Jogger
        : roll < 0.74
          ? WalkerKind.Dog
          : roll < 0.86
            ? WalkerKind.Stroller
            : WalkerKind.Parent;
  const lane = rand(0.35, 0.95);
  const w = makeWalker(park, kind, path, s, dir, lane);
  people.push(w);
  if (kind === WalkerKind.Parent) {
    const kid = makeWalker(park, WalkerKind.Kid, path, s, dir, lane + 0.55);
    kid.leader = w;
    kid.speed = w.speed;
    people.push(kid);
  }
}

export function updateWalkers(people: Walker[], park: Park, dt: number) {
  const m = park.m;
  for (const w of people) {
    if (!w.alive) continue;
    const pose = w.pose;
    w.lookT -= dt;
    if (w.lookT <= 0) {
      w.lookT = rand(1.5, 6);
      w.lookTo = Math.random() < 0.5 ? 0 : rand(-0.9, 0.9);
    }
    pose.look += (w.lookTo - pose.look) * Math.min(1, 3 * dt);
    let tx: number;
    let ty: number;
    let speed = w.speed;
    if (w.leader) {
      const lead = w.leader;
      if (!lead.alive) {
        w.alive = false;
        continue;
      }
      w.s = lead.s;
      w.path = lead.path;
      w.dir = lead.dir;
      const at = laneSpot(w, park);
      tx = at.x;
      ty = at.y;
      speed = lead.speed;
    } else if (w.act === WalkerAct.Walk) {
      const before = w.s;
      w.s += w.speed * m * w.dir * dt;
      const p = park.paths[w.path];
      // At the crossing, half of them turn onto the other path.
      if ((before - p.junction) * (w.s - p.junction) <= 0 && Math.random() < 0.5) {
        w.path = w.path === 0 ? 1 : 0;
        w.s = park.paths[w.path].junction + 0.5 * w.dir;
        w.dir = Math.random() < 0.5 ? 1 : -1;
      }
      const now = park.paths[w.path];
      if (w.s < -m || w.s > now.total + m) {
        w.alive = false;
        continue;
      }
      const at = laneSpot(w, park);
      tx = at.x;
      ty = at.y;
      if (!w.sat) {
        for (let i = 0; i < park.benches.length; i++) {
          const b = park.benches[i];
          if (b.occupied || Math.hypot(b.x - pose.x, b.y - pose.y) > 2.6 * m) continue;
          b.occupied = true;
          w.bench = i;
          w.act = WalkerAct.ToBench;
          w.sat = true;
          break;
        }
      }
    } else if (w.act === WalkerAct.ToBench) {
      const b = park.benches[w.bench];
      tx = b.x - Math.cos(b.face) * m * 0.08;
      ty = b.y - Math.sin(b.face) * m * 0.08;
      speed *= 0.8;
      if (Math.hypot(tx - pose.x, ty - pose.y) < 0.12 * m) {
        w.act = WalkerAct.Sit;
        w.t = rand(14, 45);
        pose.sitting = true;
      }
    } else if (w.act === WalkerAct.Sit) {
      const b = park.benches[w.bench];
      pose.heading += angleDelta(pose.heading, b.face) * Math.min(1, 4 * dt);
      pose.stride += (0 - pose.stride) * Math.min(1, 6 * dt);
      w.t -= dt;
      if (w.t <= 0) {
        w.act = WalkerAct.Leave;
        pose.sitting = false;
        b.occupied = false;
      }
      continue;
    } else {
      const at = laneSpot(w, park);
      tx = at.x;
      ty = at.y;
      if (Math.hypot(tx - pose.x, ty - pose.y) < 0.3 * m) w.act = WalkerAct.Walk;
    }

    const dx = tx - pose.x;
    const dy = ty - pose.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, speed * m * dt * (w.leader ? 1.4 : 1.1));
    if (d > 0.01) {
      pose.x += (dx / d) * step;
      pose.y += (dy / d) * step;
      pose.heading += angleDelta(pose.heading, Math.atan2(dy, dx)) * Math.min(1, 6 * dt);
    }
    const moving = step / Math.max(dt, 0.001) / m;
    const cadence = w.kind === WalkerKind.Jogger ? 2.6 : w.kind === WalkerKind.Kid ? 2.1 : 1.7;
    pose.ph += dt * Math.PI * 2 * cadence * Math.min(1, moving / Math.max(speed, 0.3));
    pose.stride += (+(moving > 0.2) - pose.stride) * Math.min(1, 5 * dt);

    const dog = w.dog;
    if (dog) {
      dog.sniff -= dt;
      if (dog.sniff < -rand(3, 9)) dog.sniff = rand(1, 2.5);
      const c = Math.cos(pose.heading);
      const s = Math.sin(pose.heading);
      const sway = Math.sin(0.13 * pose.ph) * m * 0.7;
      const ahead = dog.sniff > 0 ? -0.2 : 1.3;
      const gx = pose.x + c * m * ahead - s * sway;
      const gy = pose.y + s * m * ahead + c * sway;
      const ddx = gx - dog.x;
      const ddy = gy - dog.y;
      const dd = Math.hypot(ddx, ddy);
      if (dog.sniff > 0 && dd > 2.4 * m) dog.sniff = -0.01;
      if (dog.sniff <= 0 && dd > 1) {
        const k = Math.min(1, 3 * dt);
        dog.x += ddx * k;
        dog.y += ddy * k;
        dog.heading += angleDelta(dog.heading, Math.atan2(ddy, ddx)) * Math.min(1, 5 * dt);
      }
      dog.ph += dt * (dog.sniff > 0 ? 3 : 9);
    }
  }
  for (let i = people.length - 1; i >= 0; i--) if (!people[i].alive) people.splice(i, 1);
}

// Dog skeleton: 0-3 paws, 4 shoulders, 5 hips, 6 head, 7 tail tip.
const DJ: Pt[] = Array.from({ length: 8 }, pt);

function dogSkeleton(x: number, y: number, heading: number, ph: number, m: number, sniffing: boolean, shadow: boolean) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const wag = 0.18 * Math.sin(3.3 * ph);
  const step = 0.08 * Math.sin(ph);
  const joints: [number, number, number][] = [
    [0.22 + step, -0.09, 0],
    [0.22 - step, 0.09, 0],
    [-0.2 - step, -0.09, 0],
    [-0.2 + step, 0.09, 0],
    [0.2, 0, 0.42],
    [-0.2, 0, 0.42],
    [sniffing ? 0.42 : 0.36, 0, sniffing ? 0.15 : 0.5],
    [-0.42, wag, 0.5],
  ];
  for (let i = 0; i < 8; i++) {
    const [u, v, z] = joints[i];
    const wx = x + (u * c - v * s) * m;
    const wy = y + (u * s + v * c) * m;
    if (shadow) shadowOf(wx, wy, z * m, DJ[i]);
    else project(wx, wy, z * m, DJ[i]);
  }
}

function seg(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function drawDogShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  ph: number,
  m: number,
  sniffing: boolean,
) {
  dogSkeleton(x, y, heading, ph, m, sniffing, true);
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) seg(ctx, DJ[i], DJ[i < 2 ? 4 : 5], 0.06 * m);
  seg(ctx, DJ[4], DJ[5], 0.24 * m);
  seg(ctx, DJ[4], DJ[6], 0.16 * m);
  seg(ctx, DJ[5], DJ[7], 0.05 * m);
}

export function drawDog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  ph: number,
  color: string,
  m: number,
  sniffing: boolean,
) {
  dogSkeleton(x, y, heading, ph, m, sniffing, false);
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (let i = 0; i < 4; i++) seg(ctx, DJ[i], DJ[i < 2 ? 4 : 5], 0.06 * m);
  seg(ctx, DJ[5], DJ[7], 0.05 * m);
  seg(ctx, DJ[4], DJ[5], 0.24 * m * DJ[4].k);
  seg(ctx, DJ[4], DJ[6], 0.1 * m);
  const head = DJ[6];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 0.1 * m * head.k, 0, TAU);
  ctx.fill();
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      head.x - c * m * 0.03 - s * side * m * 0.08,
      head.y - s * m * 0.03 + c * side * m * 0.08,
      0.06 * m,
      0.035 * m,
      heading + 0.5 * side,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#1e1a18";
  ctx.beginPath();
  ctx.arc(head.x + c * m * 0.1, head.y + s * m * 0.1, 0.025 * m, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 244, 222, 0.2)";
  ctx.beginPath();
  ctx.arc((DJ[4].x + DJ[5].x) / 2, (DJ[4].y + DJ[5].y) / 2, 0.08 * m, 0, TAU);
  ctx.fill();
}

export function drawWalkerShadows(ctx: CanvasRenderingContext2D, people: Walker[], m: number) {
  for (const w of people) {
    drawFigureShadow(ctx, w.pose, w.look, m);
    if (w.dog) drawDogShadow(ctx, w.dog.x, w.dog.y, w.dog.heading, w.dog.ph, m, w.dog.sniff > 0);
    if (w.kind === WalkerKind.Stroller) {
      const h = w.pose.heading;
      castShadow(ctx, w.pose.x + Math.cos(h) * m * 0.7, w.pose.y + Math.sin(h) * m * 0.7, 0.3 * m, +m, 0.6);
    }
  }
}

function drawStroller(ctx: CanvasRenderingContext2D, w: Walker, m: number) {
  const { x, y, heading } = w.pose;
  ctx.save();
  ctx.translate(x + Math.cos(heading) * m * 0.7, y + Math.sin(heading) * m * 0.7);
  ctx.rotate(heading);
  ctx.fillStyle = "rgb(60, 62, 66)";
  ctx.fillRect(-(0.42 * m), -(0.2 * m), 0.04 * m, 0.4 * m);
  ctx.fillStyle = "rgb(226, 220, 206)";
  ctx.beginPath();
  ctx.roundRect(-(0.34 * m), -(0.2 * m), 0.66 * m, 0.4 * m, 0.14 * m);
  ctx.fill();
  ctx.fillStyle = "rgb(150, 176, 196)";
  ctx.beginPath();
  ctx.roundRect(0.02 * m, -(0.21 * m), 0.32 * m, 0.42 * m, 0.16 * m);
  ctx.fill();
  ctx.fillStyle = "rgb(242, 208, 196)";
  ctx.beginPath();
  ctx.arc(-(0.12 * m), 0, 0.09 * m, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const HP = pt();

/** Book, newspaper (pages turning now and then) or phone in a sitter's lap. */
function drawReading(ctx: CanvasRenderingContext2D, w: Walker, m: number, time: number) {
  if (w.act !== WalkerAct.Sit || !w.reads) return;
  const { x, y, heading } = w.pose;
  const s = m * w.look.scale;
  project(x + Math.cos(heading) * s * 0.22, y + Math.sin(heading) * s * 0.22, 0.66 * s, HP);
  ctx.save();
  ctx.translate(HP.x, HP.y);
  ctx.rotate(heading);
  if (w.reads === 1) {
    ctx.fillStyle = "#f6f0e2";
    ctx.fillRect(-(0.08 * s), -(0.13 * s), 0.16 * s, 0.26 * s);
    ctx.fillStyle = "#b45a44";
    ctx.fillRect(-(0.08 * s), -(0.01 * s), 0.16 * s, 0.02 * s);
  } else if (w.reads === 2) {
    const fold = Math.sin(0.4 * time + w.s) > 0.985 ? 0.5 : 1;
    ctx.fillStyle = "#f0ebde";
    ctx.fillRect(-(0.12 * s), -(0.3 * s) * fold, 0.24 * s, 0.6 * s * fold);
    ctx.fillStyle = "rgba(60,56,50,0.3)";
    for (let i = 0; i < 5; i++) ctx.fillRect(-(0.09 * s), -(0.24 * s) * fold + i * s * 0.1 * fold, 0.18 * s, 0.022 * s);
  } else {
    ctx.fillStyle = "#26262a";
    ctx.fillRect(-(0.05 * s), -(0.08 * s), 0.1 * s, 0.16 * s);
    ctx.fillStyle = "rgba(190, 214, 230, 0.8)";
    ctx.fillRect(-(0.035 * s), -(0.065 * s), 0.07 * s, 0.13 * s);
  }
  ctx.restore();
}

const LA = pt();

export function drawWalkers(ctx: CanvasRenderingContext2D, people: Walker[], m: number, time: number) {
  for (const w of people) {
    const dog = w.dog;
    if (dog) {
      const { x, y, heading } = w.pose;
      const s = m * w.look.scale;
      project(x + Math.cos(heading + 1.3) * s * 0.25, y + Math.sin(heading + 1.3) * s * 0.25, 0.85 * s, LA);
      const hx = LA.x;
      const hy = LA.y;
      project(dog.x + Math.cos(dog.heading) * m * 0.3, dog.y + Math.sin(dog.heading) * m * 0.3, 0.48 * m, LA);
      const cx = LA.x;
      const cy = LA.y;
      const slack = 0.4 * Math.max(0, 1.8 * m - Math.hypot(cx - hx, cy - hy));
      ctx.strokeStyle = "rgba(196, 70, 52, 0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo((hx + cx) / 2 + 0.78 * slack, (hy + cy) / 2 + 0.6 * slack, cx, cy);
      ctx.stroke();
      drawDog(ctx, dog.x, dog.y, dog.heading, dog.ph, dog.color, m, dog.sniff > 0);
    }
    if (w.kind === WalkerKind.Stroller) drawStroller(ctx, w, m);
    drawFigure(ctx, w.pose, w.look, m);
    drawReading(ctx, w, m, time);
  }
}
