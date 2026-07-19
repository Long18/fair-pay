import { supabaseClient } from "@/utility/supabaseClient";
import { APP_VERSION, type OnboardingState } from "../types";

function freshState(): OnboardingState {
  return {
    completed: false,
    completedAt: null,
    skipped: false,
    lastStepIndex: 0,
    skippedAtStep: null,
    showCount: 0,
    appVersion: APP_VERSION,
  };
}

/** Profiles column storing tutorial checklist/progress JSON. */
export const ONBOARDING_TUTORIAL_COLUMN = "onboarding_tutorial";

function isOnboardingState(value: unknown): value is OnboardingState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.completed === "boolean" &&
    typeof v.lastStepIndex === "number" &&
    typeof v.showCount === "number" &&
    typeof v.appVersion === "string"
  );
}

/**
 * Merge local cache with remote tutorial state.
 * Prefer completed remote/local; otherwise take the higher lastStepIndex,
 * then the higher showCount.
 */
export function mergeOnboardingState(
  local: OnboardingState | null,
  remote: OnboardingState | null,
): OnboardingState {
  if (!local && !remote) return freshState();
  if (!local) return remote as OnboardingState;
  if (!remote) return local;

  if (local.completed && remote.completed) {
    const localAt = local.completedAt ?? "";
    const remoteAt = remote.completedAt ?? "";
    return remoteAt > localAt ? remote : local;
  }
  if (local.completed) return local;
  if (remote.completed) return remote;

  if (remote.lastStepIndex !== local.lastStepIndex) {
    return remote.lastStepIndex > local.lastStepIndex ? remote : local;
  }
  if (remote.showCount !== local.showCount) {
    return remote.showCount > local.showCount ? remote : local;
  }
  return local;
}

export async function fetchOnboardingFromSupabase(
  userId: string,
): Promise<OnboardingState | null> {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select(ONBOARDING_TUTORIAL_COLUMN)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const raw = (data as Record<string, unknown>)[ONBOARDING_TUTORIAL_COLUMN];
  return isOnboardingState(raw) ? raw : null;
}

export async function persistOnboardingToSupabase(
  userId: string,
  state: OnboardingState,
): Promise<boolean> {
  const { error } = await supabaseClient
    .from("profiles")
    .update({ [ONBOARDING_TUTORIAL_COLUMN]: state } as Record<string, unknown>)
    .eq("id", userId);

  return !error;
}
