const BREEZE_WAVES = [
  { weight: 0.65, rate: 0.72, x: -0.045, y: -0.031 },
  { weight: 0.25, rate: 1.13, x: 0.083, y: -0.057 },
  { weight: 0.1, rate: 0.31, x: -0.016, y: 0.023 },
];

/** Shared wind field so grass, crowns and reeds sway together. */
export const MEADOW_BREEZE_GLSL = /* glsl */ `
  float meadowBreeze(vec2 p, float time) {
    return ${BREEZE_WAVES.map((w) => `${w.weight} * sin(time * ${w.rate} + p.x * ${w.x} + p.y * ${w.y})`).join(" + ")};
  }
`;

/** Tussocks, tufts and blades layered onto the painted terrain (fades out when pixels get coarse). */
export const MEADOW_GRASS_GLSL = /* glsl */ `
  paint *= 1. + (fine.r - .5) * .12 + (finer.r - .5) * .04;
  float grassCover = 1. - clamp(wear, 0., 1.);
  float gust = meadowBreeze(world, meadowTime);
  vec2 flow = vec2(world.x + broad.g * 9., world.y + broad.r * 14.);
  // The green channel has four large cells per tile: these are metre-sized tussocks, not pixel speckle.
  vec2 brushUv = vec2(flow.x * .8 - flow.y * .6, flow.x * .6 + flow.y * .8) / vec2(27., 31.);
  float brush = texture2D(grainMap, brushUv).g;
  float lee = texture2D(grainMap, brushUv + vec2(.018, -.008)).g;
  float folded = clamp((brush - lee) * 11., -.8, .8);
  float raised = smoothstep(.32, .69, brush);
  paint *= 1. + grassCover * ((brush - .5) * .17 + folded * .055);
  paint *= 1. + grassCover * raised * gust * .025;

  float grassDetail = (1. - smoothstep(.55, 1.5, pixelUnits)) * grassCover;
  if (grassDetail > 0.) {
    vec2 towardSun = normalize(sunOffset.xz);
    vec2 tuftUv = (flow + vec2(gust * .14, gust * .05)) / vec2(19., 24.);
    float tuft = texture2D(grainMap, tuftUv).r;
    float tuftLee = texture2D(grainMap, tuftUv + towardSun * .2 / vec2(19., 24.)).r;
    float clumps = smoothstep(.46, .66 + fwidth(tuft), tuft);
    float tuftLight = clamp((tuft - tuftLee) * 12., -1., 1.);
    paint *= 1. + grassDetail * ((tuft - .5) * .12 + clumps * (tuftLight * .22 - .05));

    vec2 fiberUv = flow / vec2(7., 11.) + .17;
    float fiber = texture2D(grainMap, fiberUv).r;
    float fiberLee = texture2D(grainMap, fiberUv + towardSun * .07 / vec2(7., 11.)).r;
    float blades = smoothstep(.5, .74 + fwidth(fiber), fiber);
    float rim = clamp((fiber - fiberLee) * 8., -1., 1.);
    float fiberDetail = 1. - smoothstep(.18, .65, pixelUnits);
    paint *= 1. + grassDetail * fiberDetail * blades * (rim * .12 - .03);
  }
`;

/** Objects flagged with this userData key are hidden from the pond reflection pass. */
export const REFLECTION_DETAIL_KEY = "meadowReflectionDetail";
