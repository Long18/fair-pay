export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Scratch = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: Ctx2D };

export const TAU = 2 * Math.PI;

/** Park–Miller LCG returning values in [0, 1). */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => (s = (16807 * s) % 0x7fffffff) / 0x7fffffff;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function hash2d(x: number, y: number): number {
  let a = 0x165667b1 * x + 0x27d4eb2f * y;
  a = (a ^ (a >> 13)) * 0x4bf19f61;
  return ((a ^ (a >> 16)) & 0x7fffffff) / 0x7fffffff;
}

export function filmGrain(intensity: number, popThreshold: number, popAmp: number): number {
  const r = Math.random();
  if (r < 0.6 * popThreshold) return popAmp * (0.5 + 0.5 * Math.random()) * intensity;
  if (r < popThreshold) return -(popAmp * (0.3 + 0.4 * Math.random()) * intensity);
  return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * intensity * 2;
}

/** 2D scratch canvas; OffscreenCanvas when available. */
export function createScratch(w: number, h: number): Scratch {
  let canvas: OffscreenCanvas | HTMLCanvasElement;
  try {
    canvas = new OffscreenCanvas(w, h);
  } catch {
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d") as Ctx2D;
  return { canvas, ctx };
}
