import { useState, useCallback, useRef, useEffect } from "react";

import { STORAGE_KEY, APP_VERSION, getOnboardingStorageKey } from "../types";
import type { OnboardingState } from "../types";
import {
  fetchOnboardingFromSupabase,
  mergeOnboardingState,
  persistOnboardingToSupabase,
} from "../utils/onboarding-sync";

// ─── Stable persistence helper ───────────────────────────────────────────────

/**
 * Persist state to localStorage (and optionally Supabase). Extracted so
 * callbacks can reference it without depending on React state.
 */
function persist(
  storageKey: string,
  state: OnboardingState,
  sync?: { userId: string } | null,
): void {
  persistToLocalStorage(storageKey, state);
  if (sync?.userId) {
    void persistOnboardingToSupabase(sync.userId, state);
  }
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

/**
 * Resolve the storage key for onboarding persistence.
 * Prefer per-user keys; fall back to the legacy global key for tests / migrations.
 */
export function resolveOnboardingStorageKey(userId?: string | null): string {
  if (userId) {
    return getOnboardingStorageKey(userId);
  }
  return STORAGE_KEY;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseOnboardingStateOptions {
  /** Force show the tutorial regardless of persisted state */
  forceShow?: boolean;
  /**
   * When true and `userId` is set, merge/persist tutorial progress to
   * `profiles.onboarding_tutorial`. localStorage remains the write-through cache.
   */
  syncToSupabase?: boolean;
  /** Total number of steps in the current registry (for version migration) */
  totalSteps?: number;
  /**
   * Authenticated user id. When set, state is keyed per user.
   * When omitted/null and enabled is false, the tutorial stays inactive.
   */
  userId?: string | null;
  /**
   * When false, do not activate or persist (unauthenticated / public routes).
   * Defaults to true for backward-compatible unit tests.
   */
  enabled?: boolean;
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
  storageKey: string = STORAGE_KEY,
): { shouldShow: boolean; initialState: OnboardingState } {
  const persisted = readFromLocalStorage(storageKey);

  // Migrate from legacy global key into per-user key when needed
  const legacy =
    storageKey !== STORAGE_KEY ? readFromLocalStorage(STORAGE_KEY) : null;
  const source = persisted ?? legacy;

  // Step 2: forceShow overrides everything
  if (forceShow) {
    const freshState = createFreshState(APP_VERSION);
    persistToLocalStorage(storageKey, freshState);
    return { shouldShow: true, initialState: freshState };
  }

  // Step 3: No persisted state → first-time user
  if (!source) {
    const freshState = createFreshState(APP_VERSION);
    persistToLocalStorage(storageKey, freshState);
    return { shouldShow: true, initialState: freshState };
  }

  // Version-aware migration (Requirement 14.1, 14.2)
  let migrated = source;
  if (source.appVersion !== APP_VERSION) {
    migrated = { ...source, appVersion: APP_VERSION };
    if (source.lastStepIndex >= totalSteps) {
      migrated = { ...migrated, lastStepIndex: 0 };
    }
  }

  // Step 4: Already completed → don't show
  if (migrated.completed) {
    if (!persisted && legacy) {
      persistToLocalStorage(storageKey, migrated);
    }
    return { shouldShow: false, initialState: migrated };
  }

  // Step 5: Partially completed → resume, increment showCount
  if (migrated.lastStepIndex > 0 && !migrated.completed) {
    const resumedState: OnboardingState = {
      ...migrated,
      showCount: migrated.showCount + 1,
    };
    persistToLocalStorage(storageKey, resumedState);
    return { shouldShow: true, initialState: resumedState };
  }

  // Step 6: Default — show tutorial (first step, not completed)
  const activatedState: OnboardingState = {
    ...migrated,
    showCount: migrated.showCount + 1,
  };
  persistToLocalStorage(storageKey, activatedState);
  return { shouldShow: true, initialState: activatedState };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook that manages onboarding tutorial state with localStorage persistence.
 *
 * Exposes:
 * - `state`: current OnboardingState
 * - `isActive`: true IFF enabled && (!state.completed || forceShow)
 * - `markCompleted(skipped?, skippedAtStep?)`: idempotent completion
 * - `updateProgress(stepIndex)`: persist step progress
 * - `reset()`: clear state and return to fresh
 */
export function useOnboardingState(options?: UseOnboardingStateOptions) {
  const forceShow = options?.forceShow ?? false;
  const totalSteps = options?.totalSteps ?? 9;
  const userId = options?.userId ?? null;
  const enabled = options?.enabled ?? true;
  const syncToSupabase = options?.syncToSupabase ?? false;
  const storageKey = resolveOnboardingStorageKey(userId);

  const forceShowRef = useRef(forceShow);
  useEffect(() => {
    forceShowRef.current = forceShow;
  }, [forceShow]);

  const storageKeyRef = useRef(storageKey);
  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const syncToSupabaseRef = useRef(syncToSupabase);
  useEffect(() => {
    syncToSupabaseRef.current = syncToSupabase;
  }, [syncToSupabase]);

  const syncTarget = useCallback((): { userId: string } | null => {
    if (!syncToSupabaseRef.current || !userIdRef.current) return null;
    return { userId: userIdRef.current };
  }, []);

  const [state, setStateInternal] = useState<OnboardingState>(() => {
    if (!enabled) {
      return createFreshState(APP_VERSION);
    }
    const { initialState } = initializeOnboarding(
      forceShow,
      totalSteps,
      storageKey,
    );
    return initialState;
  });

  // Re-initialize when the authenticated user changes (guest → signed in,
  // or switching accounts). Skip the first mount — useState already seeded.
  const didMountRef = useRef(false);
  const prevStorageKeyRef = useRef(storageKey);
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevStorageKeyRef.current = storageKey;
      prevEnabledRef.current = enabled;
      return;
    }

    const userChanged = prevStorageKeyRef.current !== storageKey;
    const enabledChanged = prevEnabledRef.current !== enabled;
    prevStorageKeyRef.current = storageKey;
    prevEnabledRef.current = enabled;

    if (!userChanged && !enabledChanged) {
      return;
    }

    if (!enabled) {
      setStateInternal(createFreshState(APP_VERSION));
      return;
    }
    const { initialState } = initializeOnboarding(
      forceShowRef.current,
      totalSteps,
      storageKey,
    );
    setStateInternal(initialState);
  }, [enabled, storageKey, totalSteps]);

  // Hydrate from Supabase and merge with localStorage cache.
  useEffect(() => {
    if (!enabled || !syncToSupabase || !userId || forceShow) return;

    let cancelled = false;
    void (async () => {
      const remote = await fetchOnboardingFromSupabase(userId);
      if (cancelled || !remote) return;

      setStateInternal((prev) => {
        const merged = mergeOnboardingState(prev, remote);
        if (merged === prev) return prev;
        persistToLocalStorage(storageKeyRef.current, merged);
        return merged;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, syncToSupabase, userId, forceShow, storageKey]);

  // Keep a ref to the latest state so callbacks don't close over stale values.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isActive =
    enabled && (!state.completed || forceShowRef.current);

  /**
   * Mark the tutorial as completed (or skipped).
   * Idempotent: calling twice produces the same result as calling once.
   * Stable reference — does not depend on `state`.
   */
  const markCompleted = useCallback(
    (skipped?: boolean, skippedAtStep?: number) => {
      if (!enabledRef.current) return;
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
        persist(storageKeyRef.current, next, syncTarget());
        return next;
      });
    },
    [syncTarget],
  );

  /**
   * Update the current step progress.
   * Stable reference — does not depend on `state`.
   */
  const updateProgress = useCallback(
    (stepIndex: number) => {
      if (!enabledRef.current) return;
      setStateInternal((prev) => {
        if (prev.lastStepIndex === stepIndex) return prev;
        const next: OnboardingState = { ...prev, lastStepIndex: stepIndex };
        persist(storageKeyRef.current, next, syncTarget());
        return next;
      });
    },
    [syncTarget],
  );

  /**
   * Reset all onboarding state to fresh defaults.
   * Stable reference.
   */
  const reset = useCallback(() => {
    if (!enabledRef.current) return;
    const freshState = createFreshState(APP_VERSION);
    persist(storageKeyRef.current, freshState, syncTarget());
    setStateInternal(freshState);
  }, [syncTarget]);

  return {
    state,
    isActive,
    markCompleted,
    updateProgress,
    reset,
  };
}
