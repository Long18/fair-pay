/** Integer-lattice hash in [0, 1). */
export function latticeHash(x: number, y: number, seed: number): number {
  let h =
    (Math.imul(x | 0, 0x165667b1) + Math.imul(y | 0, 0x27d4eb2f) + Math.imul(seed | 0, 0x4bf19f61)) | 0;
  h = Math.imul(h ^ (h >>> 13), 0x4bf19f61);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

export const smootherstep = (t: number) => t * t * (3 - 2 * t);

export const smoothstep = (edge0: number, edge1: number, x: number) =>
  smootherstep(Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))));

export function valueNoise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const sx = smootherstep(x - ix);
  const sy = smootherstep(y - iy);
  const top = latticeHash(ix, iy, seed) + (latticeHash(ix + 1, iy, seed) - latticeHash(ix, iy, seed)) * sx;
  const bottom =
    latticeHash(ix, iy + 1, seed) + (latticeHash(ix + 1, iy + 1, seed) - latticeHash(ix, iy + 1, seed)) * sx;
  return top + (bottom - top) * sy;
}

/** Seeded fBm used by the miniature-world terrain (lacunarity 2.03, gain 0.5). */
export function fractalNoise(x: number, y: number, seed = 0, octaves = 4): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * frequency, y * frequency, seed + 17 * i) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}

function tiledNoise(x: number, y: number, period: number, seed = 0): number {
  const wrap = (v: number) => ((v % period) + period) % period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const sx = smootherstep(x - ix);
  const sy = smootherstep(y - iy);
  const at = (cx: number, cy: number) => latticeHash(wrap(cx), wrap(cy), seed);
  const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
  return top + (at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx - top) * sy;
}

/** Seamless RGBA grain tile: R = soft clumps, G = metre-sized tussocks, B = streaks. */
export function grainTile(size = 256): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const octaves = (x: number, y: number, cells: number, seed: number, count: number) => {
    let sum = 0;
    let amplitude = 1;
    let norm = 0;
    for (let i = 0; i < count; i += 1) {
      const period = cells << i;
      sum += tiledNoise((x / size) * period, (y / size) * period, period, seed + 13 * i) * amplitude;
      norm += amplitude;
      amplitude *= 0.55;
    }
    return sum / norm;
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      out[i] = Math.round(255 * octaves(x, y, 32, 5, 3));
      out[i + 1] = Math.round(255 * octaves(x, y, 4, 9, 4));
      out[i + 2] = Math.round(
        128 * tiledNoise((x / size) * 8, (y / size) * 24, 8, 11) +
          127 * tiledNoise((x / size) * 16, (y / size) * 48, 16, 12),
      );
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Mulberry32 PRNG. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = Math.imul((state = (state + 0x6d2b79f5) >>> 0) ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Classic `fract(sin(dot) * 43758.5453)` hash on two integers. */
export function sineHash(a: number, b: number): number {
  const v = 43758.5453 * Math.sin(127.1 * a + 311.7 * b);
  return v - Math.floor(v);
}

export const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return -1.0 + 2.0 * mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;
