const scratch: [number, number] = [0, 0];

function hash2(x: number, y: number): number {
  return 43758.5453123 * Math.sin(127.1 * x + 311.7 * y) - Math.floor(43758.5453123 * Math.sin(127.1 * x + 311.7 * y));
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const v =
    (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
  return -1 + 2 * v;
}

function seaOctave(uvX: number, uvY: number, choppy: number): number {
  const n = smoothNoise(uvX + smoothNoise(uvX, uvY), uvY + smoothNoise(uvX, uvY));
  const wvX = 1 - Math.abs(Math.sin(uvX + n));
  const wvY = 1 - Math.abs(Math.sin(uvY + n));
  const swvX = Math.abs(Math.cos(uvX + n));
  const swvY = Math.abs(Math.cos(uvY + n));
  const mixX = wvX + (swvX - wvX) * wvX;
  const mixY = wvY + (swvY - wvY) * wvY;
  return Math.pow(1 - Math.pow(mixX * mixY, 0.65), choppy);
}

/** CPU wave height aligned with the WebGL pond (for duck bobbing). */
export function sampleWaveHeight(
  nx: number,
  ny: number,
  time: number,
  aspect: number,
): { height: number; slopeX: number; slopeY: number } {
  const cx = nx;
  const cy = ny;
  if (aspect >= 1) {
    scratch[0] = cx * aspect * 30;
    scratch[1] = 30 * cy;
  } else {
    scratch[0] = 30 * cx;
    scratch[1] = cy / aspect * 30;
  }
  const eps = 0.05;
  const h = waveHeightAt(scratch[0], scratch[1], time);
  const hx = waveHeightAt(scratch[0] + eps, scratch[1], time);
  const hy = waveHeightAt(scratch[0], scratch[1] + eps, time);
  return {
    height: h,
    slopeX: (hx - h) / eps,
    slopeY: (hy - h) / eps,
  };
}

function waveHeightAt(x: number, y: number, time: number): number {
  const seaTime = time * 0.8;
  let uvX = x;
  let uvY = y;
  let freq = 0.16;
  let amp = 0.6;
  let choppy = 4;
  let h = 0;

  const m00 = 1.6;
  const m01 = 1.2;
  const m10 = -1.2;
  const m11 = 1.6;

  for (let i = 0; i < 5; i++) {
    const d1 = seaOctave((uvX + seaTime) * freq, (uvY + seaTime) * freq, choppy);
    const d2 = seaOctave((uvX - seaTime) * freq, (uvY - seaTime) * freq, choppy);
    h += (d1 + d2) * amp;
    const nX = m00 * uvX + m01 * uvY;
    const nY = m10 * uvX + m11 * uvY;
    uvX = nX;
    uvY = nY;
    freq *= 1.9;
    amp *= 0.22;
    choppy = choppy + (1 - choppy) * 0.2;
  }
  return h;
}
