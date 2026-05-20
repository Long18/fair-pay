import { supabaseClient } from "@/utility/supabaseClient";

/**
 * Marks a single onboarding step as complete for the given user.
 * Safe to call multiple times — no-ops if already done.
 * Errors are swallowed; this is non-critical background state.
 */
export async function markOnboardingStep(userId: string | undefined, step: string): Promise<void> {
  if (!userId) return;
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("onboarding_steps")
      .eq("id", userId)
      .single();

    const current = (data?.onboarding_steps as Record<string, boolean>) ?? {};
    if (current[step]) return;

    await supabaseClient
      .from("profiles")
      .update({ onboarding_steps: { ...current, [step]: true } })
      .eq("id", userId);
  } catch {
    // non-critical
  }
}
