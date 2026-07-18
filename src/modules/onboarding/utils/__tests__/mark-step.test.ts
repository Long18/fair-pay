import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  CHECKLIST_STEP_KEYS,
  markOnboardingStep,
  ONBOARDING_PROGRESS_EVENT,
} from "../mark-step";

describe("markOnboardingStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports checklist keys and event name", () => {
    expect(CHECKLIST_STEP_KEYS).toEqual([
      "profile",
      "friend",
      "group",
      "expense",
      "settle",
    ]);
    expect(ONBOARDING_PROGRESS_EVENT).toBe("fairpay:onboarding-progress");
  });

  it("no-ops without a userId", async () => {
    await markOnboardingStep(undefined, "profile");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls RPC and dispatches progress event on success", async () => {
    const steps = { profile: true };
    mockRpc.mockResolvedValue({
      data: { steps, completed: false },
      error: null,
    });

    const handler = vi.fn();
    window.addEventListener(ONBOARDING_PROGRESS_EVENT, handler);

    await markOnboardingStep("user-1", "profile");

    expect(mockRpc).toHaveBeenCalledWith("mark_onboarding_step", {
      p_step: "profile",
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      steps,
      completed: false,
    });

    window.removeEventListener(ONBOARDING_PROGRESS_EVENT, handler);
  });

  it("swallows RPC errors without throwing", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "fail" } });
    await expect(markOnboardingStep("user-1", "friend")).resolves.toBeUndefined();
  });
});
