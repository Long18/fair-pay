import { describe, it, expect } from "vitest";
import {
  FAB_RIGHT_STACK,
  FAB_SLOT_HEIGHT_PX,
  FAB_STACK_GAP_PX,
  FAB_STACK_STEP_PX,
  getBottomOffsetClasses,
} from "../floating-tokens";

describe("FAB_STACK_STEP_PX", () => {
  it("matches lg slot + stack gap for ladder math", () => {
    expect(FAB_STACK_STEP_PX).toBe(FAB_SLOT_HEIGHT_PX.lg + FAB_STACK_GAP_PX);
  });
});

describe("getBottomOffsetClasses", () => {
  it("returns the base bottom offset for stackIndex 0", () => {
    expect(getBottomOffsetClasses()).toBe(
      "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]",
    );
    expect(getBottomOffsetClasses(0)).toBe(
      "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]",
    );
  });

  it("lifts higher stack indices by one lg FAB slot + gap each", () => {
    const liftPx = FAB_SLOT_HEIGHT_PX.lg + FAB_STACK_GAP_PX;
    expect(getBottomOffsetClasses(1)).toBe(
      `bottom-[calc(env(safe-area-inset-bottom)+5rem+${liftPx}px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem+${liftPx}px)]`,
    );
    expect(getBottomOffsetClasses(2)).toBe(
      `bottom-[calc(env(safe-area-inset-bottom)+5rem+${liftPx * 2}px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem+${liftPx * 2}px)]`,
    );
    expect(getBottomOffsetClasses(FAB_RIGHT_STACK.agentInbox)).toBe(getBottomOffsetClasses(1));
    expect(getBottomOffsetClasses(99)).toBe(getBottomOffsetClasses(2));
  });
});
