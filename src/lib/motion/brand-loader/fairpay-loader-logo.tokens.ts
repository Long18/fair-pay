/**
 * FairPay loader logo motion — MindMarket preloader pacing on `/favicon.ico`.
 * Decorative ring stroke only; mark is always the brand favicon.
 * @see docs/motion/mindmarket-craft-study.md — `.c-preloader` + `c-preloader_svg`
 */
export const FP_LOADER_LOGO = {
  /** MindMarket uses ~translate(0, -15%) on preloader SVG wrap */
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
