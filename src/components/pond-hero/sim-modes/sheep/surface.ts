export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Surface = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: Ctx2D };

export function createSurface(w: number, h: number): Surface | null {
  let canvas: OffscreenCanvas | HTMLCanvasElement;
  try {
    canvas = new OffscreenCanvas(w, h);
  } catch {
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  return ctx ? { canvas, ctx } : null;
}
