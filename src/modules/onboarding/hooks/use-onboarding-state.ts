import { useState, useCallback, useRef } from "react";

import { STORAGE_KEY, APP_VERSION } from "../types";
import type { OnboardingState } from "../types";

// ─── Stable persistence helper ───────────────────────────────────────────────

/**
 * Persist state to localStorage. Extracted as a standalone function
 * so callbacks can reference it without depending on React state.
 */
function persist(state: OnboardingState): void {
  persistToLocalStorage(STORAGE_KEY, state);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a fresh OnboardingState for first-time users or resets.
 */
export function createFreshState(appVersion: string): OnboardingState {
  return {
    completed: false,
    completedAt: null,
    skipped: false,
    lastStepIndex: 0,
    skippedAtStep: null,
    showCount: 0,
    appVersion,
  };
}

/**
 * Safely read from localStorage with try/catch.
 * Returns null if storage is unavailable or the key doesn't exist.
 */
function readFromLocalStorage(key: string): OnboardingState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

/**
 * Safely write to localStorage with try/catch.
 * Returns true if successful, false if storage is unavailable.
 */
function persistToLocalStorage(key: string, state: OnboardingState): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseOnboardingStateOptions {
  /** Force show the tutorial regardless of persisted state */
  forceShow?: boolean;
  /** Placeholder for future Supabase sync (no-op for now) */
  syncToSupabase?: boolean;
  /** Total number of steps in the current registry (for version migration) */
  totalSteps?: number;
}

// ─── Initialization Logic ────────────────────────────────────────────────────

/**
 * Determines whether to show the tutorial and computes the initial state.
 *
 * Algorithm (from design doc):
 * 1. Read persisted state from localStorage
 * 2. forceShow overrides everything → fresh state, shouldShow = true
 * 3. No persisted state → first-time user → fresh state, shouldShow = true
 * 4. Completed → shouldShow = false
 * 5. Partially completed (lastStepIndex > 0, !completed) → resume, increment showCount
 * 6. Default → show tutorial
 *
 * Version migration: if appVersion differs and lastStepIndex >= totalSteps, reset to 0.
 */
export function initializeOnboarding(
  forceShow: boolean,
  totalSteps: number,
): { shouldShow: boolean; initialState: OnboardingState } {
  const persisted = readFromLocalStorage(STORAGE_KEY);

  // Step 2: forceShow overrides everything
  if (forceShow) {
    const freshState = createFreshState(APP_VERSION);
    persistToLocalStorage(STORAGE_KEY, freshState);
    return { shouldShow: true, initialState: freshState };
  }

  // Step 3: No persisted state → first-time user
  if (!persisted) {
    const freshState = createFreshState(APP_VERSION);
    persistToLocalStorage(STORAGE_KEY, freshState);
    return { shouldShow: true, initialState: freshState };
  }

  // Version-aware migration (Requirement 14.1, 14.2)
  let migrated = persisted;
  if (persisted.appVersion !== APP_VERSION) {
    migrated = { ...persisted, appVersion: APP_VERSION };
    if (persisted.lastStepIndex >= totalSteps) {
      migrated = { ...migrated, lastStepIndex: 0 };
    }
  }

  // Step 4: Already completed → don't show
  if (migrated.completed) {
    return { shouldShow: false, initialState: migrated };
  }

  // Step 5: Partially completed → resume, increment showCount
  if (migrated.lastStepIndex > 0 && !migrated.completed) {
    const resumedState: OnboardingState = {
      ...migrated,
      showCount: migrated.showCount + 1,
    };
    persistToLocalStorage(STORAGE_KEY, resumedState);
    return { shouldShow: true, initialState: resumedState };
  }

  // Step 6: Default — show tutorial (first step, not completed)
  const activatedState: OnboardingState = {
    ...migrated,
    showCount: migrated.showCount + 1,
  };
  persistToLocalStorage(STORAGE_KEY, activatedState);
  return { shouldShow: true, initialState: activatedState };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook that manages onboarding tutorial state with localStorage persistence.
 *
 * Exposes:
 * - `state`: current OnboardingState
 * - `isActive`: true IFF !state.completed || forceShow
 * - `markCompleted(skipped?, skippedAtStep?)`: idempotent completion
 * - `updateProgress(stepIndex)`: persist step progress
 * - `reset()`: clear state and return to fresh
 */
export function useOnboardingState(options?: UseOnboardingStateOptions) {
  const forceShow = options?.forceShow ?? false;
  const totalSteps = options?.totalSteps ?? 9;

  const forceShowRef = useRef(forceShow);
  forceShowRef.current = forceShow;

  const [state, setStateInternal] = useState<OnboardingState>(() => {
    const { initialState } = initializeOnboarding(forceShow, totalSteps);
    return initialState;
  });

  // Keep a ref to the latest state so callbacks don't close over stale values.
  // This breaks the dependency cycle: callbacks never depend on `state`,
  // so their references stay stable across renders.
  const stateRef = useRef(state);
  stateRef.current = state;

  const isActive = !state.completed || forceShowRef.current;

  /**
   * Mark the tutorial as completed (or skipped).
   * Idempotent: calling twice produces the same result as calling once.
   * Stable reference — does not depend on `state`.
   */
  const markCompleted = useCallback(
    (skipped?: boolean, skippedAtStep?: number) => {
      setStateInternal((prev) => {
        // Idempotent: if already completed, preserve existing values
        if (prev.completed) return prev;
        const next: OnboardingState = {
          ...prev,
          completed: true,
          completedAt: new Date().toISOString(),
          skipped: skipped ?? false,
          skippedAtStep: skippedAtStep ?? null,
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  /**
   * Update the current step progress.
   * Stable reference — does not depend on `state`.
   */
  const updateProgress = useCallback(
    (stepIndex: number) => {
      setStateInternal((prev) => {
        if (prev.lastStepIndex === stepIndex) return prev;
        const next: OnboardingState = { ...prev, lastStepIndex: stepIndex };
        persist(next);
        return next;
      });
    },
    [],
  );

  /**
   * Reset all onboarding state to fresh defaults.
   * Stable reference.
   */
  const reset = useCallback(() => {
    const freshState = createFreshState(APP_VERSION);
    persist(freshState);
    setStateInternal(freshState);
  }, []);

  return {
    state,
    isActive,
    markCompleted,
    updateProgress,
    reset,
  };
}
