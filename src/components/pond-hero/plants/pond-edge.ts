export type PlantBleed = { top: number; right: number; bottom: number; left: number };

export function pondPlantBleed(innerMin: number, includeTop = false): PlantBleed {
  const base = Math.max(72, Math.round(innerMin * (200 / 600)));
  return {
    top: includeTop ? base : Math.round(base * 0.2),
    right: base,
    bottom: base,
    left: base,
  };
}
