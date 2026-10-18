import type { ShadowSprite, SpriteSheet } from "../shared/sprite-sheet";
import { FROG_CELL, Tongue, type Fly, type Frog } from "./frogs";

const MAX_TONGUES = 32;
const tongueSegments = new Float32Array(4 * MAX_TONGUES);
const FLY_HIGHLIGHT = "rgba(254, 232, 214, 0.7)";

/** Draws frog shadows, sprites and tongues in field coordinates; `k` = device px per field px. */
export function drawFrogs(
  ctx: CanvasRenderingContext2D,
  frogs: Frog[],
  sheet: SpriteSheet,
  shadows: ShadowSprite[] | null,
  k: number,
  w: number,
  h: number,
) {
  if (shadows) {
    for (const frog of frogs) {
      const reach = 1.25 * frog.size * 0.7;
      if (frog.x + reach < 0 || frog.x - reach > w || frog.y + reach < 0 || frog.y - reach > h) continue;
      const alpha = 0.42 * (1 - 0.7 * frog.lift);
      if (alpha <= 0.01) continue;
      const size = 1.25 * frog.size * (1 - 0.42 * frog.lift);
      const half = 0.5 * size;
      const angle = frog.heading + Math.PI / 2;
      const cos = Math.cos(angle) * k;
      const sin = Math.sin(angle) * k;
      ctx.globalAlpha = alpha;
      ctx.setTransform(cos, sin, -sin, cos, k * frog.x, k * frog.y);
      ctx.drawImage(shadows[frog.frame], -half, -half, size, size);
    }
  }
  ctx.globalAlpha = 1;
  for (const frog of frogs) {
    const reach = 0.7 * frog.size;
    if (frog.x + reach < 0 || frog.x - reach > w || frog.y + reach < 0 || frog.y - reach > h) continue;
    const half = 0.5 * frog.size;
    const scale = (1 + 0.38 * frog.lift) * k;
    const angle = frog.heading + Math.PI / 2;
    const cos = Math.cos(angle) * scale;
    const sin = Math.sin(angle) * scale;
    ctx.setTransform(cos, sin, -sin, cos, k * frog.x, k * frog.y);
    ctx.drawImage(sheet, FROG_CELL * frog.frame, 0, FROG_CELL, FROG_CELL, -half, -half, frog.size, frog.size);
  }
  ctx.setTransform(k, 0, 0, k, 0, 0);

  let count = 0;
  let width = 0;
  for (let i = 0; i < frogs.length && count < MAX_TONGUES; i++) {
    const frog = frogs[i];
    if (frog.tongueState === Tongue.idle || frog.tongueExtent <= 0) continue;
    const reach = 0.7 * frog.size;
    if (frog.x + reach < 0 || frog.x - reach > w || frog.y + reach < 0 || frog.y - reach > h) continue;
    if (count === 0) width = Math.max(2.6, 0.05 * frog.size);
    const dx = Math.cos(frog.heading);
    const dy = Math.sin(frog.heading);
    const mouthX = frog.x + dx * frog.size * 0.38;
    const mouthY = frog.y + dy * frog.size * 0.38;
    const len = frog.tongueExtent * frog.tongueDistance;
    const o = 4 * count;
    tongueSegments[o] = mouthX;
    tongueSegments[o + 1] = mouthY;
    tongueSegments[o + 2] = mouthX + dx * len;
    tongueSegments[o + 3] = mouthY + dy * len;
    count++;
  }
  if (count === 0) return;
  const strokeTongues = () => {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const o = 4 * i;
      ctx.moveTo(tongueSegments[o], tongueSegments[o + 1]);
      ctx.lineTo(tongueSegments[o + 2], tongueSegments[o + 3]);
    }
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineWidth = 1.75 * width;
  ctx.strokeStyle = "rgba(184, 102, 104, 0.28)";
  strokeTongues();
  ctx.lineWidth = width;
  ctx.strokeStyle = "rgba(214, 134, 134, 0.92)";
  strokeTongues();
}

