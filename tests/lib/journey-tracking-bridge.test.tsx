import { act, render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JourneyTrackingBridge } from "@/lib/journey-tracking/bridge";

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

describe("JourneyTrackingBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetIdentityMock.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("initializes tracking, identifies the user, and emits page views on route changes", async () => {
    document.title = "Dashboard";

    const router = createMemoryRouter(
      [{ path: "*", element: <JourneyTrackingBridge /> }],
      { initialEntries: ["/dashboard?tab=groups"] },
    );

    render(<RouterProvider router={router} />);

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
});
