export type PaperSurface = { r: number; g: number; b: number };

export type PaperStyle = {
  brightness: number;
  warmth: number;
  grain: number;
  grainPop: number;
  fog: number;
  lightLeak: number;
  edgeFade: number;
  cornerRadius: number;
  edgeNoise: number;
  edgeMargin: number;
  contrast?: number;
};

/** Rounded matte frame (marketing hero). */
export const PAPER_FRAMED: PaperStyle = {
  brightness: 21,
  contrast: 31,
  warmth: 23,
  grain: 71,
  grainPop: 9,
  fog: 63,
  lightLeak: 12,
  edgeFade: 10,
  cornerRadius: 28,
  edgeNoise: 27,
  edgeMargin: 5,
};

/** Flush with page background — no visible outer matte border. */
export const PAPER_SEAMLESS: PaperStyle = {
  brightness: 18,
  contrast: 28,
  warmth: 20,
  grain: 58,
  grainPop: 7,
  fog: 42,
  lightLeak: 8,
  edgeFade: 0,
  cornerRadius: 0,
  edgeNoise: 0,
  edgeMargin: 0,
};

const PAPER = PAPER_SEAMLESS;

function hash2d(x: number, y: number): number {
  const h = 0x165667b1 * x + 0x27d4eb2f * y;
  let a = h;
  a = (a ^ (a >> 13)) * 0x4bf19f61;
  a = a ^ (a >> 16);
  return (a & 0x7fffffff) / 0x7fffffff;
}

function valueNoise(x: number, y: number, scale: number): number {
  const ox = x * scale;
  const oy = y * scale;
  const ix = Math.floor(ox);
  const iy = Math.floor(oy);
  const fx = ox - ix;
  const fy = oy - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

export function fractalNoise(x: number, y: number): number {
  return (
    0.6 * valueNoise(x, y, 0.004) +
    0.25 * valueNoise(x, y, 0.01) +
    0.15 * valueNoise(x, y, 0.025)
  );
}

function filmGrain(intensity: number, popThreshold: number, popAmp: number): number {
  const r = Math.random();
  if (r < 0.6 * popThreshold) return popAmp * (0.5 + 0.5 * Math.random()) * intensity;
  if (r < popThreshold) return -(popAmp * (0.3 + 0.4 * Math.random()) * intensity);
  return (((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * intensity * 2);
}

function roundedRectEdgeDist(
  x: number,
  y: number,
  width: number,
  height: number,
  style: PaperStyle,
): number {
  const margin = (style.edgeMargin / 100) * Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const innerW = cx - margin;
  const innerH = cy - margin;
  const cornerR = (style.cornerRadius / 100) * Math.min(innerW, innerH);
  const dx = Math.abs(x - cx) - (innerW - cornerR);
  const dy = Math.abs(y - cy) - (innerH - cornerR);
  const fx = Math.max(dx, 0);
  const fy = Math.max(dy, 0);
  return Math.sqrt(fx * fx + fy * fy) + Math.min(Math.max(dx, dy), 0) - cornerR;
}

export function createEdgeMask(
  width: number,
  height: number,
  style: PaperStyle = PAPER,
): Float32Array {
  const mask = new Float32Array(width * height);
  const noiseAmp = (style.edgeNoise / 100) * Math.min(width, height) * 0.06;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dist = roundedRectEdgeDist(x, y, width, height, style);
      if (noiseAmp > 0) {
        dist += (2 * fractalNoise(x, y) - 1) * noiseAmp;
      }
      mask[y * width + x] = dist;
    }
  }
  return mask;
}

function punchBackdropOutsideHole(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surface: PaperSurface,
  style: PaperStyle,
): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const geo = roundedRectEdgeDist(x, y, width, height, style);
      if (geo <= 0) continue;
      const p = 4 * (y * width + x);
      data[p] = surface.r;
      data[p + 1] = surface.g;
      data[p + 2] = surface.b;
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function renderPaperOverlay(
  canvas: HTMLCanvasElement,
  surface: PaperSurface,
  style: PaperStyle = PAPER,
): void {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const edgeFade = (style.edgeFade / 100) * Math.min(width, height) * 0.45;
  const grainIntensity = (style.grain / 100) * 80;
  const grainPop = style.grainPop / 100;
  const popThreshold = 0.15 * grainPop;
  const popAmp = 1.5 + 2.5 * grainPop;
  const warmth = 0.3 * style.warmth;
  const base = (style.brightness / 100) * 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = 4 * idx;
      const geo = roundedRectEdgeDist(x, y, width, height, style);
      if (geo > 0) continue;

      let r = warmth + base;
      let g = base;
      let b = -warmth + base;
      const grain = filmGrain(grainIntensity, popThreshold, popAmp);
      r += grain;
      g += grain;
      b += grain;
      const v = (r + g + b) / 3;
      // Dark grains read as a black rim once the edge fade makes them opaque.
      if (v < 0) continue;
      const alpha = Math.min(255, Math.max(0, 0.7 * v));

      data[p] = Math.min(255, 245 + Math.round(0.5 * warmth));
      data[p + 1] = 240;
      data[p + 2] = Math.max(0, 230 - Math.round(0.3 * warmth));
      data[p + 3] = Math.round(alpha);

      if (edgeFade > 0 && -geo < edgeFade) {
        const t = -geo / edgeFade;
        const fadeAlpha = Math.round(255 * (1 - t * t * (3 - 2 * t)));
        const srcA = data[p + 3] / 255;
        const blend = fadeAlpha / 255;
        const outA = srcA + blend * (1 - srcA);
        if (outA > 0) {
          data[p] = Math.round(
            (data[p] * srcA + surface.r * blend * (1 - srcA)) / outA,
          );
          data[p + 1] = Math.round(
            (data[p + 1] * srcA + surface.g * blend * (1 - srcA)) / outA,
          );
          data[p + 2] = Math.round(
            (data[p + 2] * srcA + surface.b * blend * (1 - srcA)) / outA,
          );
        }
        data[p + 3] = Math.round(255 * outA);
      }
    }
  }

  ctx.putImageData(image, 0, 0);

  const fog = (style.fog / 100) * 0.35;
  const diag = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
  const fogGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0.05 * width,
    width / 2,
    height / 2,
    diag,
  );
  fogGrad.addColorStop(0, `rgba(240, 235, 228, ${fog})`);
  fogGrad.addColorStop(0.5, `rgba(240, 235, 228, ${0.6 * fog})`);
  fogGrad.addColorStop(1, `rgba(220, 215, 210, ${0.8 * fog})`);
  ctx.fillStyle = fogGrad;
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillRect(0, 0, width, height);

  const leak = (style.lightLeak / 100) * 0.35;
  for (const spot of [
    { x: 0.15 * width, y: 0.2 * height, r: 0.5 * width },
    { x: 0.85 * width, y: 0.7 * height, r: 0.4 * width },
    { x: 0.5 * width, y: 0.1 * height, r: 0.35 * width },
  ]) {
    const g = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
    g.addColorStop(0, `rgba(255, 252, 245, ${leak})`);
    g.addColorStop(0.4, `rgba(255, 250, 240, ${0.4 * leak})`);
    g.addColorStop(1, "rgba(255, 250, 240, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = "source-over";
  punchBackdropOutsideHole(ctx, width, height, surface, style);
}
