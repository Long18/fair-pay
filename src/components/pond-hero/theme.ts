import { useMemo } from "react";
import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import {
  POND_PAPER_BACKDROP_FALLBACK,
  POND_WATER_REFERENCE,
} from "./pond-palette";

/** Resolve FairPay design tokens for canvas layers (light/dark). */
export type PondTheme = {
  /** Page/card backdrop — paper matte punches to this color. */
  backdropRgb: { r: number; g: number; b: number };
  surfaceRgb: { r: number; g: number; b: number };
  foregroundMuted: string;
  waterDeep: [number, number, number];
  waterMid: [number, number, number];
  waterSky: [number, number, number];
};

let probeCtx: CanvasRenderingContext2D | null = null;

/** Resolve any CSS color (oklch, hsl, …) to the exact sRGB the browser paints. */
function resolveCssColor(raw: string): { r: number; g: number; b: number } | null {
  if (!raw) return null;
  if (!probeCtx) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    probeCtx = c.getContext("2d", { willReadFrequently: true });
  }
  const ctx = probeCtx;
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 ? null : { r, g, b };
}

export function resolvePondTheme(themeRevision?: string): PondTheme {
  void themeRevision;
  if (typeof document === "undefined") {
    return {
      backdropRgb: POND_PAPER_BACKDROP_FALLBACK,
      surfaceRgb: { r: 255, g: 255, b: 255 },
      foregroundMuted: "rgba(100, 116, 139, 0.7)",
      waterDeep: [...POND_WATER_REFERENCE.deep],
      waterMid: [...POND_WATER_REFERENCE.mid],
      waterSky: [...POND_WATER_REFERENCE.sky],
    };
  }
  const root = document.documentElement;
  const background = getComputedStyle(root).getPropertyValue("--background").trim();
  const card = getComputedStyle(root).getPropertyValue("--card").trim();
  const muted = getComputedStyle(root).getPropertyValue("--muted-foreground").trim();
  const backdrop =
    resolveCssColor(background) ??
    resolveCssColor(getComputedStyle(document.body).backgroundColor) ??
    POND_PAPER_BACKDROP_FALLBACK;
  const surface = resolveCssColor(card) ?? backdrop;

  return {
    backdropRgb: backdrop,
    surfaceRgb: surface,
    foregroundMuted: muted ? `color-mix(in oklch, ${muted} 70%, transparent)` : "rgba(100,116,139,0.65)",
    waterDeep: [...POND_WATER_REFERENCE.deep],
    waterMid: [...POND_WATER_REFERENCE.mid],
    waterSky: [...POND_WATER_REFERENCE.sky],
  };
}

/** Re-resolves when the app theme variant changes (palette + light/dark). */
export function usePondTheme(): PondTheme {
  const { themeVariant } = useTheme();
  return useMemo(() => resolvePondTheme(themeVariant), [themeVariant]);
}
