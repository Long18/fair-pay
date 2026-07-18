import { useCallback, useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";
import {
  CHECKLIST_STEP_KEYS,
  markOnboardingStep,
  ONBOARDING_PROGRESS_EVENT,
  type OnboardingProgressDetail,
} from "../utils/mark-step";

export interface UseOnboardingProgressReturn {
  steps: Record<string, boolean>;
  isCompleted: boolean;
  isLoading: boolean;
  updateStep: (step: string) => Promise<void>;
  markComplete: () => Promise<void>;
}

function allChecklistDone(steps: Record<string, boolean>): boolean {
  return CHECKLIST_STEP_KEYS.every((key) => steps[key] === true);
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const userId = identity?.id;
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // No identity → not loading. With identity → loading until that user is fetched.
  const isLoading = Boolean(userId) && loadedUserId !== userId;

  const markComplete = useCallback(async () => {
    if (!userId) return;
    setIsCompleted(true);
    await supabaseClient
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabaseClient
      .from("profiles")
      .select("onboarding_steps, onboarding_completed")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadedUserId(userId);
          return;
        }

        const fetchedSteps =
          (data?.onboarding_steps as Record<string, boolean>) ?? {};
        const completed = data?.onboarding_completed ?? false;
        setSteps(fetchedSteps);
        setIsCompleted(completed);
        setLoadedUserId(userId);

        if (!completed && allChecklistDone(fetchedSteps)) {
          void markComplete();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, markComplete]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingProgressDetail>).detail;
      if (!detail?.steps) return;
      setSteps(detail.steps);
      setIsCompleted(detail.completed);
    };

    window.addEventListener(ONBOARDING_PROGRESS_EVENT, handler);
    return () => {
      window.removeEventListener(ONBOARDING_PROGRESS_EVENT, handler);
    };
  }, []);

  const updateStep = useCallback(
    async (step: string) => {
      if (!userId) return;
      const next = { ...steps, [step]: true };
      setSteps(next);
      if (allChecklistDone(next)) {
        setIsCompleted(true);
      }
      await markOnboardingStep(userId, step);
    },
    [userId, steps],
  );

  return { steps, isCompleted, isLoading, updateStep, markComplete };
}
