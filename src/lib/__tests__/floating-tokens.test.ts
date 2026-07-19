import { describe, it, expect } from "vitest";
import {
  FAB_SLOT_HEIGHT_PX,
  FAB_STACK_GAP_PX,
  getBottomOffsetClasses,
} from "../floating-tokens";

describe("getBottomOffsetClasses", () => {
  it("returns the base bottom offset for stackIndex 0", () => {
    expect(getBottomOffsetClasses()).toBe(
      "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6",
    );
    expect(getBottomOffsetClasses(0)).toBe(
      "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6",
    );
  });

  it("lifts higher stack indices by one lg FAB slot + gap each", () => {
    const liftPx = FAB_SLOT_HEIGHT_PX.lg + FAB_STACK_GAP_PX;
    expect(getBottomOffsetClasses(1)).toBe(
      `bottom-[calc(env(safe-area-inset-bottom)+5rem+${liftPx}px)] md:bottom-[calc(1.5rem+${liftPx}px)]`,
    );
    expect(getBottomOffsetClasses(2)).toBe(
      `bottom-[calc(env(safe-area-inset-bottom)+5rem+${liftPx * 2}px)] md:bottom-[calc(1.5rem+${liftPx * 2}px)]`,
    );
  });
});
