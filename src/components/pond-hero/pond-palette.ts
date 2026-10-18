/** Water colors from baothiento.com fragment shader (`getWaterColor`). */
export const POND_WATER_REFERENCE = {
  deep: [0.02, 0.18, 0.32] as [number, number, number],
  mid: [0.25, 0.65, 0.6] as [number, number, number],
  sky: [0.5, 0.82, 0.88] as [number, number, number],
};

/** Paper matte fallback when `--background` is unavailable (site BG ≈ #f5f1ec). */
export const POND_PAPER_BACKDROP_FALLBACK = { r: 245, g: 241, b: 236 };
