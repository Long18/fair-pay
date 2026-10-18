import { ctx2d, makeCanvas } from "./math";

export type CachedSprite = { cv: HTMLCanvasElement; size: number };

const cache = new Map<string, CachedSprite>();

/** A square sprite painted once around its centre and reused by key. */
export function cachedSprite(
  key: string,
  size: number,
  dpr: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): CachedSprite {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = makeCanvas(size * dpr, size * dpr);
  const ctx = ctx2d(cv);
  ctx.scale(dpr, dpr);
  ctx.translate(size / 2, size / 2);
  paint(ctx, size);
  const s = { cv, size };
  cache.set(key, s);
  return s;
}
