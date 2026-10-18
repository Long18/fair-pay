import type { Rng } from "./types";
import { seeded } from "./util";

type Branch = { x1: number; y1: number; x2: number; y2: number; w: number; depth: number };

/** A compound leaf (stem + alternating leaflets) that sways independently. */
type Leaf = {
  x: number;
  y: number;
  angle: number;
  stemLen: number;
  leaflets: number;
  leafletLen: number;
  leafletWid: number;
  phase: number;
  flex: number;
  alpha: number;
};

const RULES: Record<string, { s: string; w: number }[]> = {
  X: [
    { s: "F[--X][++X]X", w: 25 },
    { s: "F[+X][-X]X", w: 25 },
    { s: "F[-X][+X][-X]", w: 20 },
    { s: "F[-X][+X]", w: 15 },
    { s: "F[+X][-X]", w: 15 },
  ],
  F: [{ s: "F", w: 100 }],
};
const DEG = Math.PI / 180;

function pickWeighted(options: { s: string; w: number }[], rng: Rng): string {
  let r = rng() * options.reduce((sum, o) => sum + o.w, 0);
  for (const o of options) if ((r -= o.w) <= 0) return o.s;
  return options[options.length - 1].s;
}

function expand(rng: Rng): string {
  let str = "X";
  for (let i = 0; i < 5; i++) {
    let next = "";
    for (const ch of str) next += RULES[ch] ? pickWeighted(RULES[ch], rng) : ch;
    str = next;
  }
  return str;
}

function turtle(
  str: string,
  startX: number,
  startY: number,
  startAngle: number,
  len: number,
  width: number,
  rng: Rng,
): { segs: Branch[]; leaves: Leaf[] } {
  const segs: Branch[] = [];
  const leaves: Leaf[] = [];
  const stack: { x: number; y: number; a: number; d: number }[] = [];
  let x = startX;
  let y = startY;
  let a = startAngle;
  let depth = 0;
  for (const ch of str) {
    switch (ch) {
      case "F": {
        const segLen = len * 0.58 ** depth * (0.8 + 0.4 * rng());
        const nx = x + Math.cos(a) * segLen;
        const ny = y + Math.sin(a) * segLen;
        if (depth <= 2) segs.push({ x1: x, y1: y, x2: nx, y2: ny, w: width * 0.65 ** depth, depth });
        const leafChance = depth === 0 ? 0.25 : depth === 1 ? 0.45 : 0.65;
        if (rng() < leafChance) {
          const lx = (x + nx) / 2 + (rng() - 0.5) * segLen * 0.5;
          const ly = (y + ny) / 2 + (rng() - 0.5) * segLen * 0.5;
          const s = len * (0.25 + 0.2 * rng());
          leaves.push({
            x: lx,
            y: ly,
            angle: a + (rng() - 0.5) * 1.5,
            stemLen: s * (1.8 + rng()),
            leaflets: 3 + ((3 * rng()) | 0),
            leafletLen: s * (0.5 + 0.3 * rng()),
            leafletWid: s * (0.16 + 0.1 * rng()),
            phase: rng() * Math.PI * 2,
            flex: 0.2 + 0.5 * rng(),
            alpha: 1,
          });
        }
        if (depth >= 1 && rng() < 0.4) {
          const s = len * (0.2 + 0.2 * rng());
          leaves.push({
            x: nx + (rng() - 0.5) * len * 0.15,
            y: ny + (rng() - 0.5) * len * 0.15,
            angle: a + (rng() - 0.5) * 2,
            stemLen: s * (2 + rng()),
            leaflets: 3 + ((3 * rng()) | 0),
            leafletLen: s * (0.55 + 0.3 * rng()),
            leafletWid: s * (0.18 + 0.1 * rng()),
            phase: rng() * Math.PI * 2,
            flex: 0.3 + 0.6 * rng(),
            alpha: 1,
          });
        }
        x = nx;
        y = ny;
        break;
      }
      case "+":
        a += (22 + (rng() - 0.5) * 20) * DEG;
        break;
      case "-":
        a -= (22 + (rng() - 0.5) * 20) * DEG;
        break;
      case "[":
        stack.push({ x, y, a, d: depth });
        depth++;
        break;
      case "]": {
        const top = stack.pop();
        if (top) {
          x = top.x;
          y = top.y;
          a = top.a;
          depth = top.d;
        }
        break;
      }
    }
  }
  return { segs, leaves };
}

function leafPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  stemLen: number,
  leaflets: number,
  leafLen: number,
  leafWid: number,
) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let i = 0; i < leaflets; i++) {
    const t = (i + 1) / (leaflets + 1);
    const px = x + c * stemLen * t;
    const py = y + s * stemLen * t;
    const a = angle + (i % 2 === 0 ? 1 : -1) * (0.6 + 0.35 * t);
    const k = 1 - 0.25 * t;
    const ex = px + Math.cos(a) * leafLen * 0.4 * k;
    const ey = py + Math.sin(a) * leafLen * 0.4 * k;
    ctx.moveTo(ex + leafLen * k, ey);
    ctx.ellipse(ex, ey, leafLen * k, leafWid * k, a, 0, 2 * Math.PI);
  }
  ctx.moveTo(x + c * stemLen + 0.8 * leafLen, y + s * stemLen);
  ctx.ellipse(x + c * stemLen, y + s * stemLen, 0.8 * leafLen, 0.7 * leafWid, angle, 0, 2 * Math.PI);
}

