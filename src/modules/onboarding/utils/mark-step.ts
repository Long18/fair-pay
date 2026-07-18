import { supabaseClient } from "@/utility/supabaseClient";

export const CHECKLIST_STEP_KEYS = [
  "profile",
  "friend",
  "group",
  "expense",
  "settle",
] as const;

export const ONBOARDING_PROGRESS_EVENT = "fairpay:onboarding-progress";

export type OnboardingProgressDetail = {
  steps: Record<string, boolean>;
  completed: boolean;
};

type MarkOnboardingStepResult = {
  steps?: Record<string, boolean>;
  completed?: boolean;
};

/**
 * Marks a single onboarding step as complete for the authenticated user.
 * Uses a race-safe RPC (jsonb merge). Safe to call multiple times.
 * Errors are swallowed; this is non-critical background state.
 */
export async function markOnboardingStep(
  userId: string | undefined,
  step: string,
): Promise<void> {
  if (!userId) return;
  try {
    const { data, error } = await supabaseClient.rpc("mark_onboarding_step", {
      p_step: step,
    });
    if (error || data == null) return;

    const payload = data as MarkOnboardingStepResult;
    const steps = (payload.steps ?? {}) as Record<string, boolean>;
    const completed =
      typeof payload.completed === "boolean"
        ? payload.completed
        : CHECKLIST_STEP_KEYS.every((key) => steps[key] === true);

    window.dispatchEvent(
      new CustomEvent<OnboardingProgressDetail>(ONBOARDING_PROGRESS_EVENT, {
        detail: { steps, completed },
      }),
    );
  } catch {
    // non-critical
  }
}
