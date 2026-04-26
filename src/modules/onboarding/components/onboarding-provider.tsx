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
 * Root context provider for the onboarding tutorial (v2).
 *
 * Enhancements over v1:
 * - interactionMode state for try-it feature
 * - enterTryIt / exitTryIt actions
 * - Passes interactionMode to Orchestrator
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

  // ── Local step index ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(() => {
    const persisted = state.lastStepIndex;
    if (persisted >= 0 && persisted < totalSteps) {
      return persisted;
    }
    return 0;
  });

  // ── Interaction mode (try-it) ────────────────────────────────────────
  const [interactionMode, setInteractionMode] = useState(false);

  // ── Persist step changes ─────────────────────────────────────────────
  useEffect(() => {
    updateProgress(currentStep);
  }, [currentStep, updateProgress]);

  // ── Navigation: next ─────────────────────────────────────────────────
  const next = useCallback(() => {
    setInteractionMode(false);
    setCurrentStep((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= totalSteps) {
        markCompleted(false);
        return prev;
      }
      return nextIndex;
    });
  }, [totalSteps, markCompleted]);

  // ── Navigation: back ─────────────────────────────────────────────────
  const back = useCallback(() => {
    setInteractionMode(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  // ── Navigation: goToStep ─────────────────────────────────────────────
  const goToStep = useCallback(
    (index: number) => {
      setInteractionMode(false);
      setCurrentStep(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps],
  );

  // ── Navigation: skip ─────────────────────────────────────────────────
  const skip = useCallback(() => {
    setInteractionMode(false);
    markCompleted(true, currentStep);
  }, [markCompleted, currentStep]);

  // ── Navigation: restart ──────────────────────────────────────────────
  const restart = useCallback(() => {
    setInteractionMode(false);
    reset();
    setCurrentStep(0);
  }, [reset]);

  // ── Interaction mode: enter ──────────────────────────────────────────
  const enterTryIt = useCallback(() => {
    setInteractionMode(true);
  }, []);

  // ── Interaction mode: exit + advance ─────────────────────────────────
  const exitTryIt = useCallback(() => {
    setInteractionMode(false);
    setCurrentStep((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= totalSteps) {
        markCompleted(false);
        return prev;
      }
      return nextIndex;
    });
  }, [totalSteps, markCompleted]);

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
      interactionMode,
      next,
      back,
      goToStep,
      skip,
      restart,
      enterTryIt,
      exitTryIt,
    }),
    [
      isActive,
      currentStep,
      totalSteps,
      stepConfig,
      progress,
      state.completed,
      interactionMode,
      next,
      back,
      goToStep,
      skip,
      restart,
      enterTryIt,
      exitTryIt,
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
          interactionMode={interactionMode}
          onNext={next}
          onBack={back}
          onSkip={skip}
          onTryIt={enterTryIt}
          onExitTryIt={exitTryIt}
        />
      )}
    </OnboardingContext.Provider>
  );
}

// ─── Consumer Hook ───────────────────────────────────────────────────────────

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
