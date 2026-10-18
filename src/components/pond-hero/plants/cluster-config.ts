import { fractalNoise, PAPER_FRAMED } from "../gl/paper";

export type PlantEdge = "bottom" | "top" | "left" | "right";
export type BladeType = "reed" | "cattail";

export type PlantBlade = {
  baseX: number;
  baseY: number;
  height: number;
  lean: number;
  curve: number;
  width: number;
  color: string;
  windPhase: number;
  windFlex: number;
  type: BladeType;
  headHeight?: number;
};

export type PlantCluster = {
  x: number;
  y: number;
  blades: PlantBlade[];
};

type ClusterSpec = {
  edge: PlantEdge;
  along: number;
  bladeCount: number;
  spread: number;
  heightRange: [number, number];
  cattailChance: number;
};

/** Cluster layout from baothiento.com pond hero. */
const CLUSTER_SPECS: ClusterSpec[] = [
  { edge: "bottom", along: 0.06, bladeCount: 12, spread: 0.03, heightRange: [80, 150], cattailChance: 0.25 },
  { edge: "bottom", along: 0.12, bladeCount: 10, spread: 0.025, heightRange: [70, 130], cattailChance: 0.2 },
  { edge: "bottom", along: 0.18, bladeCount: 8, spread: 0.025, heightRange: [55, 110], cattailChance: 0.15 },
  { edge: "bottom", along: 0.24, bladeCount: 6, spread: 0.02, heightRange: [42, 90], cattailChance: 0.1 },
  { edge: "bottom", along: 0.3, bladeCount: 4, spread: 0.018, heightRange: [35, 70], cattailChance: 0.1 },
  { edge: "bottom", along: 0.42, bladeCount: 3, spread: 0.02, heightRange: [28, 55], cattailChance: 0.15 },
  { edge: "bottom", along: 0.55, bladeCount: 3, spread: 0.018, heightRange: [25, 50], cattailChance: 0.2 },
  { edge: "bottom", along: 0.7, bladeCount: 4, spread: 0.018, heightRange: [35, 70], cattailChance: 0.1 },
  { edge: "bottom", along: 0.76, bladeCount: 5, spread: 0.02, heightRange: [38, 85], cattailChance: 0.1 },
  { edge: "bottom", along: 0.82, bladeCount: 7, spread: 0.025, heightRange: [52, 105], cattailChance: 0.15 },
  { edge: "bottom", along: 0.88, bladeCount: 9, spread: 0.025, heightRange: [62, 125], cattailChance: 0.2 },
  { edge: "bottom", along: 0.94, bladeCount: 11, spread: 0.03, heightRange: [75, 145], cattailChance: 0.25 },
  { edge: "left", along: 0.22, bladeCount: 3, spread: 0.01, heightRange: [32, 62], cattailChance: 0.3 },
  { edge: "left", along: 0.35, bladeCount: 3, spread: 0.012, heightRange: [35, 70], cattailChance: 0.3 },
  { edge: "left", along: 0.5, bladeCount: 4, spread: 0.012, heightRange: [42, 84], cattailChance: 0.35 },
  { edge: "left", along: 0.65, bladeCount: 5, spread: 0.015, heightRange: [48, 98], cattailChance: 0.3 },
  { edge: "left", along: 0.8, bladeCount: 6, spread: 0.018, heightRange: [55, 110], cattailChance: 0.3 },
  { edge: "right", along: 0.25, bladeCount: 3, spread: 0.01, heightRange: [32, 62], cattailChance: 0.3 },
  { edge: "right", along: 0.38, bladeCount: 3, spread: 0.012, heightRange: [35, 70], cattailChance: 0.35 },
  { edge: "right", along: 0.52, bladeCount: 4, spread: 0.012, heightRange: [38, 76], cattailChance: 0.3 },
  { edge: "right", along: 0.68, bladeCount: 5, spread: 0.015, heightRange: [45, 90], cattailChance: 0.3 },
  { edge: "right", along: 0.82, bladeCount: 6, spread: 0.018, heightRange: [52, 105], cattailChance: 0.25 },
  { edge: "top", along: 0.08, bladeCount: 6, spread: 0.02, heightRange: [48, 98], cattailChance: 0.2 },
  { edge: "top", along: 0.15, bladeCount: 4, spread: 0.018, heightRange: [38, 76], cattailChance: 0.15 },
  { edge: "top", along: 0.35, bladeCount: 3, spread: 0.018, heightRange: [28, 55], cattailChance: 0.2 },
  { edge: "top", along: 0.6, bladeCount: 3, spread: 0.018, heightRange: [25, 52], cattailChance: 0.25 },
  { edge: "top", along: 0.85, bladeCount: 4, spread: 0.018, heightRange: [35, 70], cattailChance: 0.15 },
  { edge: "top", along: 0.92, bladeCount: 5, spread: 0.02, heightRange: [45, 90], cattailChance: 0.2 },
];

