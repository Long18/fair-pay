import { useEffect, useState, type RefObject } from "react";

export type PondLayoutProfile = {
  /** Canvas bleed for reeds (px). */
  plantPad: number;
  /** Scale for duck/fish sprites. */
  entityScale: number;
  /** Reed density tier. */
  density: "compact" | "normal" | "wide";
  isNarrow: boolean;
};

const DEFAULT: PondLayoutProfile = {
  plantPad: 96,
  entityScale: 0.9,
  density: "normal",
  isNarrow: false,
};

function profileForWidth(width: number): PondLayoutProfile {
  if (width < 480) {
    return {
      plantPad: 64,
      entityScale: 0.78,
      density: "compact",
      isNarrow: true,
    };
  }
  if (width < 768) {
    return {
      plantPad: 80,
      entityScale: 0.86,
      density: "compact",
      isNarrow: true,
    };
  }
  if (width < 1024) {
    return {
      plantPad: 96,
      entityScale: 0.92,
      density: "normal",
      isNarrow: false,
    };
  }
  return {
    plantPad: 120,
    entityScale: 1,
    density: "wide",
    isNarrow: false,
  };
}

export function usePondLayout(
  containerRef: RefObject<HTMLElement | null>,
): PondLayoutProfile {
  const [profile, setProfile] = useState<PondLayoutProfile>(DEFAULT);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setProfile(profileForWidth(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return profile;
}
