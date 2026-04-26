import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

import { TUTORIAL_STEPS, useTutorialSteps } from "../use-tutorial-steps";

// ============================================================================
// Unit tests for TUTORIAL_STEPS registry
// Requirements: 13.1, 13.2, 13.3
// ============================================================================

describe("TUTORIAL_STEPS registry", () => {
  it("contains exactly 9 steps", () => {
    expect(TUTORIAL_STEPS).toHaveLength(9);
  });

  it("has unique ids for every step", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("steps are in the expected order", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(ids).toEqual([
      "welcome",
      "dashboard-overview",
      "add-expense",
      "connections",
      "theme-customization",
      "payments",
      "notifications",
      "language",
      "completion",
    ]);
  });

  it("every step has a valid intent", () => {
    const validIntents = [
      "brand",
      "accent",
      "info",
      "success",
      "warning",
      "danger",
      "neutral",
      "chart2",
      "chart5",
    ];
    for (const step of TUTORIAL_STEPS) {
      expect(validIntents).toContain(step.intent);
    }
  });

  it("every step has an icon component", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(typeof step.icon).toBe("function");
    }
  });

  it("every step has non-empty titleKey and descriptionKey", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.titleKey.length).toBeGreaterThan(0);
      expect(step.descriptionKey.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Unit tests for useTutorialSteps hook
// Requirements: 3.1, 3.2, 3.3
// ============================================================================

describe("useTutorialSteps", () => {
  it("returns all 9 steps for authenticated users", () => {
    const { result } = renderHook(() => useTutorialSteps(true));
    expect(result.current.steps).toHaveLength(9);
    expect(result.current.totalSteps).toBe(9);
  });

  it("filters out requiresAuth steps for unauthenticated users", () => {
    const { result } = renderHook(() => useTutorialSteps(false));

    const authSteps = result.current.steps.filter((s) => s.requiresAuth);
    expect(authSteps).toHaveLength(0);
  });

  it("unauthenticated users see only non-auth steps", () => {
    const { result } = renderHook(() => useTutorialSteps(false));

    const expectedIds = TUTORIAL_STEPS
      .filter((s) => !s.requiresAuth)
      .map((s) => s.id);

    expect(result.current.steps.map((s) => s.id)).toEqual(expectedIds);
  });

  it("totalSteps matches steps.length", () => {
    const { result: authResult } = renderHook(() => useTutorialSteps(true));
    expect(authResult.current.totalSteps).toBe(authResult.current.steps.length);

    const { result: unauthResult } = renderHook(() => useTutorialSteps(false));
    expect(unauthResult.current.totalSteps).toBe(unauthResult.current.steps.length);
  });

  it("getStep returns the correct step for valid indices", () => {
    const { result } = renderHook(() => useTutorialSteps(true));

    const firstStep = result.current.getStep(0);
    expect(firstStep?.id).toBe("welcome");

    const lastStep = result.current.getStep(8);
    expect(lastStep?.id).toBe("completion");
  });

  it("getStep returns null for out-of-bounds indices", () => {
    const { result } = renderHook(() => useTutorialSteps(true));

    expect(result.current.getStep(-1)).toBeNull();
    expect(result.current.getStep(9)).toBeNull();
    expect(result.current.getStep(100)).toBeNull();
  });

  it("getStep returns null for out-of-bounds on filtered steps", () => {
    const { result } = renderHook(() => useTutorialSteps(false));

    // Filtered steps have fewer entries
    expect(result.current.getStep(result.current.totalSteps)).toBeNull();
  });

  it("maintains deterministic order across renders", () => {
    const { result, rerender } = renderHook(() => useTutorialSteps(true));
    const firstRenderIds = result.current.steps.map((s) => s.id);

    rerender();
    const secondRenderIds = result.current.steps.map((s) => s.id);

    expect(firstRenderIds).toEqual(secondRenderIds);
  });
});
