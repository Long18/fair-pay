import { PAPER_FRAMED, renderPaperOverlay, type PaperStyle } from "../../gl/paper";

export type Rgb = { r: number; g: number; b: number };

/**
 * Size `canvas` to `w`×`h` CSS px and paint the rounded paper matte. Everything
 * outside the rounded hole is filled with `backdrop` so the frame blends into
 * the surrounding page.
 */
export function renderSimOverlay(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  backdrop: Rgb,
  style: PaperStyle = PAPER_FRAMED,
) {
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  renderPaperOverlay(canvas, backdrop, style);
}

export function rgbCss({ r, g, b }: Rgb, alpha = 1): string {
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
