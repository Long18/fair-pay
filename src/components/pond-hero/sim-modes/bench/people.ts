import { pickFrom, TAU, type Rng } from "./math";
import { project, pt, shadowOf, type Pt } from "./projection";

export type Look = {
  coat: string;
  legs: string;
  shoes: string;
  hair: string;
  skin: string;
  hairStyle: number;
  /** 0 none, 1 beanie, 2 cap. */
  hat: number;
  hatColor: string;
  scarf: string | null;
  longCoat: boolean;
  bag: string | null;
  scale: number;
};

export type Joint3 = [number, number, number];

export type Pose = {
  x: number;
  y: number;
  heading: number;
  ph: number;
  stride: number;
  sitting: boolean;
  seat?: number;
  look: number;
  handR?: Joint3 | null;
  handL?: Joint3 | null;
};

const COATS = [
  "#f4f1ea",
  "#e9e1d0",
  "#c9a27a",
  "#dcc9a6",
  "#98b4cc",
  "#f0d6c8",
  "#d4785a",
  "#f7f4ee",
  "#a6ba8e",
  "#4e6a8e",
  "#e2bc5c",
  "#b8c8d8",
  "#e8a4a0",
];
const HAIR = ["#2a211c", "#4a3424", "#8a6a44", "#d8bc88", "#a8a8a2", "#7a3e22", "#161210"];
const SKIN = ["#efc9a4", "#cf9a76", "#8c5a3c", "#f4d6ba", "#b4784e", "#60402c"];
const ACCENT = ["#c4503c", "#e4bc4c", "#4e86a0", "#f2ece0", "#7e9a5a", "#e08a74"];
const LEGS = ["#2e3644", "#4a4640", "#3c5274", "#7a6a56", "#d8d0c0", "#262628"];

/** Rim light direction: towards the low sun. */
const RIM = Math.atan2(0.22, -0.78);

export function randomLook(r: Rng, scale = 1): Look {
  const hatRoll = r();
  return {
    coat: pickFrom(COATS, r),
    legs: pickFrom(LEGS, r),
    shoes: r() < 0.3 ? "#f2f0ea" : "#2a2624",
    hair: pickFrom(HAIR, r),
    skin: pickFrom(SKIN, r),
    hairStyle: (4 * r()) | 0,
    hat: hatRoll < 0.18 ? 1 : 2 * +(hatRoll < 0.28),
    hatColor: pickFrom(ACCENT, r),
    scarf: r() < 0.3 ? pickFrom(ACCENT, r) : null,
    longCoat: r() < 0.35,
    bag: r() < 0.25 ? pickFrom(["#7a5a3a", "#2e2e30", "#c8b490"], r) : null,
    scale,
  };
}

// Joints: 0/1 feet, 2/3 knees, 4/5 hips, 6/7 shoulders, 8/9 elbows,
// 10/11 hands, 12 neck, 13 head, 14 hem, 15 waist.
const local = new Float32Array(48);
const setJ = (i: number, u: number, v: number, z: number) => {
  local[3 * i] = u;
  local[3 * i + 1] = v;
  local[3 * i + 2] = z;
};
/** Projected joints of the last `pose()` call. */
export const J: Pt[] = Array.from({ length: 16 }, pt);

