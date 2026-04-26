import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  UserDisplay,
  UserGroupStack,
  getInitials,
  type GroupAffiliation,
} from "@/components/user-display";

const mockUseUserGroups = vi.fn();

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/use-user-groups", () => ({
  useUserGroups: (userId: string | null | undefined) =>
    mockUseUserGroups(userId),
  useUserGroupsBatch: () => ({
    data: new Map(),
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/hooks/ui/use-mobile", () => ({
  useIsMobile: () => false,
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const baseUser = {
  id: "user-1",
  full_name: "Ada Lovelace",
  avatar_url: null,
  email: "ada@example.com",
};

function makeGroups(n: number): GroupAffiliation[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g-${i}`,
    name: `Group ${i}`,
    avatar_url: null,
    role: "member" as const,
    joined_at: "2026-01-01T00:00:00Z",
  }));
}

beforeEach(() => {
  mockUseUserGroups.mockReset();
  mockUseUserGroups.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  });
});

describe("getInitials", () => {
  it("returns ? for empty or whitespace name", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });

  it("returns first two chars uppercased for single word", () => {
    expect(getInitials("Ada")).toBe("AD");
    expect(getInitials("li")).toBe("LI");
    expect(getInitials("X")).toBe("X");
  });

  it("returns first letter of first two words for multi-word", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("ada lovelace king")).toBe("AL");
    expect(getInitials("  ada   lovelace ")).toBe("AL");
  });
});

describe("UserDisplay", () => {
  it("renders the user name", () => {
    renderWithProviders(<UserDisplay user={baseUser} groupStack="hidden" />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("renders initials fallback when avatar_url is null", () => {
    renderWithProviders(<UserDisplay user={baseUser} groupStack="hidden" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders email when showEmail is true", () => {
    renderWithProviders(
      <UserDisplay user={baseUser} groupStack="hidden" showEmail />
    );
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("hides the group stack when groupStack='hidden'", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(5),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(<UserDisplay user={baseUser} groupStack="hidden" />);
    expect(screen.queryByTestId("user-group-stack-inline")).toBeNull();
    expect(screen.queryByTestId("user-group-stack-collapsed")).toBeNull();
  });

  it("renders inline stack when groupStack='auto' with groups present", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(2),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(<UserDisplay user={baseUser} groupStack="auto" />);
    expect(screen.getByTestId("user-group-stack-inline")).toBeInTheDocument();
  });

  it("renders collapsed chip when groupStack='collapsed'", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(4),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(
      <UserDisplay user={baseUser} groupStack="collapsed" />
    );
    expect(screen.getByTestId("user-group-stack-collapsed")).toHaveTextContent(
      "Groups +4"
    );
  });
});

describe("UserGroupStack", () => {
  it("renders nothing when there are no groups", () => {
    mockUseUserGroups.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    const { container } = renderWithProviders(
      <UserGroupStack userId="user-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when isError", () => {
    mockUseUserGroups.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
    });
    const { container } = renderWithProviders(
      <UserGroupStack userId="user-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders skeleton dots while loading (no layout shift)", () => {
    mockUseUserGroups.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderWithProviders(<UserGroupStack userId="user-1" />);
    expect(screen.getByTestId("user-group-stack-loading")).toBeInTheDocument();
  });

  it("renders maxAvatars + overflow pill when groups exceed maxAvatars", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(7),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(
      <UserGroupStack userId="user-1" maxAvatars={3} />
    );
    expect(screen.getByTestId("user-group-stack-overflow")).toHaveTextContent(
      "+4"
    );
  });

  it("renders just avatars when groups <= maxAvatars (no overflow pill)", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(2),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(
      <UserGroupStack userId="user-1" maxAvatars={3} />
    );
    expect(screen.queryByTestId("user-group-stack-overflow")).toBeNull();
  });

  it("renders Groups +N chip in collapsed variant", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(6),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(
      <UserGroupStack userId="user-1" variant="collapsed" />
    );
    expect(screen.getByTestId("user-group-stack-collapsed")).toHaveTextContent(
      "Groups +6"
    );
  });

  it("removes excludeGroupIds from the rendered set", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(4),
      isLoading: false,
      isError: false,
      error: null,
    });
    renderWithProviders(
      <UserGroupStack
        userId="user-1"
        maxAvatars={5}
        excludeGroupIds={["g-0", "g-1"]}
      />
    );
    // 4 groups - 2 excluded = 2 visible, no overflow
    expect(screen.queryByTestId("user-group-stack-overflow")).toBeNull();
    expect(screen.getByTestId("user-group-stack-inline")).toBeInTheDocument();
  });

  it("does not violate the rules of hooks when isError flips between renders", () => {
    // Regression: a previous version returned null on isError BEFORE calling
    // useMemo, which changes hook count between renders and crashes React.
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(2),
      isLoading: false,
      isError: false,
      error: null,
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UserGroupStack userId="user-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByTestId("user-group-stack-inline")).toBeInTheDocument();

    mockUseUserGroups.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("query blew up"),
    });
    rerender(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UserGroupStack userId="user-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByTestId("user-group-stack-inline")).toBeNull();
  });

  it("renders nothing when all groups excluded", () => {
    mockUseUserGroups.mockReturnValue({
      data: makeGroups(2),
      isLoading: false,
      isError: false,
      error: null,
    });
    const { container } = renderWithProviders(
      <UserGroupStack
        userId="user-1"
        excludeGroupIds={["g-0", "g-1"]}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
