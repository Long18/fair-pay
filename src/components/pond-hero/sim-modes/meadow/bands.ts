import { seeded } from "./noise";
import { MEADOW_SUBJECT_SCALE, meadowTerrainHeight, type Point } from "./world";

export type FigureKind = "sheep" | "mill" | "sails";

export type Pose = {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  sx: number;
  sy: number;
  sz: number;
};

export type Member = {
  kind: FigureKind;
  ahead: number;
  side: number;
  scale: number;
  phase: number;
  shade: number;
  lift: number;
  rate: number;
  radius?: number;
  tint?: string;
};

export type Band = {
  id: string;
  region: string;
  motion: "graze" | "turn";
  footing: "land";
  seconds: number;
  points: Point[];
  members: Member[];
};

export const idlePose = (): Pose => ({ x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, sx: 1, sy: 1, sz: 1 });

/** Windmill hub height and southward offset (before member scale). */
export const MILL_HUB = { up: 4.8, south: 1.72 };

const GRAZE_STRIDE = { lift: 0.18, rate: 0.7 };
const STILL = { lift: 0, rate: 0 };
const TAU = 2 * Math.PI;

function grazers(
  kind: FigureKind,
  count: number,
  spread: number,
  stride: { lift: number; rate: number },
  seed: number,
  { scale = 1, radius = 2, shade = [0.86, 1.05] }: { scale?: number; radius?: number; shade?: [number, number] } = {},
): Member[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * spread;
    return {
      kind,
      ahead: Math.cos(angle) * dist,
      side: Math.sin(angle) * dist * 0.7,
      scale: scale * (0.9 + 0.2 * rand()),
      phase: rand(),
      shade: shade[0] + rand() * (shade[1] - shade[0]),
      radius: radius * (0.6 + 0.8 * rand()),
      ...stride,
    };
  });
}

const mill = (scale: number, shade: number, sailPhase: number): Member[] => [
  { kind: "mill", ahead: 0, side: 0, scale, phase: 0, shade, ...STILL },
  { kind: "sails", ahead: 0, side: 0, scale, phase: sailPhase, shade, ...STILL },
];

/** The miniature-world flocks and mills, relocated onto the meadow (shepherds dropped). */
export const MEADOW_BANDS: Band[] = [
  {
    id: "meadow-flock-reach",
    region: "The Reach",
    motion: "graze",
    footing: "land",
    seconds: 52,
    points: [{ x: 216, y: 494 }],
    members: grazers("sheep", 8, 6.5, GRAZE_STRIDE, 105, { scale: 1.2 }),
  },
  {
    id: "meadow-flock-riverlands",
    region: "The Riverlands",
    motion: "graze",
    footing: "land",
    seconds: 46,
    points: [{ x: 285, y: 544 }],
    members: grazers("sheep", 9, 7, GRAZE_STRIDE, 104, { scale: 1.2 }),
  },
  {
    id: "meadow-flock-stormlands",
    region: "The Stormlands",
    motion: "graze",
    footing: "land",
    seconds: 40,
    points: [{ x: 332, y: 488 }],
    members: grazers("sheep", 7, 6, GRAZE_STRIDE, 106, { scale: 1.2 }),
  },
  {
    id: "meadow-mill-reach",
    region: "The Reach",
    motion: "turn",
    footing: "land",
    seconds: 9,
    points: [{ x: 204, y: 520 }],
    members: mill(1.2, 1, 0),
  },
  {
    id: "meadow-mill-mander",
    region: "The Reach",
    motion: "turn",
    footing: "land",
    seconds: 11,
    points: [{ x: 305, y: 465 }],
    members: mill(1.1, 0.95, 0.4),
  },
];

function memberPose(band: Band, member: Member, time: number, out: Pose): Pose {
  const anchor = band.points[0];
  out.z = 0;
  out.pitch = 0;
  out.roll = 0;
  out.sx = out.sy = out.sz = member.scale;
  if (band.motion === "graze") {
    const dir = member.phase < 0.5 ? 1 : -1;
    const sweep = TAU * (time / band.seconds + member.phase);
    const angle = dir * (sweep + 0.3 * Math.sin(3 * sweep));
    const radius = member.radius ?? 1;
    out.x = anchor.x + member.ahead + radius * Math.cos(angle);
    out.y = anchor.y + member.side + 0.7 * radius * Math.sin(angle);
    out.heading = Math.atan2(0.7 * dir * Math.cos(angle), -dir * Math.sin(angle));
    out.z = member.rate
      ? member.lift * Math.pow(Math.max(0, Math.sin(TAU * (member.rate * time + member.phase))), 6)
      : 0;
    return out;
  }
  out.x = anchor.x;
  out.y = anchor.y;
  out.heading = 0;
  if (member.kind === "sails") {
    out.y += MILL_HUB.south * member.scale;
    out.z = MILL_HUB.up * member.scale;
    out.pitch = -TAU * (time / band.seconds + member.phase);
  }
  return out;
}

export function meadowPose(band: Band, member: Member, time: number, out: Pose): Pose {
  memberPose(band, member, time, out);
  out.sx *= MEADOW_SUBJECT_SCALE;
  out.sy *= MEADOW_SUBJECT_SCALE;
  out.sz *= MEADOW_SUBJECT_SCALE;
  out.z *= MEADOW_SUBJECT_SCALE;
  if (band.motion === "turn") out.y = band.points[0].y + (out.y - band.points[0].y) * MEADOW_SUBJECT_SCALE;
  return out;
}

/** Ground height under a figure; mills stay planted at their anchor. */
export function meadowFloor(band: Band, pose: Pose): number {
  const at = band.motion === "turn" ? band.points[0] : pose;
  return meadowTerrainHeight(at.x, at.y);
}

export const FIRST_SHEEP: Member = MEADOW_BANDS.flatMap((b) => b.members).find((m) => m.kind === "sheep")!;
