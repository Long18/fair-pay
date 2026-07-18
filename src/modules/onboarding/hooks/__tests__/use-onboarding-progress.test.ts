import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const mockUseGetIdentity = vi.fn();
vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => mockUseGetIdentity(),
}));

import { useOnboardingProgress } from "../use-onboarding-progress";
import { ONBOARDING_PROGRESS_EVENT } from "../../utils/mark-step";

function mockProfileSelect(result: {
  data: {
    onboarding_steps: Record<string, boolean> | null;
    onboarding_completed: boolean;
  } | null;
  error: { message: string } | null;
}) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select, update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
  return { select, eq, single };
}

function mockProfileUpdate() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return { update, select: vi.fn() };
    }
    return {};
  });
  return { update, eq };
}

describe("useOnboardingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetIdentity.mockReturnValue({ data: undefined });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("ends loading when there is no identity", async () => {
    mockUseGetIdentity.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useOnboardingProgress());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("updates steps and completed from ONBOARDING_PROGRESS_EVENT", async () => {
    mockUseGetIdentity.mockReturnValue({ data: { id: "user-1" } });
    mockProfileSelect({
      data: { onboarding_steps: {}, onboarding_completed: false },
      error: null,
    });

    const { result } = renderHook(() => useOnboardingProgress());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ONBOARDING_PROGRESS_EVENT, {
          detail: {
            steps: { profile: true, friend: true },
            completed: false,
          },
        }),
      );
    });

    expect(result.current.steps).toEqual({ profile: true, friend: true });
    expect(result.current.isCompleted).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ONBOARDING_PROGRESS_EVENT, {
          detail: {
            steps: {
              profile: true,
              friend: true,
              group: true,
              expense: true,
              settle: true,
            },
            completed: true,
          },
        }),
      );
    });

    expect(result.current.isCompleted).toBe(true);
  });

  it("markComplete sets isCompleted and updates the profile", async () => {
    mockUseGetIdentity.mockReturnValue({ data: { id: "user-1" } });
    mockProfileSelect({
      data: { onboarding_steps: { profile: true }, onboarding_completed: false },
      error: null,
    });

    const { result } = renderHook(() => useOnboardingProgress());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { update, eq } = mockProfileUpdate();

    await act(async () => {
      await result.current.markComplete();
    });

    expect(result.current.isCompleted).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ onboarding_completed: true });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("ends loading on fetch error", async () => {
    mockUseGetIdentity.mockReturnValue({ data: { id: "user-1" } });
    mockProfileSelect({
      data: null,
      error: { message: "boom" },
    });

    const { result } = renderHook(() => useOnboardingProgress());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isCompleted).toBe(false);
  });
});
