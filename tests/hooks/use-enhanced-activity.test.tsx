import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseList = vi.fn();
const mockRpc = vi.fn();

interface MockUseListParams {
  resource: string;
  filters?: Array<{
    value?: string[];
  }>;
}

vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => ({
    data: { id: "viewer-1", full_name: "Viewer One", avatar_url: null },
  }),
  useList: (params: unknown) => mockUseList(params),
}));

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";

const expense = {
  id: "expense-1",
  description: "Team dinner",
  amount: 120000,
  currency: "VND",
  expense_date: "2026-05-10T00:00:00.000Z",
  created_at: "2026-05-10T00:00:00.000Z",
  paid_by_user_id: "viewer-1",
  groups: { id: "group-1", name: "Core team" },
  profiles: { id: "viewer-1", full_name: "Viewer One", avatar_url: null },
  expense_splits: [
    {
      id: "split-1",
      user_id: "viewer-1",
      computed_amount: 60000,
      is_settled: false,
      settled_amount: 0,
    },
    {
      id: "split-2",
      user_id: "friend-2",
      computed_amount: 60000,
      is_settled: false,
      settled_amount: 0,
    },
  ],
};

const payment = {
  id: "payment-1",
  note: "Direct settlement",
  amount: 45000,
  currency: "VND",
  payment_date: "2026-05-11T00:00:00.000Z",
  created_at: "2026-05-11T00:00:00.000Z",
  from_user: "viewer-1",
  to_user: "friend-2",
  groups: null,
  from_profile: { id: "viewer-1", full_name: "Viewer One", avatar_url: null },
  to_profile: { id: "friend-2", full_name: "Friend Two", avatar_url: null },
};

function queryResult(data: unknown[]) {
  return {
    query: {
      data: { data },
      isLoading: false,
      isRefetching: false,
      error: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  const expenseQueryResult = queryResult([expense]);
  const emptyExpenseQueryResult = queryResult([]);
  const paymentQueryResult = queryResult([payment]);
  const emptyPaymentQueryResult = queryResult([]);

  mockUseList.mockImplementation((params: MockUseListParams) => {
    const requestedIds = params.filters?.[0]?.value ?? [];

    if (params.resource === "expenses") {
      return requestedIds.includes(expense.id) ? expenseQueryResult : emptyExpenseQueryResult;
    }

    if (params.resource === "payments") {
      return requestedIds.includes(payment.id) ? paymentQueryResult : emptyPaymentQueryResult;
    }

    return queryResult([]);
  });

  mockRpc.mockImplementation((fn: string) => {
    if (fn === "get_activity_ledger") {
      return Promise.resolve({
        data: [
          {
            id: expense.id,
            type: "expense",
            date: expense.expense_date,
            created_at: expense.created_at,
          },
          {
            id: payment.id,
            type: "payment",
            date: payment.payment_date,
            created_at: payment.created_at,
          },
        ],
        error: null,
      });
    }

    if (fn === "get_expenses_with_payment_events") {
      return Promise.resolve({ data: [], error: null });
    }

    return Promise.resolve({ data: [], error: null });
  });
});

describe("useEnhancedActivity", () => {
  it("builds a viewer-scoped ledger from canonical refs and includes direct payments", async () => {
    const { result } = renderHook(() => useEnhancedActivity({ limit: "all" }));

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(2);
    });

    expect(mockRpc).toHaveBeenCalledWith("get_activity_ledger", {
      p_viewer_id: "viewer-1",
      p_shared_with_user_id: null,
      p_group_id: null,
      p_friendship_id: null,
      p_limit: null,
      p_offset: 0,
    });

    expect(result.current.activities.map((activity) => activity.type)).toEqual([
      "payment",
      "expense",
    ]);
    expect(result.current.activities[0]).toMatchObject({
      id: "payment-1",
      totalAmount: 45000,
      userAmount: 45000,
    });
    expect(result.current.activities[1]).toMatchObject({
      id: "expense-1",
      totalAmount: 120000,
      userAmount: 60000,
    });
  });

  it("requests shared-scope refs when looking at another profile", async () => {
    renderHook(() => useEnhancedActivity({ userId: "friend-2" }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("get_activity_ledger", {
        p_viewer_id: "viewer-1",
        p_shared_with_user_id: "friend-2",
        p_group_id: null,
        p_friendship_id: null,
        p_limit: 50,
        p_offset: 0,
      });
    });
  });
});
