import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { STORAGE_KEY, APP_VERSION } from "../../types";
import type { OnboardingState } from "../../types";
import {
  createFreshState,
  initializeOnboarding,
  useOnboardingState,
} from "../use-onboarding-state";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    completed: false,
    completedAt: null,
    skipped: false,
    lastStepIndex: 0,
    skippedAtStep: null,
    showCount: 0,
    appVersion: APP_VERSION,
    ...overrides,
  };
}

function persistState(state: OnboardingState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readPersistedState(): OnboardingState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
});

// ============================================================================
// Unit tests for createFreshState
// ============================================================================

describe("createFreshState", () => {
  it("returns a state with all default values", () => {
    const state = createFreshState("2.0.0");
    expect(state).toEqual({
      completed: false,
      completedAt: null,
      skipped: false,
      lastStepIndex: 0,
      skippedAtStep: null,
      showCount: 0,
      appVersion: "2.0.0",
    });
  });

  it("uses the provided appVersion", () => {
    expect(createFreshState("3.5.1").appVersion).toBe("3.5.1");
  });
});

// ============================================================================
// Unit tests for initializeOnboarding
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.1, 14.2
// ============================================================================

describe("initializeOnboarding", () => {
  const TOTAL_STEPS = 9;

  it("returns shouldShow=true and fresh state for first-time user (no persisted state)", () => {
    const result = initializeOnboarding(false, TOTAL_STEPS);
    expect(result.shouldShow).toBe(true);
    expect(result.initialState.completed).toBe(false);
    expect(result.initialState.lastStepIndex).toBe(0);
    expect(result.initialState.appVersion).toBe(APP_VERSION);
  });

  it("persists fresh state for first-time user", () => {
    initializeOnboarding(false, TOTAL_STEPS);
    const persisted = readPersistedState();
    expect(persisted).not.toBeNull();
    expect(persisted!.completed).toBe(false);
  });

  it("returns shouldShow=false when completed=true (Req 1.2)", () => {
    persistState(makeState({ completed: true, completedAt: "2025-01-01T00:00:00Z" }));
    const result = initializeOnboarding(false, TOTAL_STEPS);
    expect(result.shouldShow).toBe(false);
    expect(result.initialState.completed).toBe(true);
  });

  it("returns shouldShow=true when forceShow=true even if completed (Req 1.3)", () => {
    persistState(makeState({ completed: true }));
    const result = initializeOnboarding(true, TOTAL_STEPS);
    expect(result.shouldShow).toBe(true);
    expect(result.initialState.completed).toBe(false); // fresh state
  });

  it("resumes from lastStepIndex when partially completed (Req 1.4)", () => {
    persistState(makeState({ lastStepIndex: 3, showCount: 1 }));
    const result = initializeOnboarding(false, TOTAL_STEPS);
    expect(result.shouldShow).toBe(true);
    expect(result.initialState.lastStepIndex).toBe(3);
  });

  it("increments showCount when resuming (Req 1.5)", () => {
    persistState(makeState({ lastStepIndex: 3, showCount: 2 }));
    const result = initializeOnboarding(false, TOTAL_STEPS);
    expect(result.initialState.showCount).toBe(3);
  });

  it("increments showCount for default activation (first step, not completed)", () => {
    persistState(makeState({ lastStepIndex: 0, showCount: 0 }));
    const result = initializeOnboarding(false, TOTAL_STEPS);
    expect(result.shouldShow).toBe(true);
    expect(result.initialState.showCount).toBe(1);
  });

  describe("version-aware migration (Req 14.1, 14.2)", () => {
    it("resets lastStepIndex to 0 when version differs and index >= totalSteps", () => {
      persistState(makeState({ appVersion: "0.9.0", lastStepIndex: 10 }));
      const result = initializeOnboarding(false, TOTAL_STEPS);
      expect(result.initialState.lastStepIndex).toBe(0);
      expect(result.initialState.appVersion).toBe(APP_VERSION);
    });

    it("keeps lastStepIndex when version differs but index < totalSteps", () => {
      persistState(makeState({ appVersion: "0.9.0", lastStepIndex: 3, showCount: 1 }));
      const result = initializeOnboarding(false, TOTAL_STEPS);
      expect(result.initialState.lastStepIndex).toBe(3);
      expect(result.initialState.appVersion).toBe(APP_VERSION);
    });

    it("updates appVersion in migrated state", () => {
      persistState(makeState({ appVersion: "0.5.0", completed: true }));
      const result = initializeOnboarding(false, TOTAL_STEPS);
      expect(result.initialState.appVersion).toBe(APP_VERSION);
    });
  });
});

