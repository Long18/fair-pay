import { createSurface, type Ctx2D, type Surface } from "./surface";

type SheepPalette = {
  wool: string;
  shadow: string;
  highlight: string;
  face: string;
  leg: string;
  ear: string;
};

const PALETTES: SheepPalette[] = [
  { wool: "#ede6d8", shadow: "#d4cbb8", highlight: "#f5f0e6", face: "#4a4038", leg: "#3a3228", ear: "#5a5048" },
  { wool: "#e8e0d0", shadow: "#cfc6b0", highlight: "#f2ece0", face: "#3e3830", leg: "#322c24", ear: "#4e4840" },
  { wool: "#f0ead8", shadow: "#d8d0bc", highlight: "#f8f4ea", face: "#524a40", leg: "#423a30", ear: "#625a50" },
];

export const PALETTE_COUNT = PALETTES.length;

type Pose = {
  jumping: boolean;
  rushing: boolean;
  /** 0..1 landing recovery (legs folding back). */
  landing: number;
  /** 0..1 flailing intensity while stuck on the fence. */
  struggle: number;
};

const KNEE_BEND = [0.65, 0.65, -0.15, -0.15];
const GAIT_WALK = [0, 1, Math.PI, Math.PI + 1];
const GAIT_RUSH = [0, 1.1, Math.PI, Math.PI + 1.1];
const FLAIL_RATE = [3.1, 2.3, 3.7, 2.9];
const FLAIL_PHASE = [0, 2.1, 4.3, 1.4];

