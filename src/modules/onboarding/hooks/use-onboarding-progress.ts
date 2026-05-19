import { useCallback, useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";

export interface UseOnboardingProgressReturn {
  steps: Record<string, boolean>;
  isCompleted: boolean;
  isLoading: boolean;
  updateStep: (step: string) => Promise<void>;
  markComplete: () => Promise<void>;
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!identity?.id) return;

    let cancelled = false;
    setIsLoading(true);

    supabaseClient
      .from("profiles")
      .select("onboarding_steps, onboarding_completed")
      .eq("id", identity.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setSteps((data?.onboarding_steps as Record<string, boolean>) ?? {});
        setIsCompleted(data?.onboarding_completed ?? false);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [identity?.id]);

  const updateStep = useCallback(
    async (step: string) => {
      if (!identity?.id) return;
      const next = { ...steps, [step]: true };
      setSteps(next);
      await supabaseClient
        .from("profiles")
        .update({ onboarding_steps: next })
        .eq("id", identity.id);
    },
    [identity?.id, steps],
  );

  const markComplete = useCallback(async () => {
    if (!identity?.id) return;
    setIsCompleted(true);
    await supabaseClient
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", identity.id);
  }, [identity?.id]);

  return { steps, isCompleted, isLoading, updateStep, markComplete };
}
