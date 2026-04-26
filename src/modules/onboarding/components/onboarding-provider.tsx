import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useGetIdentity } from "@refinedev/core";

import type { Profile } from "@/modules/profile/types";

import type { OnboardingContextValue } from "../types";
import { useOnboardingState } from "../hooks/use-onboarding-state";
import { useTutorialSteps } from "../hooks/use-tutorial-steps";
import { OnboardingOrchestrator } from "./onboarding-orchestrator";

// ─── Context ─────────────────────────────────────────────────────────────────

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ─── Provider Props ──────────────────────────────────────────────────────────

interface OnboardingProviderProps {
  children: React.ReactNode;
  /** Force show tutorial (for testing/settings reset) */
  forceShow?: boolean;
}

// ─── Provider Component ──────────────────────────────────────────────────────

/**
 * Root context provider that initializes onboarding state and the step engine.
 * Wraps the app and conditionally renders the OnboardingOrchestrator.
 *
 * - Uses `useGetIdentity()` from `@refinedev/core` to determine auth state
 * - Passes `isAuthenticated` to `useTutorialSteps` for auth-based filtering
 * - Manages local `currentStep` state initialized from persisted `lastStepIndex`
 * - Exposes navigation actions: next, back, goToStep, skip, restart
 * - Computes progress as `currentStep / totalSteps` clamped to [0, 1]
 * - Conditionally renders `OnboardingOrchestrator` when active
 */
export function OnboardingProvider({
  children,
  forceShow,
}: OnboardingProviderProps) {
  // ── Auth state ───────────────────────────────────────────────────────
  const { data: identity } = useGetIdentity<Profile>();
  const isAuthenticated = !!identity;

  // ── Step engine (filtered by auth) ───────────────────────────────────
  const { steps, totalSteps, getStep } = useTutorialSteps(isAuthenticated);

  // ── Persisted state ──────────────────────────────────────────────────
  const { state, isActive, markCompleted, updateProgress, reset } =
    useOnboardingState({ forceShow, totalSteps });

  // ── Local step index (initialized from persisted lastStepIndex) ──────
  const [currentStep, setCurrentStep] = useState(() => {
    // Clamp persisted index to valid range for the current filtered steps
    const persisted = state.lastStepIndex;
    if (persisted >= 0 && persisted < totalSteps) {
      return persisted;
    }
    return 0;
  });

  // ── Persist step changes ─────────────────────────────────────────────
  // updateProgress has a stable reference (no deps), so this effect
  // only fires when currentStep actually changes.
  useEffect(() => {
    updateProgress(currentStep);
  }, [currentStep, updateProgress]);

  // ── Navigation: next ─────────────────────────────────────────────────
  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= totalSteps) {
        // Past last step → mark completed (not skipped)
        markCompleted(false);
        return prev;
      }
      return nextIndex;
    });
  }, [totalSteps, markCompleted]);

  // ── Navigation: back ─────────────────────────────────────────────────
  const back = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  // ── Navigation: goToStep ─────────────────────────────────────────────
  const goToStep = useCallback(
    (index: number) => {
      setCurrentStep(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps],
  );

  // ── Navigation: skip ─────────────────────────────────────────────────
  const skip = useCallback(() => {
    markCompleted(true, currentStep);
  }, [markCompleted, currentStep]);

  // ── Navigation: restart ──────────────────────────────────────────────
  const restart = useCallback(() => {
    reset();
    setCurrentStep(0);
  }, [reset]);

  // ── Derived values ───────────────────────────────────────────────────
  const stepConfig = getStep(currentStep);
  const progress = totalSteps > 0
    ? Math.min(1, Math.max(0, currentStep / totalSteps))
    : 0;

  // ── Context value (memoized) ─────────────────────────────────────────
  const contextValue = useMemo<OnboardingContextValue>(
    () => ({
      isActive,
      currentStep,
      totalSteps,
      stepConfig,
      progress,
      isCompleted: state.completed,
      next,
      back,
      goToStep,
      skip,
      restart,
    }),
    [
      isActive,
      currentStep,
      totalSteps,
      stepConfig,
      progress,
      state.completed,
      next,
      back,
      goToStep,
      skip,
      restart,
    ],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {isActive && stepConfig !== null && (
        <OnboardingOrchestrator
          stepConfig={stepConfig}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progress={progress}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      )}
    </OnboardingContext.Provider>
  );
}

// ─── Consumer Hook ───────────────────────────────────────────────────────────

/**
 * Access the onboarding context. Must be used within an `OnboardingProvider`.
 * Throws if used outside the provider tree.
 */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === null) {
    throw new Error(
      "useOnboarding must be used within an <OnboardingProvider>. " +
        "Wrap your component tree with <OnboardingProvider>.",
    );
  }
  return context;
}
