/** Loader logo motion on `/favicon.ico` — decorative ring; mark is always the brand favicon. */
export const FP_LOADER_LOGO = {
  /** Stage enters slightly above center before stroke draw */
  stageEnterYPercent: -15,
  stageEnterDuration: 0.85,
  strokeDrawDuration: 0.95,
  fillFadeDuration: 0.55,
  fillDelay: 0.45,
  idlePulseDuration: 2.4,
  idleFloatYPx: 6,
  viewBoxSize: 120,
  strokeWidth: 4.5,
} as const;
