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
  info: "var(--status-info)",
  success: "var(--chart-positive)",
  warning: "var(--status-warning)",
  danger: "var(--chart-negative)",
  neutral: "var(--muted-foreground)",
  minimapMask: "color-mix(in oklch, var(--foreground) 72%, transparent)",
  softShadow: "0 12px 32px color-mix(in oklch, var(--foreground) 14%, transparent)",
  highlightShadow: "0 0 24px color-mix(in oklch, var(--primary) 24%, transparent)",
} as const;

export const journeyGradient = `linear-gradient(90deg, ${journeyPalette.highlight} 0%, ${journeyPalette.highlightAlt} 100%)`;
export const journeyMutedGradient = `linear-gradient(90deg, color-mix(in oklch, ${journeyPalette.highlight} 42%, transparent) 0%, color-mix(in oklch, ${journeyPalette.highlightAlt} 28%, transparent) 100%)`;
