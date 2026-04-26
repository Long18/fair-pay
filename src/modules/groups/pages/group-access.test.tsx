import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGo = vi.fn();
const mockUseList = vi.fn();
const mockUseOne = vi.fn();
const mockGetRequestStatus = vi.fn();
const mockRequestJoin = vi.fn();
const mockTap = vi.fn();
const mockWarning = vi.fn();
const mockUseCategoryBreakdown = vi.fn();

interface RefineQueryParams {
  resource: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  queryOptions?: {
    enabled?: boolean;
  };
}

vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => ({
    data: { id: "user-1", full_name: "Current User", avatar_url: null },
  }),
  useGo: () => mockGo,
  useList: (params: RefineQueryParams) => mockUseList(params),
  useOne: (params: RefineQueryParams) => mockUseOne(params),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      {
        id: "group-1",
        name: "Travel Fund",
        description: "Shared travel costs",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
        created_by: "user-2",
        is_archived: false,
        member_count: 3,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({
    tap: mockTap,
    success: vi.fn(),
    warning: mockWarning,
  }),
}));

vi.mock("../hooks/use-join-request", () => ({
  useJoinRequests: () => ({
    getRequestStatus: mockGetRequestStatus,
    requestJoin: mockRequestJoin,
    requestingGroupId: null,
  }),
  useGroupJoinRequests: () => ({
    pendingRequests: [],
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("../components/group-card", () => ({
  GroupCard: ({ group }: { group: { name: string } }) => (
    <div data-testid="group-card">{group.name}</div>
  ),
}));

vi.mock("../components/member-list", () => ({
  MemberList: () => <div />,
}));

vi.mock("../components/add-member-modal", () => ({
  AddMemberModal: () => <div />,
}));

vi.mock("../components/join-requests-list", () => ({
  JoinRequestsList: () => <div />,
}));

vi.mock("@/modules/expenses", () => ({
  RecurringExpenseList: () => <div />,
}));

vi.mock("@/modules/payments", () => ({
  PaymentList: () => <div />,
  SimplifiedBalanceView: () => <div />,
  useBalanceCalculation: () => [],
}));

vi.mock("@/components/dashboard/stats/SimplifiedDebtsToggle", () => ({
  SimplifiedDebtsToggle: () => <div />,
}));

vi.mock("../hooks/use-simplify-debts-setting", () => ({
  useSimplifyDebtsSetting: () => ({
    isSimplified: false,
    isUpdating: false,
    toggleSimplification: vi.fn(),
    canToggle: false,
  }),
}));

vi.mock("@/hooks/balance/use-simplified-debts", () => ({
  useSimplifiedDebts: () => ({
    isLoading: false,
    transactionCount: 0,
  }),
}));

vi.mock("@/hooks/use-bulk-operations", () => ({
  useSettleAllGroupDebts: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/analytics/use-category-breakdown", () => ({
  useCategoryBreakdown: (
    preset: string,
    customRange: unknown,
    groupId: string | undefined,
    options?: { enabled?: boolean }
  ) => mockUseCategoryBreakdown(preset, customRange, groupId, options),
}));

vi.mock("@/components/bulk-operations/SettleAllDialog", () => ({
  SettleAllDialog: () => <div />,
}));

vi.mock("@/components/payments/quick-settlement-dialog", () => ({
  QuickSettlementDialog: () => <div />,
}));

vi.mock("@/components/groups/category-breakdown", () => ({
  CategoryBreakdown: () => <div />,
}));

vi.mock("@/components/refine-ui/layout/breadcrumb", () => ({
  Breadcrumb: () => <div />,
  createBreadcrumbs: {
    home: () => ({ label: "Home", href: "/" }),
    groups: () => ({ label: "Groups", href: "/groups" }),
    groupDetail: (name: string) => ({ label: name }),
  },
}));

vi.mock("@/modules/profile", () => ({
  EmptyBalances: () => <div />,
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SwipeableTabs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-enhanced-activity", () => ({
  useEnhancedActivity: () => ({
    activities: [],
    isLoading: false,
    isRefetching: false,
    error: null,
  }),
}));

vi.mock("@/components/dashboard/activity/enhanced-activity-list", () => ({
  EnhancedActivityList: () => <div />,
}));

vi.mock("@/hooks/use-instant-mutation", () => ({
  useInstantCreate: () => ({ mutateAsync: vi.fn() }),
  useInstantDelete: () => ({ mutate: vi.fn() }),
  useInstantUpdate: () => ({ mutate: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import { GroupListContent } from "./list";
import { GroupShow } from "./show";

function queryResult(data: unknown[] = [], isLoading = false) {
  return {
    query: {
      data: { data },
      isLoading,
      refetch: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRequestStatus.mockReturnValue(null);
  mockRequestJoin.mockResolvedValue(undefined);
  mockUseCategoryBreakdown.mockReturnValue({
    breakdown: [],
    isLoading: false,
    error: null,
  });
  mockUseOne.mockImplementation((params: RefineQueryParams) => ({
    query: {
      data: params.queryOptions?.enabled
        ? {
            data: {
              id: "group-1",
              name: "Travel Fund",
              created_by: "user-2",
              created_at: "2026-01-01T00:00:00Z",
              is_archived: false,
            },
          }
        : undefined,
      isLoading: false,
      refetch: vi.fn(),
    },
  }));
  mockUseList.mockImplementation((params: RefineQueryParams) => {
    if (params.resource === "groups") return queryResult([]);
    if (params.resource === "expenses") return queryResult([]);
    if (params.resource === "payments") return queryResult([]);
    return queryResult([]);
  });
});

describe("Group access guard", () => {
  it("redirects non-members before enabling group detail queries", async () => {
    render(
      <MemoryRouter initialEntries={["/groups/show/group-1"]}>
        <Routes>
          <Route path="/groups/show/:id" element={<GroupShow />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGo).toHaveBeenCalledWith({
        to: "/connections?tab=groups&joinGroupId=group-1",
        type: "replace",
      });
    });

    expect(mockWarning).toHaveBeenCalled();
    expect(mockUseOne.mock.calls[0][0].queryOptions.enabled).toBe(false);

    const useListCalls = mockUseList.mock.calls as Array<[RefineQueryParams]>;
    const privateGroupMembersCall = useListCalls.find(
      ([params]) =>
        params.resource === "group_members" &&
        params.filters?.length === 1
    );
    expect(privateGroupMembersCall?.[0].queryOptions.enabled).toBe(false);

    const expensesCall = useListCalls.find(
      ([params]) => params.resource === "expenses"
    );
    expect(expensesCall?.[0].queryOptions.enabled).toBe(false);

    const paymentsCall = useListCalls.find(
      ([params]) => params.resource === "payments"
    );
    expect(paymentsCall?.[0].queryOptions.enabled).toBe(false);
    expect(mockUseCategoryBreakdown).toHaveBeenCalledWith(
      "all_time",
      undefined,
      "group-1",
      { enabled: false }
    );
  });

  it("opens the join prompt from connections and sends a join request", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={["/connections?tab=groups&joinGroupId=group-1"]}
      >
        <GroupListContent />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Bạn chưa là thành viên")).toBeInTheDocument();
    expect(screen.getAllByText("Travel Fund").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /Gửi yêu cầu tham gia/i })
    );

    await waitFor(() => {
      expect(mockRequestJoin).toHaveBeenCalledWith("group-1");
    });
  });

  it("shows pending state instead of another join request action", () => {
    mockGetRequestStatus.mockReturnValue("pending");

    render(
      <MemoryRouter
        initialEntries={["/connections?tab=groups&joinGroupId=group-1"]}
      >
        <GroupListContent />
      </MemoryRouter>
    );

    expect(
      screen.getByText("Yêu cầu tham gia nhóm này của bạn đang chờ quản trị viên duyệt.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Gửi yêu cầu tham gia/i })
    ).not.toBeInTheDocument();
  });
});