function drawSheepBody(ctx: Ctx2D, size: number, legFrame: number, colorIdx: number, pose: Pose) {
  const pal = PALETTES[colorIdx % PALETTES.length];
  const bw = 0.58 * size;
  const bh = 0.4 * size;
  const phase = (legFrame / 8) * Math.PI * 2;
  const thigh = 0.14 * size;
  const shin = 0.15 * size;

  const leg = (hx: number, hy: number, hipAngle: number, kneeBend: number, color: string, hoof: boolean) => {
    const kx = hx + Math.sin(hipAngle) * thigh;
    const ky = hy + Math.cos(hipAngle) * thigh;
    const footAngle = hipAngle + kneeBend;
    const fx = kx + Math.sin(footAngle) * shin;
    const fy = ky + Math.cos(footAngle) * shin;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.04 * size;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    if (hoof) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 0.02 * size, 0.012 * size, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const hipX = [-(0.38 * bw), -(0.15 * bw), 0.15 * bw, 0.4 * bw];
  const hipY = 0.14 * bh;

  if (pose.struggle > 0) {
    const amp = 2.2 * pose.struggle;
    for (let i = 0; i < 4; i++) {
      const a = phase * FLAIL_RATE[i] + FLAIL_PHASE[i];
      const swing = Math.sin(a) * amp;
      if (i < 2) {
        leg(hipX[i], hipY, -0.4 + 0.5 * swing, 0.65 + 0.5 * Math.sin(1.7 * a) * amp, pal.leg, false);
      } else {
        leg(hipX[i], hipY, 0.3 + 0.45 * swing, -0.15 - 0.6 * Math.abs(Math.sin(1.3 * a)) * amp, pal.leg, false);
      }
    }
  } else if (pose.jumping) {
    for (let i = 0; i < 4; i++) {
      leg(hipX[i], hipY, i < 2 ? -0.4 : 0.3, i < 2 ? 1.5 : -0.6, pal.leg, false);
    }
  } else if (pose.landing > 0) {
    const k = 1 - pose.landing;
    for (let i = 0; i < 4; i++) {
      if (i < 2) leg(hipX[i], hipY, -0.35 * k, 0.65 + 0.4 * k, pal.leg, true);
      else leg(hipX[i], hipY, 0.4 * k, -0.15 - 0.35 * k, pal.leg, true);
    }
  } else {
    const gait = pose.rushing ? GAIT_RUSH : GAIT_WALK;
    const stride = pose.rushing ? 0.55 : 0.35;
    const lift = pose.rushing ? 0.5 : 0.25;
    const lean = [0.1, 0.1, 0, 0];
    for (let i = 0; i < 4; i++) {
      const cycle = ((((phase + gait[i]) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
      const hip = lean[i] + Math.sin(cycle * Math.PI * 2) * stride;
      const raise = cycle > 0.5 ? Math.sin((cycle - 0.5) * 2 * Math.PI) : 0;
      leg(hipX[i], hipY, hip, KNEE_BEND[i] * (1 + raise * lift), pal.leg, true);
    }
  }

  ctx.fillStyle = pal.wool;
  ctx.beginPath();
  ctx.moveTo(-(0.42 * bw), 0.2 * bh);
  ctx.quadraticCurveTo(-(0.62 * bw), 0.05 * bh, -(0.58 * bw), -(0.15 * bh));
  ctx.quadraticCurveTo(-(0.65 * bw), -(0.5 * bh), -(0.4 * bw), -(0.65 * bh));
  ctx.quadraticCurveTo(-(0.2 * bw), -(0.9 * bh), 0 * bw, -(0.75 * bh));
  ctx.quadraticCurveTo(0.2 * bw, -(0.95 * bh), 0.38 * bw, -(0.7 * bh));
  ctx.quadraticCurveTo(0.58 * bw, -(0.85 * bh), 0.68 * bw, -(0.5 * bh));
  ctx.quadraticCurveTo(0.85 * bw, -(0.3 * bh), 0.75 * bw, 0 * bh);
  ctx.quadraticCurveTo(0.8 * bw, 0.2 * bh, 0.55 * bw, 0.25 * bh);
  ctx.quadraticCurveTo(0.1 * bw, 0.35 * bh, -(0.42 * bw), 0.2 * bh);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = pal.shadow;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(0, 0.05 * bh, 0.55 * bw, 0.25 * bh, 0, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.highlight;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(-(0.05 * bw), -(0.35 * bh), 0.3 * bw, 0.2 * bh, -0.15, Math.PI, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  const headX = 0.72 * bw;
  const headY = -(0.12 * bh);
  const hw = 0.1 * size;
  const hh = 0.14 * size;
  const tilt = pose.rushing ? 0.2 : 0;
  ctx.save();
  if (tilt) {
    ctx.translate(headX - 0.5 * hw, headY);
    ctx.rotate(tilt);
    ctx.translate(-(headX - 0.5 * hw), -headY);
  }
  ctx.fillStyle = pal.face;
  ctx.beginPath();
  ctx.ellipse(headX - 0.3 * hw, headY - 1.15 * hh, 0.28 * hw, 0.45 * hh, -0.35, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headX + 0.4 * hw, headY - 1.1 * hh, 0.28 * hw, 0.45 * hh, 0.25, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = pal.face;
  ctx.beginPath();
  ctx.moveTo(headX - 0.7 * hw, headY - 0.3 * hh);
  ctx.quadraticCurveTo(headX - 0.5 * hw, headY - 0.9 * hh, headX + 0.2 * hw, headY - 0.75 * hh);
  ctx.quadraticCurveTo(headX + 0.9 * hw, headY - 0.5 * hh, headX + 1.1 * hw, headY + 0.05 * hh);
  ctx.quadraticCurveTo(headX + 1.15 * hw, headY + 0.4 * hh, headX + 0.8 * hw, headY + 0.6 * hh);
  ctx.quadraticCurveTo(headX + 0.2 * hw, headY + 0.75 * hh, headX - 0.5 * hw, headY + 0.5 * hh);
  ctx.quadraticCurveTo(headX - 0.85 * hw, headY + 0.2 * hh, headX - 0.7 * hw, headY - 0.3 * hh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1510";
  ctx.beginPath();
  ctx.arc(headX + 0.4 * hw, headY - 0.1 * hh, 0.026 * size, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(headX + 0.46 * hw, headY - 0.2 * hh, 0.012 * size, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Tail tuft
  ctx.fillStyle = pal.wool;
  ctx.beginPath();
  ctx.arc(-(0.62 * bw), -(0.2 * bh), 0.07 * size, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = pal.highlight;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(-(0.64 * bw), -(0.28 * bh), 0.035 * size, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

const spriteCache = new Map<number, Surface>();

/**
 * Draw a sheep centred at (x, y) from a cached pre-rendered sprite. Size is
 * bucketed to 4px; landing / struggle amounts are quantised so the cache stays small.
 */
export function drawSheepSprite(
  ctx: Ctx2D,
  x: number,
  y: number,
  size: number,
  legFrame: number,
  colorIdx: number,
  jumpProgress: number,
  rushing = false,
  landing = 0,
  struggle = 0,
) {
  const bucket = ((size / 4) | 0) * 4 || 4;
  const landStep = landing > 0 ? (4 * landing) | 0 : 0;
  const struggleStep = struggle > 0 ? (6 * struggle) | 0 : 0;
  const poseCode =
    struggleStep > 0
      ? 10 + struggleStep
      : jumpProgress > 0.1
        ? 1
        : landStep > 0
          ? 2 + landStep
          : rushing
            ? 7
            : 0;
  const key = colorIdx | (legFrame << 2) | (bucket << 5) | (poseCode << 13);
  const dim = Math.ceil(1.6 * bucket * 2);
  let sprite = spriteCache.get(key);
  if (!sprite) {
    const created = createSurface(dim, dim);
    if (!created) return;
    sprite = created;
    sprite.ctx.translate(dim / 2, dim / 2);
    drawSheepBody(sprite.ctx, bucket, legFrame, colorIdx, {
      jumping: jumpProgress > 0.1,
      rushing,
      landing: landStep / 4,
      struggle: struggleStep / 6,
    });
    spriteCache.set(key, sprite);
  }
  ctx.drawImage(sprite.canvas, x - dim / 2, y - dim / 2);
}
