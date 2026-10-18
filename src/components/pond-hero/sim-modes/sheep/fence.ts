import type { Ctx2D } from "./surface";

const POST_DARK = "#6a5840";
const RAIL = "#8a7560";
const WOOD_LIGHT = "#a08e78";

const POST_SCALE = [0.45, 0.6, 0.8, 1, 1.15];
const POST_SLOT = [-2, -1, 0, 1, 2];
const POST_GROUND = [-52, -40, -20, 40, 100];
const RAIL_HEIGHTS = [0.28, 0.62];
export const POST_HEIGHT = 68;

type Post = { x: number; groundOff: number; scale: number };

/** Five posts receding from the near lower-right to the far upper-left, centred on `cx`. */
function fencePosts(cx: number): Post[] {
  return POST_SLOT.map((slot, i) => ({
    x: cx + 52 * slot,
    groundOff: POST_GROUND[i],
    scale: POST_SCALE[i],
  }));
}

/** Soft shadows cast to the left on the grass. */
export function drawFenceShadows(ctx: Ctx2D, w: number, h: number) {
  const ground = 0.48 * h;
  const posts = fencePosts(0.5 * w);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (const post of posts) {
    const len = POST_HEIGHT * post.scale;
    const thick = 7 * post.scale;
    const half = thick / 2;
    const base = ground + post.groundOff + 20;
    ctx.fillRect(post.x - half - len, base - thick, len, thick);
  }
  for (const rail of RAIL_HEIGHTS) {
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      const offA = POST_HEIGHT * a.scale * (1 - rail);
      const offB = POST_HEIGHT * b.scale * (1 - rail);
      const thickA = 6 * a.scale;
      const thickB = 6 * b.scale;
      const yA = ground + a.groundOff + 20;
      const yB = ground + b.groundOff + 20;
      ctx.beginPath();
      ctx.moveTo(a.x - offA, yA);
      ctx.lineTo(b.x - offB, yB);
      ctx.lineTo(b.x - (offB - thickB), yB);
      ctx.lineTo(a.x - (offA - thickA), yA);
      ctx.closePath();
      ctx.fill();
    }
  }
  {
    const a = posts[1];
    const b = posts[2];
    const offA = POST_HEIGHT * a.scale * 0.72;
    const offB = POST_HEIGHT * b.scale * 0.38 - 6 * b.scale;
    const yA = ground + a.groundOff + 20;
    const yB = ground + b.groundOff + 20;
    ctx.beginPath();
    ctx.moveTo(a.x - offA, yA);
    ctx.lineTo(b.x - offB, yB);
    ctx.lineTo(b.x - offB + 3, yB);
    ctx.lineTo(a.x - offA + 3, yA);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

type RailQuad = { lx: number; ly: number; rx: number; ry: number; lRH: number; rRH: number };

function railQuad(ctx: Ctx2D, q: RailQuad, inset: number, top: number, bottom: number, useHeight: boolean) {
  const lTop = useHeight ? q.ly + q.lRH - top : q.ly + top;
  const rTop = useHeight ? q.ry + q.rRH - top : q.ry + top;
  const lBot = useHeight ? q.ly + q.lRH - bottom : q.ly + bottom;
  const rBot = useHeight ? q.ry + q.rRH - bottom : q.ry + bottom;
  ctx.beginPath();
  ctx.moveTo(q.lx + inset, lTop);
  ctx.lineTo(q.rx - inset, rTop);
  ctx.lineTo(q.rx - inset, rBot);
  ctx.lineTo(q.lx + inset, lBot);
  ctx.closePath();
  ctx.fill();
}

/** Rails, the diagonal brace and the posts with their caps. */
export function drawFence(ctx: Ctx2D, w: number, h: number) {
  const ground = 0.48 * h;
  const posts = fencePosts(0.5 * w);
  const rails: RailQuad[] = [];
  for (const rail of RAIL_HEIGHTS) {
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      rails.push({
        lx: a.x - 3.5 * a.scale,
        ly: ground + a.groundOff - POST_HEIGHT * a.scale * (1 - rail),
        rx: b.x + 3.5 * b.scale,
        ry: ground + b.groundOff - POST_HEIGHT * b.scale * (1 - rail),
        lRH: 6 * a.scale,
        rRH: 6 * b.scale,
      });
    }
  }
  ctx.fillStyle = RAIL;
  for (const q of rails) {
    ctx.beginPath();
    ctx.moveTo(q.lx, q.ly);
    ctx.lineTo(q.rx, q.ry);
    ctx.lineTo(q.rx, q.ry + q.rRH);
    ctx.lineTo(q.lx, q.ly + q.lRH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = WOOD_LIGHT;
  ctx.globalAlpha = 0.45;
  for (const q of rails) railQuad(ctx, q, 2, 0.5, 1.8, false);
  ctx.fillStyle = POST_DARK;
  ctx.globalAlpha = 0.25;
  for (const q of rails) railQuad(ctx, q, 2, 1.2, 0, true);
  ctx.globalAlpha = 1;

  {
    const a = posts[1];
    const b = posts[2];
    const thick = 4 * ((a.scale + b.scale) / 2);
    const x0 = a.x;
    const y0 = ground + a.groundOff - 0.72 * POST_HEIGHT * a.scale;
    const x1 = b.x;
    const y1 = ground + b.groundOff - 0.38 * POST_HEIGHT * b.scale + 6 * b.scale;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = ((-dy / len) * thick) / 2;
    const ny = ((dx / len) * thick) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.moveTo(x0 - nx + 1.5, y0 - ny + 2);
    ctx.lineTo(x1 - nx + 1.5, y1 - ny + 2);
    ctx.lineTo(x1 + nx + 1.5, y1 + ny + 2);
    ctx.lineTo(x0 + nx + 1.5, y0 + ny + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = RAIL;
    ctx.beginPath();
    ctx.moveTo(x0 - nx, y0 - ny);
    ctx.lineTo(x1 - nx, y1 - ny);
    ctx.lineTo(x1 + nx, y1 + ny);
    ctx.lineTo(x0 + nx, y0 + ny);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = WOOD_LIGHT;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x0 - nx + 0.5, y0 - ny + 0.5);
    ctx.lineTo(x1 - nx + 0.5, y1 - ny + 0.5);
    ctx.lineTo(x1 - nx + 1.5, y1 - ny + 1.5);
    ctx.lineTo(x0 - nx + 1.5, y0 - ny + 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const post of posts) {
    const len = POST_HEIGHT * post.scale;
    const thick = 7 * post.scale;
    const half = thick / 2;
    const top = ground + post.groundOff - len;
    const height = len + 20;
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.roundRect(post.x - half + 1.5, top + 2, thick, height, 2);
    ctx.fill();
    ctx.fillStyle = POST_DARK;
    ctx.beginPath();
    ctx.roundRect(post.x - half, top, thick, height, 2);
    ctx.fill();
    ctx.fillStyle = WOOD_LIGHT;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(post.x - half + 0.5, top + 2, 1.5, height - 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = POST_DARK;
    ctx.beginPath();
    ctx.ellipse(post.x, top, half + 0.5, 2.2 * post.scale, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = WOOD_LIGHT;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(post.x - 0.5, top - 0.5, half - 0.5, 1.3 * post.scale, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
