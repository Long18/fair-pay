import { act, render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JourneyTrackingBridge } from "@/lib/journey-tracking/bridge";
import { resetConsentCacheForTests, writeConsentState } from "@/lib/analytics/consent-gate";

const { trackingSpy, useGetIdentityMock } = vi.hoisted(() => ({
  trackingSpy: {
    init: vi.fn(),
    identify: vi.fn(),
    pageView: vi.fn(),
  },
  useGetIdentityMock: vi.fn(),
}));

vi.mock("@/lib/journey-tracking/manager", () => ({
  journeyTracking: trackingSpy,
}));

vi.mock("@refinedev/core", () => ({
  useGetIdentity: useGetIdentityMock,
}));

function renderBridge(initialEntry: string) {
  const router = createMemoryRouter(
    [{ path: "*", element: <JourneyTrackingBridge /> }],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("JourneyTrackingBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetConsentCacheForTests();
    useGetIdentityMock.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("initializes tracking, identifies the user, and emits page views on route changes", async () => {
    writeConsentState({ preferences: true, experience: true, marketing: true });
    document.title = "Dashboard";

    const router = renderBridge("/dashboard?tab=groups");

    expect(trackingSpy.init).toHaveBeenCalledTimes(1);
    expect(trackingSpy.identify).toHaveBeenCalledWith("user-123");
    expect(trackingSpy.pageView).toHaveBeenCalledWith("/dashboard?tab=groups", "Dashboard");

    document.title = "Create Group";
    await act(async () => {
      await router.navigate("/groups/create?utm_source=invite");
    });

    expect(trackingSpy.pageView).toHaveBeenLastCalledWith(
      "/groups/create?utm_source=invite",
      "Create Group",
    );
  });

  it("stays silent until experience consent is granted", () => {
    document.title = "Dashboard";
    renderBridge("/dashboard");

    expect(trackingSpy.init).not.toHaveBeenCalled();
    expect(trackingSpy.identify).not.toHaveBeenCalled();
    expect(trackingSpy.pageView).not.toHaveBeenCalled();

    act(() => {
      writeConsentState({ preferences: true, experience: true, marketing: false });
    });

    expect(trackingSpy.init).toHaveBeenCalledTimes(1);
    expect(trackingSpy.identify).toHaveBeenCalledWith("user-123");
    expect(trackingSpy.pageView).toHaveBeenCalledWith("/dashboard", "Dashboard");
  });
});
