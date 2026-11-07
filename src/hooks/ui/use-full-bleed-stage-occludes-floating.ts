import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import {
  FAB_BOTTOM_BASE_REM,
  FAB_SIDE_INSET_PX,
  FAB_STACK_STEP_PX,
} from "@/lib/floating-tokens";

export const DASHBOARD_POND_STAGE_ID = "dashboard-pond-stage";
const FAB_SIZE_PX = 48;

function readSafeAreaBottom(): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:0;bottom:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return inset;
}

function floatingAnchorRect(side: "left" | "right", stackIndex: number): DOMRect {
  const md = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const sidePx = md ? FAB_SIDE_INSET_PX.md : FAB_SIDE_INSET_PX.mobile;
  const bottomRem = md ? FAB_BOTTOM_BASE_REM.desktop : FAB_BOTTOM_BASE_REM.mobile;
  const liftPx = stackIndex * FAB_STACK_STEP_PX;
  const bottomInset = readSafeAreaBottom() + bottomRem * 16 + liftPx;
  const bottom = window.innerHeight - bottomInset;
  const top = bottom - FAB_SIZE_PX;
  const left = side === "left" ? sidePx : window.innerWidth - sidePx - FAB_SIZE_PX;
  return new DOMRect(left, top, FAB_SIZE_PX, FAB_SIZE_PX);
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * True when the dashboard full-bleed pond stage intersects the fixed FAB lane
 * (left/right bottom chrome). Hides floating controls so they do not sit on pond art.
 */
export function useFullBleedStageOccludesFloating(options?: {
  side?: "left" | "right";
  stackIndex?: number;
  stageId?: string;
}): boolean {
  const { pathname } = useLocation();
  const side = options?.side ?? "right";
  const stackIndex = options?.stackIndex ?? 0;
  const stageId = options?.stageId ?? DASHBOARD_POND_STAGE_ID;
  const [occluded, setOccluded] = useState(false);

  useEffect(() => {
    const update = () => {
      const stage = document.getElementById(stageId);
      if (!stage) {
        setOccluded(false);
        return;
      }
      const stageRect = stage.getBoundingClientRect();
      const fabRect = floatingAnchorRect(side, stackIndex);
      setOccluded(rectsOverlap(fabRect, stageRect));
    };

    update();

    const stage = document.getElementById(stageId);
    if (!stage) return;

    const observer = new IntersectionObserver(update, {
      root: null,
      threshold: [0, 0.05, 0.15, 0.35, 0.5, 0.75, 1],
    });
    observer.observe(stage);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname, side, stackIndex, stageId]);

  return occluded;
}
