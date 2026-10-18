/** A projected point: screen xy plus the perspective scale at that height. */
export type Pt = { x: number; y: number; k: number };

export const pt = (): Pt => ({ x: 0, y: 0, k: 1 });

/** The sun's shadow direction per unit of height (low sun in the west). */
export const SUN_X = 0.78;
export const SUN_Y = -0.22;

const camera = { cx: 0, cy: 0, hpx: 1 };

/** The lens hangs `40 m` above the lawn, centred on (cx, cy). */
export function setCamera(cx: number, cy: number, m: number) {
  camera.cx = cx;
  camera.cy = cy;
  camera.hpx = 40 * m;
}

/** Perspective projection of a point `z` above the ground. */
export function project(x: number, y: number, z: number, out: Pt): Pt {
  const k = camera.hpx / (camera.hpx - z);
  out.x = camera.cx + (x - camera.cx) * k;
  out.y = camera.cy + (y - camera.cy) * k;
  out.k = k;
  return out;
}

/** Where a point `z` above the ground casts its shadow. */
export function shadowOf(x: number, y: number, z: number, out: Pt): Pt {
  out.x = x + SUN_X * z;
  out.y = y + SUN_Y * z;
  out.k = 1;
  return out;
}

export type Projector = (u: number, v: number, z: number, out: Pt) => Pt;