export function poseSkeleton(p: Pose, look: Look, m: number, shadow: boolean) {
  const swing = Math.sin(p.ph) * p.stride;
  const lift = 0.07 * p.stride;
  if (p.sitting) {
    const seat = p.seat ?? 0.46;
    const low = seat < 0.25;
    setJ(4, -0.06, -0.1, seat);
    setJ(5, -0.06, 0.1, seat);
    if (low) {
      setJ(2, 0.3, -0.16, 0.28);
      setJ(3, 0.3, 0.16, 0.28);
      setJ(0, 0.52, -0.1, 0.04);
      setJ(1, 0.52, 0.1, 0.04);
    } else {
      setJ(2, 0.36, -0.11, seat + 0.04);
      setJ(3, 0.36, 0.11, seat + 0.04);
      setJ(0, 0.48, -0.12, 0.02);
      setJ(1, 0.46, 0.13, 0.02);
    }
    setJ(6, -0.12, -0.2, seat + 0.52);
    setJ(7, -0.12, 0.2, seat + 0.52);
    setJ(8, 0.02, -0.24, seat + 0.2);
    setJ(9, 0.02, 0.24, seat + 0.2);
    setJ(10, 0.24, -0.16, low ? 0.3 : seat + 0.08);
    setJ(11, 0.24, 0.16, low ? 0.3 : seat + 0.08);
    setJ(12, -0.08, 0, seat + 0.6);
    setJ(13, -0.06, 0, seat + 0.73);
    setJ(14, 0.12, 0, seat + 0.04);
    setJ(15, -0.1, 0, seat + 0.34);
  } else {
    setJ(0, 0.3 * swing, -0.1, Math.max(0, Math.cos(p.ph)) * lift);
    setJ(1, -0.3 * swing, 0.1, Math.max(0, -Math.cos(p.ph)) * lift);
    setJ(2, 0.15 * swing + 0.05, -0.1, 0.5);
    setJ(3, -0.15 * swing + 0.05, 0.1, 0.5);
    setJ(4, 0, -0.1, 0.92);
    setJ(5, 0, 0.1, 0.92);
    setJ(6, 0, -0.2, 1.42);
    setJ(7, 0, 0.2, 1.42);
    setJ(8, -0.1 * swing - 0.02, -0.24, 1.12);
    setJ(9, 0.1 * swing - 0.02, 0.24, 1.12);
    setJ(10, -0.24 * swing, -0.25, 0.84);
    setJ(11, 0.24 * swing, 0.25, 0.84);
    setJ(12, 0.02, 0, 1.5);
    setJ(13, 0.03, 0, 1.63);
    setJ(14, 0, 0, look.longCoat ? 0.55 : 0.82);
    setJ(15, 0.01, 0, 1.18);
  }
  if (p.handR) {
    setJ(11, p.handR[0], p.handR[1], p.handR[2]);
    setJ(9, 0.3 * p.handR[0], 0.27, (p.handR[2] + local[23]) * 0.45);
  }
  if (p.handL) {
    setJ(10, p.handL[0], p.handL[1], p.handL[2]);
    setJ(8, 0.3 * p.handL[0], -0.27, (p.handL[2] + local[20]) * 0.45);
  }
  const c = Math.cos(p.heading);
  const s = Math.sin(p.heading);
  const k = m * look.scale;
  for (let i = 0; i < 16; i++) {
    const u = local[3 * i] * k;
    const v = local[3 * i + 1] * k;
    const z = local[3 * i + 2] * k;
    const x = p.x + u * c - v * s;
    const y = p.y + u * s + v * c;
    if (shadow) shadowOf(x, y, z, J[i]);
    else project(x, y, z, J[i]);
  }
}

