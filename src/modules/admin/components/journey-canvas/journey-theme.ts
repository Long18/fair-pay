/** Journey canvas tokens — aliases to project CSS variables only. */
export const journeyPalette = {
  canvas: "var(--surface-overlay)",
  panel: "var(--card)",
  panelBorder: "var(--border)",
  panelText: "var(--foreground)",
  panelMuted: "var(--muted-foreground)",
  highlight: "var(--primary)",
  highlightAlt: "var(--chart-2)",
  source: "var(--accent)",
  sourceMuted: "var(--chart-5)",
  sourceText: "var(--accent-foreground)",
  entryHandle: "var(--semantic-positive)",
  exitHandle: "var(--primary)",
  info: "var(--status-info)",
  success: "var(--chart-positive)",
  warning: "var(--status-warning)",
  danger: "var(--chart-negative)",
  neutral: "var(--muted-foreground)",
  minimapMask: "color-mix(in oklch, var(--foreground) 72%, transparent)",
  dotGrid: "color-mix(in oklch, var(--border) 55%, transparent)",
  glassBg: "color-mix(in oklch, var(--card) 72%, transparent)",
  glassBorder: "color-mix(in oklch, var(--border) 70%, transparent)",
  softShadow:
    "0 4px 20px color-mix(in oklch, var(--foreground) 8%, transparent), 0 1px 4px color-mix(in oklch, var(--foreground) 6%, transparent)",
  highlightShadow: "0 0 24px color-mix(in oklch, var(--primary) 24%, transparent)",
  walkerGlow: "0 0 12px color-mix(in oklch, var(--primary) 45%, transparent)",
} as const;

export const journeyGradient = `linear-gradient(90deg, ${journeyPalette.highlight} 0%, ${journeyPalette.highlightAlt} 100%)`;
export const journeyMutedGradient = `linear-gradient(90deg, color-mix(in oklch, ${journeyPalette.highlight} 42%, transparent) 0%, color-mix(in oklch, ${journeyPalette.highlightAlt} 28%, transparent) 100%)`;

export type JourneyNodePathState = "idle" | "active" | "visited" | "lastSeen";
