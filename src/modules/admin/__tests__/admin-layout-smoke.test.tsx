import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminLayout } from "../components/AdminLayout";

vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => ({
    data: {
      avatar_url: null,
      full_name: "Admin User",
    },
  }),
}));

vi.mock("../hooks/use-admin-access", () => ({
  useAdminAccess: () => ({
    canViewOverview: true,
    canViewPeople: true,
    canViewTransactions: true,
    canViewAuditLogs: true,
    canManageReactions: true,
    canUseDevtool: true,
    canViewGrowth: true,
  }),
}));

vi.mock("../i18n", () => ({
  useAdminTranslation: () => ({
    tAdmin: (key: string) => key,
  }),
}));

vi.mock("@/components/animated-outlet", () => ({
  AnimatedOutlet: () => <main data-testid="admin-outlet" />,
}));

vi.mock("@/components/refine-ui/theme/theme-selector", () => ({
  ThemeSelector: () => <button type="button">Theme</button>,
}));

describe("AdminLayout", () => {
  it("renders the admin shell without console errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId("admin-outlet")).toBeInTheDocument();
    expect(screen.getByText("nav.overview")).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
