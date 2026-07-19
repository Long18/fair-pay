import { describe, expect, it } from "vitest";
import { APP_VERSION, type OnboardingState } from "../../types";
import { mergeOnboardingState } from "../onboarding-sync";

function state(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    completed: false,
    completedAt: null,
    skipped: false,
    lastStepIndex: 0,
    skippedAtStep: null,
    showCount: 0,
    appVersion: APP_VERSION,
    ...overrides,
  };
}

describe("mergeOnboardingState", () => {
  it("returns fresh state when both sides are null", () => {
    const merged = mergeOnboardingState(null, null);
    expect(merged.completed).toBe(false);
    expect(merged.lastStepIndex).toBe(0);
  });

  it("prefers completed local over incomplete remote", () => {
    const local = state({ completed: true, completedAt: "2026-01-01T00:00:00.000Z" });
    const remote = state({ lastStepIndex: 3 });
    expect(mergeOnboardingState(local, remote)).toEqual(local);
  });

  it("prefers higher lastStepIndex when neither completed", () => {
    const local = state({ lastStepIndex: 1 });
    const remote = state({ lastStepIndex: 4, showCount: 2 });
    expect(mergeOnboardingState(local, remote)).toEqual(remote);
  });

  it("uses remote when only remote exists", () => {
    const remote = state({ lastStepIndex: 2 });
    expect(mergeOnboardingState(null, remote)).toEqual(remote);
  });
});