const REED_PALETTE = [
  "rgba(120, 160, 105, 0.72)",
  "rgba(130, 168, 112, 0.68)",
  "rgba(112, 152, 100, 0.65)",
  "rgba(135, 172, 118, 0.62)",
  "rgba(125, 164, 108, 0.68)",
];

/** Signed distance to the paper hole's noisy rounded edge (negative = inside). */
function paperEdgeDist(x: number, y: number, w: number, h: number): number {
  const style = PAPER_FRAMED;
  const margin = (style.edgeMargin / 100) * Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const innerW = cx - margin;
  const innerH = cy - margin;
  const cornerR = (style.cornerRadius / 100) * Math.min(innerW, innerH);
  const noiseAmp = (style.edgeNoise / 100) * Math.min(w, h) * 0.06;
  const dx = Math.abs(x - cx) - (innerW - cornerR);
  const dy = Math.abs(y - cy) - (innerH - cornerR);
  const fx = Math.max(dx, 0);
  const fy = Math.max(dy, 0);
  let d = Math.sqrt(fx * fx + fy * fy) + Math.min(Math.max(dx, dy), 0) - cornerR;
  if (noiseAmp > 0) d += (2 * fractalNoise(x, y) - 1) * noiseAmp;
  return d;
}

/** Normalized position 20px inside the visible water edge along `edge` at `along`. */
function anchorInsideEdge(edge: PlantEdge, along: number, w: number, h: number): number {
  const inside = (d: number) => d < -20;
  if (edge === "bottom" || edge === "top") {
    const x = along * w;
    let lo = edge === "bottom" ? 0.5 * h : 0;
    let hi = edge === "bottom" ? h : 0.5 * h;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const ok = inside(paperEdgeDist(x, mid, w, h));
      if (edge === "bottom") {
        if (ok) lo = mid;
        else hi = mid;
      } else if (ok) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return (lo + hi) / 2 / h;
  }
  const y = along * h;
  let lo = edge === "right" ? 0.5 * w : 0;
  let hi = edge === "right" ? w : 0.5 * w;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const ok = inside(paperEdgeDist(mid, y, w, h));
    if (edge === "right") {
      if (ok) lo = mid;
      else hi = mid;
    } else if (ok) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2 / w;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Deterministic reed/cattail clusters hugging the pond edge (`w`×`h` = water size in px). */
export function buildPlantClusters(
  w: number,
  h: number,
  options?: { includeTop?: boolean; seed?: number },
): PlantCluster[] {
  const rand = mulberry32(options?.seed ?? 42);
  const specs = options?.includeTop
    ? CLUSTER_SPECS
    : CLUSTER_SPECS.filter((s) => s.edge !== "top");

  return specs.map((spec) => {
    const depth = anchorInsideEdge(spec.edge, spec.along, w, h);
    const horizontal = spec.edge === "bottom" || spec.edge === "top";
    const anchorX = horizontal ? spec.along : depth;
    const anchorY = horizontal ? depth : spec.along;
    const blades: PlantBlade[] = [];

    for (let i = 0; i < spec.bladeCount; i++) {
      const t = spec.bladeCount > 1 ? i / (spec.bladeCount - 1) : 0.5;
      const isCattail = rand() < spec.cattailChance;
      const baseLean = (t - 0.5) * 0.8;
      let spreadX = (rand() - 0.5) * spec.spread;
      let spreadY = (rand() - 0.5) * spec.spread * 0.3;
      if (!horizontal) [spreadX, spreadY] = [spreadY, spreadX];
      const [hMin, hMax] = spec.heightRange;
      const height = hMin + rand() * (hMax - hMin);

      blades.push({
        baseX: anchorX + spreadX,
        baseY: anchorY + spreadY,
        height,
        lean: baseLean + (rand() - 0.5) * 0.3,
        curve: 0.15 + 0.35 * rand(),
        width: isCattail ? 1.2 + 0.6 * rand() : 0.6 + 0.9 * rand(),
        color: REED_PALETTE[Math.floor(rand() * REED_PALETTE.length)],
        windPhase: rand() * Math.PI * 2,
        windFlex: 0.3 + 0.5 * rand(),
        type: isCattail ? "cattail" : "reed",
        headHeight: isCattail ? 8 + 7 * rand() : undefined,
      });
    }

    blades.sort((a, b) => b.height - a.height);
    return { x: anchorX, y: anchorY, blades };
  });
}