/** Small housefly: two flapping wings with veins, body, head and red compound eyes. */
export function drawFlies(ctx: CanvasRenderingContext2D, flies: Fly[], now: number) {
  for (const fly of flies) {
    const fade = Math.min(Math.min(1, fly.ageMs / 180), Math.min(1, fly.ttlMs / 600));
    if (fade <= 0) continue;
    const angle = Math.atan2(fly.vy, fly.vx);
    const fx = Math.cos(angle);
    const fy = Math.sin(angle);
    const nx = -fy;
    const flap = 0.42 + 0.78 * Math.abs(Math.sin(0.095 * now + fly.wigglePhase));
    const u = fly.size;
    const baseX = fly.x - 0.6 * fx * u;
    const baseY = fly.y - 0.6 * fy * u;
    const wingOffset = 3.4 * u;
    const wingLen = 8.2 * u;
    const wingWidth = 4.1 * u * flap;

    ctx.globalAlpha = 0.42 * fade;
    ctx.fillStyle = "rgba(150, 140, 132, 0.45)";
    ctx.beginPath();
    ctx.ellipse(baseX + nx * wingOffset, baseY + fx * wingOffset, wingLen, wingWidth, angle + 0.36, 0, 2 * Math.PI);
    ctx.ellipse(baseX - nx * wingOffset, baseY - fx * wingOffset, wingLen, wingWidth, angle - 0.36, 0, 2 * Math.PI);
    ctx.fill();

    ctx.globalAlpha = 0.3 * fade;
    ctx.strokeStyle = "rgba(108, 96, 86, 0.7)";
    ctx.lineWidth = 0.6 * u;
    ctx.beginPath();
    ctx.moveTo(baseX + nx * (wingOffset - 1.5 * u), baseY + fx * (wingOffset - 1.5 * u));
    ctx.lineTo(
      baseX + nx * (wingOffset + 0.55 * wingLen) - 0.6 * fx * u,
      baseY + fx * (wingOffset + 0.55 * wingLen) - 0.6 * fy * u,
    );
    ctx.moveTo(baseX - nx * (wingOffset - 1.5 * u), baseY - fx * (wingOffset - 1.5 * u));
    ctx.lineTo(
      baseX - nx * (wingOffset + 0.55 * wingLen) - 0.6 * fx * u,
      baseY - fx * (wingOffset + 0.55 * wingLen) - 0.6 * fy * u,
    );
    ctx.stroke();

    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(42, 32, 26, 0.92)";
    ctx.beginPath();
    ctx.ellipse(fly.x - 0.6 * fx * u, fly.y - 0.6 * fy * u, 5.2 * u, 3.3 * u, angle, 0, 2 * Math.PI);
    ctx.fill();

    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = FLY_HIGHLIGHT;
    ctx.beginPath();
    ctx.ellipse(
      fly.x - 0.8 * fx * u + 0.6 * nx * u,
      fly.y - 0.8 * fy * u + 0.6 * fx * u,
      3.4 * u,
      1.3 * u,
      angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    const headX = fly.x + 4 * fx * u;
    const headY = fly.y + 4 * fy * u;
    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(28, 22, 18, 0.95)";
    ctx.beginPath();
    ctx.ellipse(headX, headY, 2.4 * u, 2.2 * u, angle, 0, 2 * Math.PI);
    ctx.fill();

    const eyeR = u;
    const eyeSpread = 1.1 * u;
    const leftX = headX + nx * eyeSpread;
    const leftY = headY + fx * eyeSpread;
    const rightX = headX - nx * eyeSpread;
    const rightY = headY - fx * eyeSpread;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = "rgba(232, 96, 60, 0.85)";
    ctx.beginPath();
    ctx.arc(leftX, leftY, eyeR, 0, 2 * Math.PI);
    ctx.moveTo(rightX + eyeR, rightY);
    ctx.arc(rightX, rightY, eyeR, 0, 2 * Math.PI);
    ctx.fill();

    ctx.globalAlpha = 0.75 * fade;
    ctx.fillStyle = FLY_HIGHLIGHT;
    const glintR = 0.35 * u;
    const glintOffset = 0.4 * u;
    ctx.beginPath();
    ctx.arc(leftX + fx * glintOffset, leftY + fy * glintOffset, glintR, 0, 2 * Math.PI);
    ctx.moveTo(rightX + fx * glintOffset + glintR, rightY + fy * glintOffset);
    ctx.arc(rightX + fx * glintOffset, rightY + fy * glintOffset, glintR, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
