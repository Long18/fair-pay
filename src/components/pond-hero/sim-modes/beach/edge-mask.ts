import { createScratch, type Ctx2D, type Scratch } from "./util";

const STOPS: [number, string][] = [
  [0, "rgba(0,0,0,0)"],
  [0.3, "rgba(0,0,0,0.03)"],
  [0.6, "rgba(0,0,0,0.25)"],
  [0.85, "rgba(0,0,0,0.7)"],
  [1, "rgba(0,0,0,1)"],
];

export type EdgeMask = { w: number; h: number; mask: Scratch };

/** Alpha mask that fades the live layer out toward every edge so it melts into the sand matte. */
export function createEdgeMask(w: number, h: number): EdgeMask {
  const mask = createScratch(w, h);
  const ctx = mask.ctx;
  const r = 0.26 * Math.min(w, h);
  const fx = r / w;
  const fy = r / h;
  const horiz = ctx.createLinearGradient(0, 0, w, 0);
  for (const [k, c] of STOPS) {
    horiz.addColorStop(fx * k, c);
    horiz.addColorStop(1 - fx * k, c);
  }
  ctx.fillStyle = horiz;
  ctx.fillRect(0, 0, w, h);
  const vert = ctx.createLinearGradient(0, 0, 0, h);
  for (const [k, c] of STOPS) {
    vert.addColorStop(fy * k, c);
    vert.addColorStop(1 - fy * k, c);
  }
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, w, h);
  return { w, h, mask };
}

export function applyEdgeMask(ctx: Ctx2D, m: EdgeMask) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(m.mask.canvas, 0, 0);
  ctx.restore();
}
