import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdateRecurringExpenseFull } from "@/modules/expenses/hooks/use-update-recurring-expense-full";

const rpcMock = vi.fn();

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe("useUpdateRecurringExpenseFull", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls update_recurring_expense RPC with amount and schedule fields", async () => {
    rpcMock.mockResolvedValue({
      data: { success: true, recurring_id: "re-1", template_id: "ex-1", amount: 300000 },
      error: null,
    });

    const { result } = renderHook(() => useUpdateRecurringExpenseFull());

    let response: Awaited<ReturnType<typeof result.current.updateFull>> | undefined;
    await act(async () => {
      response = await result.current.updateFull({
        recurringExpenseId: "re-1",
        amount: 300000,
        description: "iCloud",
        frequency: "monthly",
        interval: 1,
        endDate: null,
        clearEndDate: false,
      });
    });

    expect(rpcMock).toHaveBeenCalledWith("update_recurring_expense", {
      p_recurring_expense_id: "re-1",
      p_amount: 300000,
      p_description: "iCloud",
      p_frequency: "monthly",
      p_interval: 1,
      p_end_date: null,
      p_clear_end_date: false,
      p_update_generated_instances: false,
    });
    expect(response).toEqual({
      success: true,
      recurring_id: "re-1",
      template_id: "ex-1",
      amount: 300000,
    });
  });

  it("returns error when RPC fails", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useUpdateRecurringExpenseFull());

    let response: Awaited<ReturnType<typeof result.current.updateFull>> | undefined;
    await act(async () => {
      response = await result.current.updateFull({
        recurringExpenseId: "re-1",
        amount: 300000,
      });
    });

    expect(response).toEqual({
      success: false,
      error: "Permission denied",
    });
  });

  it("returns error payload when RPC reports success: false", async () => {
    rpcMock.mockResolvedValue({
      data: { success: false, error: "Amount must be positive" },
      error: null,
    });

    const { result } = renderHook(() => useUpdateRecurringExpenseFull());

    let response: Awaited<ReturnType<typeof result.current.updateFull>> | undefined;
    await act(async () => {
      response = await result.current.updateFull({
        recurringExpenseId: "re-1",
        amount: -1,
      });
    });

    expect(response).toEqual({
      success: false,
      error: "Amount must be positive",
    });
  });
});
