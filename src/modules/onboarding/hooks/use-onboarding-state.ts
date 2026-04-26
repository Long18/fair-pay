import { useState, useCallback, useRef } from "react";

import { STORAGE_KEY, APP_VERSION } from "../types";
import type { OnboardingState } from "../types";

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
  // syncToSupabase placeholder — no-op for now
  // const _syncToSupabase = options?.syncToSupabase ?? false;

  // Use a ref to track whether forceShow is active for isActive computation
  const forceShowRef = useRef(forceShow);
  forceShowRef.current = forceShow;

  const [state, setStateInternal] = useState<OnboardingState>(() => {
    const { initialState } = initializeOnboarding(forceShow, totalSteps);
    return initialState;
  });

  /**
   * Internal setter that also persists to localStorage.
   * Falls back to in-memory only if localStorage is unavailable.
   */
  const setState = useCallback((nextState: OnboardingState) => {
    setStateInternal(nextState);
    persistToLocalStorage(STORAGE_KEY, nextState);
  }, []);

  /**
   * isActive: true IFF the tutorial should be displayed.
   * INVARIANT: isActive === (!state.completed || forceShow)
   */
  const isActive = !state.completed || forceShowRef.current;

  /**
   * Mark the tutorial as completed (or skipped).
   * Idempotent: calling twice produces the same result as calling once.
   * (Requirement 16.1)
   */
  const markCompleted = useCallback(
    (skipped?: boolean, skippedAtStep?: number) => {
      setState({
        ...state,
        completed: true,
        completedAt: state.completedAt ?? new Date().toISOString(),
        skipped: state.completed ? state.skipped : (skipped ?? false),
        skippedAtStep: state.completed
          ? state.skippedAtStep
          : (skippedAtStep ?? null),
      });
    },
    [state, setState],
  );

  /**
   * Update the current step progress.
   * Persists immediately to localStorage. (Requirement 6.1)
   */
  const updateProgress = useCallback(
    (stepIndex: number) => {
      setState({
        ...state,
        lastStepIndex: stepIndex,
      });
    },
    [state, setState],
  );

  /**
   * Reset all onboarding state to fresh defaults.
   * Clears localStorage and returns to initial state. (Requirement 6.6)
   */
  const reset = useCallback(() => {
    const freshState = createFreshState(APP_VERSION);
    setState(freshState);
  }, [setState]);

  return {
    state,
    isActive,
    markCompleted,
    updateProgress,
    reset,
  };
}
