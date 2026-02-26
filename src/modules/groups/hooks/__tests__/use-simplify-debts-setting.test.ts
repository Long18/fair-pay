import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSimplifyDebtsSetting } from "../use-simplify-debts-setting";
import type { Group } from "../../types";

// ============================================================================
// Mocks
// ============================================================================

const mockMutate = vi.fn();
const mockMutation = { isPending: false };

vi.mock("@refinedev/core", () => ({
  useUpdate: () => ({
    mutate: mockMutate,
    mutation: mockMutation,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback ?? key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group-1",
    name: "Test Group",
    description: null,
    avatar_url: null,
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    simplify_debts: false,
    is_archived: false,
    archived_at: null,
    archived_by: null,
    ...overrides,
  };
}

// ============================================================================
// Unit tests for useSimplifyDebtsSetting hook
// Requirements: 3.1, 3.5, 6.1, 6.2
// ============================================================================

describe("useSimplifyDebtsSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation.isPending = false;
  });

  it("reads isSimplified from groupData.simplify_debts", () => {
    const group = makeGroup({ simplify_debts: true });
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );
    expect(result.current.isSimplified).toBe(true);
  });

  it("defaults isSimplified to false when groupData is undefined", () => {
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: undefined, isAdmin: true })
    );
    expect(result.current.isSimplified).toBe(false);
  });

  // Requirement 3.1: toggle ON → update with simplify_debts: true
  it("toggle ON → calls mutate with simplify_debts: true", () => {
    const group = makeGroup({ simplify_debts: false });
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );

    act(() => {
      result.current.toggleSimplification(true);
    });

    expect(mockMutate).toHaveBeenCalledOnce();
    const [params] = mockMutate.mock.calls[0];
    expect(params.resource).toBe("groups");
    expect(params.id).toBe("group-1");
    expect(params.values).toEqual({ simplify_debts: true });
    expect(params.mutationMode).toBe("optimistic");
  });

  // Requirement 3.1: toggle OFF → update with simplify_debts: false
  it("toggle OFF → calls mutate with simplify_debts: false", () => {
    const group = makeGroup({ simplify_debts: true });
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );

    act(() => {
      result.current.toggleSimplification(false);
    });

    expect(mockMutate).toHaveBeenCalledOnce();
    const [params] = mockMutate.mock.calls[0];
    expect(params.values).toEqual({ simplify_debts: false });
  });

  // Requirement 3.5: update failure → revert toggle, show error toast
  it("update failure → calls toast.error via onError callback", async () => {
    const { toast } = await import("sonner");
    const group = makeGroup({ simplify_debts: false });
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );

    act(() => {
      result.current.toggleSimplification(true);
    });

    // Extract the onError callback passed to mutate
    const [, callbacks] = mockMutate.mock.calls[0];
    expect(callbacks.onError).toBeDefined();

    // Simulate error
    act(() => {
      callbacks.onError(new Error("Network error"));
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Không thể cập nhật cài đặt. Vui lòng thử lại."
    );
  });

  // Requirement 6.1, 6.2: non-admin → canToggle = false
  it("non-admin → canToggle is false", () => {
    const group = makeGroup();
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: false })
    );
    expect(result.current.canToggle).toBe(false);
  });

  // Requirement 6.1: admin → canToggle = true
  it("admin → canToggle is true", () => {
    const group = makeGroup();
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );
    expect(result.current.canToggle).toBe(true);
  });

  // Non-admin cannot toggle — mutate should not be called
  it("non-admin toggle attempt → mutate is NOT called", () => {
    const group = makeGroup();
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: false })
    );

    act(() => {
      result.current.toggleSimplification(true);
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("isUpdating reflects mutation.isPending", () => {
    mockMutation.isPending = true;
    const group = makeGroup();
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );
    expect(result.current.isUpdating).toBe(true);
  });

  it("mutate is called with successNotification and errorNotification disabled", () => {
    const group = makeGroup();
    const { result } = renderHook(() =>
      useSimplifyDebtsSetting({ groupId: "group-1", groupData: group, isAdmin: true })
    );

    act(() => {
      result.current.toggleSimplification(true);
    });

    const [params] = mockMutate.mock.calls[0];
    expect(params.successNotification).toBe(false);
    expect(params.errorNotification).toBe(false);
  });
});