/** Soft, swaying shadow of a leafy tree reaching in from the bottom-right corner. */
export class TreeShadow {
  private w = 0;
  private h = 0;
  private branches: Branch[] = [];
  private leaves: Leaf[] = [];
  private trunk = { x0: 0, y0: 0, x1: 0, y1: 0, width: 0 };
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private build(w: number, h: number) {
    if (this.w === w && this.h === h) return;
    this.w = w;
    this.h = h;
    this.branches = [];
    this.leaves = [];
    const rng = seeded(7777);
    const m = Math.min(w, h);
    const x0 = 1.01 * w;
    const y0 = 1.03 * h;
    const x1 = 0.62 * w;
    const y1 = 0.58 * h;
    this.trunk = { x0, y0, x1, y1, width: 0.022 * m };
    const dx = x1 - x0;
    const dy = y1 - y0;
    const trunkAngle = Math.atan2(dy, dx);
    const limbLen = 0.09 * m;
    const limbWidth = 0.008 * m;
    const limbs = 7 + Math.floor(3 * rng());
    for (let i = 0; i < limbs; i++) {
      const t = 0.2 + (i / (limbs - 1)) * 0.75 + (rng() - 0.5) * 0.08;
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const angle = trunkAngle + (rng() > 0.5 ? 1 : -1) * (0.35 + 0.65 * rng());
      const taper = 1 - 0.3 * Math.abs(t - 0.5);
      const scale = (0.7 + 0.3 * rng()) * taper;
      const { segs, leaves } = turtle(expand(rng), bx, by, angle, limbLen * scale, limbWidth, rng);
      this.branches.push(...segs);
      this.leaves.push(...leaves);
    }
    if (this.leaves.length > 600) this.leaves.length = 600;
    const spread = 0.16 * m;
    for (let i = 0; i < 35; i++) {
      const t = 0.2 + 0.75 * rng();
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      const a = rng() * Math.PI * 2;
      const d = (i < 15 ? 0.35 * rng() : rng() * rng()) * spread;
      const s = m * (0.013 + 0.015 * rng());
      this.leaves.push({
        x: cx + Math.cos(a) * d,
        y: cy + Math.sin(a) * d,
        angle: rng() * Math.PI * 2,
        stemLen: s * (2 + 1.5 * rng()),
        leaflets: 3 + ((5 * rng()) | 0),
        leafletLen: s * (0.6 + 0.3 * rng()),
        leafletWid: s * (0.18 + 0.1 * rng()),
        phase: rng() * Math.PI * 2,
        flex: 0.3 + 0.5 * rng(),
        alpha: 1,
      });
    }
  }

  draw(target: CanvasRenderingContext2D, w: number, h: number, time: number) {
    this.build(w, h);
    if (!this.canvas || this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx = this.canvas.getContext("2d");
    }
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    const trunkSway = 5 * Math.sin(0.7 * time * 0.3) * 0.01;
    const { x0, y0, x1, y1, width } = this.trunk;
    ctx.strokeStyle = "rgb(18, 22, 38)";
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 + trunkSway, y1 + 0.3 * trunkSway);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let depth = 0; depth <= 2; depth++) {
      let started = false;
      ctx.beginPath();
      for (const b of this.branches) {
        if (b.depth !== depth) continue;
        if (!started) {
          ctx.lineWidth = b.w;
          started = true;
        }
        const sway =
          5 * Math.sin(0.7 * time + 0.008 * b.x1) * (0.05 + 0.06 * depth) +
          2.5 * Math.sin(0.25 * time + 0.006 * b.y1) * (0.03 + 0.04 * depth);
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2 + sway, b.y2 + 0.3 * sway);
      }
      if (started) ctx.stroke();
    }
    ctx.fillStyle = "rgb(20, 24, 35)";
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const leaf of this.leaves) {
      const reach = leaf.stemLen + leaf.leafletLen;
      if (leaf.x < -reach || leaf.x > w + reach || leaf.y < -reach || leaf.y > h + reach) continue;
      const sx =
        5 * Math.sin(0.7 * time + leaf.phase) * leaf.flex + 2.5 * Math.sin(0.25 * time + 0.7 * leaf.phase) * leaf.flex;
      const sy = 2.5 * Math.sin(0.4 * time + 1.3 * leaf.phase) * leaf.flex * 0.3;
      leafPath(
        ctx,
        leaf.x + sx,
        leaf.y + sy,
        leaf.angle + 0.008 * sx,
        leaf.stemLen,
        leaf.leaflets,
        leaf.leafletLen,
        leaf.leafletWid,
      );
    }
    ctx.fill();
    target.save();
    target.filter = "blur(1.5px)";
    target.globalAlpha = 0.13;
    target.drawImage(this.canvas, 0, 0);
    target.restore();
  }
}