function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number) {
  ctx.lineWidth = w * (a.k + b.k) * 0.5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(255 & n)})`;
}

export function drawFigureShadow(ctx: CanvasRenderingContext2D, p: Pose, look: Look, m: number) {
  poseSkeleton(p, look, m, true);
  const s = m * look.scale;
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.lineCap = "round";
  limb(ctx, J[0], J[4], 0.15 * s);
  limb(ctx, J[1], J[5], 0.15 * s);
  limb(ctx, J[14], J[15], 0.4 * s);
  limb(ctx, J[15], J[12], 0.42 * s);
  limb(ctx, J[6], J[10], 0.1 * s);
  limb(ctx, J[7], J[11], 0.1 * s);
  ctx.beginPath();
  ctx.arc(J[13].x, J[13].y, 0.13 * s, 0, TAU);
  ctx.fill();
}

export function drawFigure(ctx: CanvasRenderingContext2D, p: Pose, look: Look, m: number) {
  poseSkeleton(p, look, m, false);
  const s = m * look.scale;
  const child = look.scale < 0.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = look.legs;
  limb(ctx, J[4], J[2], 0.14 * s);
  limb(ctx, J[2], J[0], 0.12 * s);
  limb(ctx, J[5], J[3], 0.14 * s);
  limb(ctx, J[3], J[1], 0.12 * s);
  ctx.fillStyle = look.shoes;
  const hc = Math.cos(p.heading);
  const hs = Math.sin(p.heading);
  for (const f of [J[0], J[1]]) {
    ctx.beginPath();
    ctx.ellipse(f.x + hc * s * 0.06, f.y + hs * s * 0.06, 0.11 * s, 0.046 * s, p.heading, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = shadeHex(look.coat, 0.82);
  limb(ctx, J[14], J[15], (look.longCoat ? 0.36 : 0.3) * s);
  ctx.strokeStyle = shadeHex(look.coat, 0.9);
  limb(ctx, J[15], J[12], 0.32 * s);
  if (look.bag) {
    ctx.fillStyle = look.bag;
    const w = J[15];
    ctx.beginPath();
    ctx.ellipse(w.x - hc * s * 0.17, w.y - hs * s * 0.17, 0.14 * s, 0.09 * s, p.heading + Math.PI / 2, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = shadeHex(look.coat, 0.86);
  limb(ctx, J[6], J[8], 0.11 * s);
  limb(ctx, J[8], J[10], 0.1 * s);
  limb(ctx, J[7], J[9], 0.11 * s);
  limb(ctx, J[9], J[11], 0.1 * s);
  ctx.fillStyle = look.skin;
  for (const hand of [J[10], J[11]]) {
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 0.042 * s * hand.k, 0, TAU);
    ctx.fill();
  }

  // Shoulders: an ellipse across both shoulder joints, rim-lit from the sun.
  const sl = J[6];
  const sr = J[7];
  const sk = (sl.k + sr.k) / 2;
  const cx = (sl.x + sr.x) / 2;
  const cy = (sl.y + sr.y) / 2;
  const rot = Math.atan2(sr.y - sl.y, sr.x - sl.x);
  const rx = Math.hypot(sr.x - sl.x, sr.y - sl.y) / 2 + 0.06 * s * sk;
  const ry = 0.115 * s * sk;
  ctx.fillStyle = look.coat;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(20, 24, 30, 0.16)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 244, 214, 0.75)";
  ctx.lineWidth = Math.max(0.7, 0.03 * s);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, RIM - rot - 1.1, RIM - rot + 1.1);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 250, 236, 0.22)";
  ctx.beginPath();
  ctx.ellipse(cx - 0.25 * ry, cy + 0.1 * ry, 0.8 * rx, 0.5 * ry, rot, 0, TAU);
  ctx.fill();
  if (look.scarf) {
    ctx.fillStyle = look.scarf;
    ctx.beginPath();
    ctx.arc(J[12].x, J[12].y, 0.1 * s * sk, 0, TAU);
    ctx.fill();
  }

  const head = J[13];
  const hr = (child ? 0.14 : 0.112) * s * head.k;
  const face = p.heading + p.look;
  const fc = Math.cos(face);
  const fs = Math.sin(face);
  if (look.hairStyle === 1 && !p.sitting && look.hat === 0) {
    ctx.strokeStyle = look.hair;
    limb(ctx, head, J[15], 0.17 * s);
  }
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(head.x + fc * hr * 0.12, head.y + fs * hr * 0.12, 0.95 * hr, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(head.x + fc * hr * 0.9, head.y + fs * hr * 0.9, 0.2 * hr, 0, TAU);
  ctx.fill();
  const capR = look.hat !== 0 ? 1 : look.hairStyle === 3 ? 0.86 : 0.97;
  const capBack = look.hat !== 0 ? 0.12 : look.hairStyle === 3 ? 0.2 : 0.24;
  ctx.fillStyle = look.hat === 0 ? look.hair : look.hatColor;
  ctx.beginPath();
  ctx.arc(head.x - fc * hr * capBack, head.y - fs * hr * capBack, hr * capR, 0, TAU);
  ctx.fill();
  if (look.hat === 2) {
    ctx.beginPath();
    ctx.ellipse(head.x + fc * hr * 0.8, head.y + fs * hr * 0.8, 0.45 * hr, 0.72 * hr, face, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  }
  if (look.hat === 0 && look.hairStyle === 2) {
    ctx.beginPath();
    ctx.arc(head.x - fc * hr * 0.85, head.y - fs * hr * 0.85, 0.42 * hr, 0, TAU);
    ctx.fill();
  }
  if (look.hat === 1) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(head.x - fc * hr * 0.15, head.y - fs * hr * 0.15, 0.26 * hr, 0, TAU);
    ctx.fill();
  }
  if (look.hat === 0 && look.hairStyle !== 3) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(0.6, 0.12 * hr);
    ctx.beginPath();
    ctx.moveTo(head.x + fc * hr * 0.55 - fs * hr * 0.25, head.y + fs * hr * 0.55 + fc * hr * 0.25);
    ctx.lineTo(head.x - fc * hr * 0.25 - fs * hr * 0.15, head.y - fs * hr * 0.25 + fc * hr * 0.15);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255, 246, 225, 0.14)";
  ctx.beginPath();
  ctx.arc(head.x - 0.3 * hr, head.y + 0.2 * hr, 0.45 * hr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 244, 214, 0.8)";
  ctx.lineWidth = Math.max(0.7, 0.22 * hr);
  ctx.beginPath();
  ctx.arc(head.x, head.y, 0.95 * hr, RIM - 1, RIM + 1);
  ctx.stroke();
}