// ============================================================================
// Unit tests for useOnboardingState hook
// Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.6, 16.1
// ============================================================================

describe("useOnboardingState", () => {
  it("initializes with fresh state for first-time user", () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.completed).toBe(false);
    expect(result.current.state.lastStepIndex).toBe(0);
    expect(result.current.isActive).toBe(true);
  });

  it("isActive is false when completed (Req 1.2)", () => {
    persistState(makeState({ completed: true, completedAt: "2025-01-01T00:00:00Z" }));
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.isActive).toBe(false);
  });

  it("isActive is true when forceShow=true even if completed (Req 1.3)", () => {
    persistState(makeState({ completed: true }));
    const { result } = renderHook(() =>
      useOnboardingState({ forceShow: true }),
    );
    expect(result.current.isActive).toBe(true);
  });

  it("resumes from persisted lastStepIndex (Req 1.4)", () => {
    persistState(makeState({ lastStepIndex: 5, showCount: 1 }));
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.lastStepIndex).toBe(5);
    expect(result.current.isActive).toBe(true);
  });

  describe("updateProgress (Req 6.1)", () => {
    it("updates lastStepIndex and persists", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.updateProgress(4);
      });

      expect(result.current.state.lastStepIndex).toBe(4);
      const persisted = readPersistedState();
      expect(persisted!.lastStepIndex).toBe(4);
    });
  });

  describe("markCompleted (Req 6.2, 16.1)", () => {
    it("marks as completed (not skipped)", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.markCompleted();
      });

      expect(result.current.state.completed).toBe(true);
      expect(result.current.state.skipped).toBe(false);
      expect(result.current.state.completedAt).not.toBeNull();
      expect(result.current.isActive).toBe(false);
    });

    it("marks as skipped with skippedAtStep", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.markCompleted(true, 3);
      });

      expect(result.current.state.completed).toBe(true);
      expect(result.current.state.skipped).toBe(true);
      expect(result.current.state.skippedAtStep).toBe(3);
    });

    it("persists completed state to localStorage", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.markCompleted(true, 2);
      });

      const persisted = readPersistedState();
      expect(persisted!.completed).toBe(true);
      expect(persisted!.skipped).toBe(true);
      expect(persisted!.skippedAtStep).toBe(2);
    });

    it("is idempotent: calling twice produces same result (Req 16.1)", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.markCompleted(true, 3);
      });

      const stateAfterFirst = { ...result.current.state };

      act(() => {
        result.current.markCompleted(false, 5);
      });

      // Second call should NOT change skipped/skippedAtStep/completedAt
      expect(result.current.state.completed).toBe(stateAfterFirst.completed);
      expect(result.current.state.skipped).toBe(stateAfterFirst.skipped);
      expect(result.current.state.skippedAtStep).toBe(stateAfterFirst.skippedAtStep);
      expect(result.current.state.completedAt).toBe(stateAfterFirst.completedAt);
    });
  });

  describe("reset (Req 6.6)", () => {
    it("resets to fresh state", () => {
      persistState(
        makeState({
          completed: true,
          completedAt: "2025-01-01T00:00:00Z",
          lastStepIndex: 7,
          showCount: 3,
        }),
      );

      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.completed).toBe(false);
      expect(result.current.state.completedAt).toBeNull();
      expect(result.current.state.lastStepIndex).toBe(0);
      expect(result.current.state.showCount).toBe(0);
      expect(result.current.isActive).toBe(true);
    });

    it("persists reset state to localStorage", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.markCompleted();
      });

      act(() => {
        result.current.reset();
      });

      const persisted = readPersistedState();
      expect(persisted!.completed).toBe(false);
      expect(persisted!.lastStepIndex).toBe(0);
    });
  });

  describe("localStorage fallback (Req 6.3)", () => {
    it("falls back to in-memory state when localStorage throws on read", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage unavailable");
      });

      const { result } = renderHook(() => useOnboardingState());

      // Should still work with in-memory state
      expect(result.current.state.completed).toBe(false);
      expect(result.current.isActive).toBe(true);

      getItemSpy.mockRestore();
    });

    it("continues working when localStorage throws on write", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      const { result } = renderHook(() => useOnboardingState());

      // Should still update in-memory state
      act(() => {
        result.current.updateProgress(3);
      });

      expect(result.current.state.lastStepIndex).toBe(3);

      setItemSpy.mockRestore();
    });
  });
});
