export type SpriteSheet = ImageBitmap | HTMLImageElement;
export type ShadowSprite = OffscreenCanvas | HTMLCanvasElement;

type ShadowContext = Pick<
  CanvasRenderingContext2D,
  "filter" | "drawImage" | "globalCompositeOperation" | "fillStyle" | "fillRect"
>;

const SHADOW_CANVAS = 320;
const SHADOW_INSET = 32;
const SHADOW_DRAW = 256;

function createShadowCanvas(): { canvas: ShadowSprite; ctx: ShadowContext | null } {
  try {
    const canvas = new OffscreenCanvas(SHADOW_CANVAS, SHADOW_CANVAS);
    return { canvas, ctx: canvas.getContext("2d") };
  } catch {
    const canvas = document.createElement("canvas");
    canvas.width = SHADOW_CANVAS;
    canvas.height = SHADOW_CANVAS;
    return { canvas, ctx: canvas.getContext("2d") };
  }
}

export type SilhouetteSpec = {
  frames: number;
  /** Source rect of frame `i` in the sheet: [sx, sy, size]. */
  cell: (i: number) => [number, number, number];
  blurPx: number;
  tint: string;
};

/** Blurred, tinted per-frame silhouettes drawn under each sprite as a soft drop shadow. */
export function buildSilhouettes(sheet: SpriteSheet, spec: SilhouetteSpec): ShadowSprite[] {
  const out: ShadowSprite[] = [];
  for (let i = 0; i < spec.frames; i++) {
    const { canvas, ctx } = createShadowCanvas();
    if (ctx) {
      const [sx, sy, size] = spec.cell(i);
      ctx.filter = `blur(${spec.blurPx}px)`;
      ctx.drawImage(sheet, sx, sy, size, size, SHADOW_INSET, SHADOW_INSET, SHADOW_DRAW, SHADOW_DRAW);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = spec.tint;
      ctx.fillRect(0, 0, SHADOW_CANVAS, SHADOW_CANVAS);
    }
    out.push(canvas);
  }
  return out;
}

/**
 * Decode a sprite sheet off the main thread when possible, then build shadow silhouettes
 * during idle time. Returns a disposer.
 */
export function loadSpriteSheet(
  src: string,
  spec: SilhouetteSpec,
  handlers: {
    onSheetReady: (sheet: SpriteSheet) => void;
    onShadowsReady: (shadows: ShadowSprite[]) => void;
  },
): () => void {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  let disposed = false;
  let bitmap: SpriteSheet | null = null;

  const ready = (sheet: SpriteSheet) => {
    if (disposed) return;
    bitmap = sheet;
    handlers.onSheetReady(sheet);
    const build = () => {
      if (!disposed) handlers.onShadowsReady(buildSilhouettes(sheet, spec));
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(build, { timeout: 250 });
    } else {
      setTimeout(build, 0);
    }
  };

  const onLoad = () => {
    if (typeof createImageBitmap === "function") {
      createImageBitmap(img)
        .then(ready)
        .catch(() => ready(img));
    } else {
      ready(img);
    }
  };

  if (img.complete && img.naturalWidth > 0) onLoad();
  else img.addEventListener("load", onLoad, { once: true });

  return () => {
    disposed = true;
    img.removeEventListener("load", onLoad);
    if (bitmap && "close" in bitmap) bitmap.close();
  };
}
