import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode, HTMLAttributes } from "react";
import { QuickSettlementDialog } from "@/components/payments/quick-settlement-dialog";
import { useSettleSplits } from "@/hooks/balance/use-settle-splits";
import { useSettleAllGroupDebts } from "@/hooks/use-bulk-operations";
import { dispatchSettlementEvent } from "@/lib/settlement-events";
import { supabaseClient } from "@/utility/supabaseClient";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue?: string) => defaultValue ?? _key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/contexts/undo-manager", () => ({
  useUndoManager: () => ({
    registerUndo: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({
    tap: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-track-event", () => ({
  useTrackEvent: () => ({
    track: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/components/ui/bottom-sheet", () => ({
  BottomSheet: ({
    children,
    footer,
    title,
    open,
  }: {
    children: ReactNode;
    footer?: ReactNode;
    title?: string;
    open: boolean;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock("framer-motion", () => {
  const stripMotionProps = <T extends Record<string, unknown>>(props: T) => {
    const rest = { ...props };
    delete rest.whileHover;
    delete rest.whileTap;
    delete rest.transition;
    delete rest.initial;
    delete rest.animate;
    delete rest.onAnimationComplete;
    return rest;
  };

  return {
    motion: {
      div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
        <div {...stripMotionProps(props)}>{children}</div>
      ),
      button: ({ children, ...props }: HTMLAttributes<HTMLButtonElement>) => (
        <button type="button" {...stripMotionProps(props)}>{children}</button>
      ),
      span: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
        <span {...stripMotionProps(props)}>{children}</span>
      ),
    },
  };
});

vi.mock("@/lib/settlement-events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement-events")>(
    "@/lib/settlement-events",
  );
  return {
    ...actual,
    dispatchSettlementEvent: vi.fn(),
    trackSettlementCompleted: vi.fn(),
  };
});

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("Settlement Flow Integration Tests", () => {
  const mockRpc = vi.mocked(supabaseClient.rpc);
  const mockFrom = vi.mocked(supabaseClient.from);
  const mockDispatch = vi.mocked(dispatchSettlementEvent);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: { success: true, splits_updated: 2 },
      error: null,
    });
  });

  describe("useSettleSplits — person debt settle-all handler", () => {
    it("calls settle_splits_batch RPC with all split IDs and dispatches settlement event", async () => {
      const onSettled = vi.fn();
      const splitIds = ["split-1", "split-2", "split-3"];

      const { result } = renderHook(() => useSettleSplits(), {
        wrapper: createQueryWrapper(),
      });

      let settleResult: { success: boolean } | undefined;
      await act(async () => {
        settleResult = await result.current.settle(splitIds, onSettled);
      });

      expect(settleResult).toEqual({ success: true, data: { success: true, splits_updated: 2 } });
      expect(mockRpc).toHaveBeenCalledWith("settle_splits_batch", {
        p_split_ids: splitIds,
      });
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledTimes(1);
    });

    it("returns failure without calling RPC when no splits are selected", async () => {
      const { result } = renderHook(() => useSettleSplits(), {
        wrapper: createQueryWrapper(),
      });

      let settleResult: { success: boolean } | undefined;
      await act(async () => {
        settleResult = await result.current.settle([]);
      });

      expect(settleResult).toEqual({ success: false });
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("QuickSettlementDialog — partial amount", () => {
    it("submits a partial payment amount when partial mode is enabled", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <QuickSettlementDialog
          open
          onOpenChange={vi.fn()}
          recipientName="Alex"
          amount={500000}
          currency="₫"
          onConfirm={onConfirm}
        />,
      );

      await user.click(screen.getByLabelText(/pay partial amount/i));
      await user.clear(screen.getByPlaceholderText(/enter amount/i));
      await user.type(screen.getByPlaceholderText(/enter amount/i), "200000");
      await user.click(screen.getByRole("button", { name: /record payment/i }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 200000,
            paymentMethod: "cash",
          }),
        );
      });
    });
  });

  describe("useSettleAllGroupDebts — bulk settle dispatches event", () => {
    beforeEach(() => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "expenses") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "expense-1" }],
                  error: null,
                }),
              }),
            }),
          } as ReturnType<typeof supabaseClient.from>;
        }

        if (table === "expense_splits") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "split-1" }, { id: "split-2" }],
                  error: null,
                }),
              }),
            }),
          } as ReturnType<typeof supabaseClient.from>;
        }

        return {} as ReturnType<typeof supabaseClient.from>;
      });

      mockRpc.mockResolvedValue({
        data: {
          success: true,
          group_id: "group-1",
          splits_settled: 2,
          expenses_settled: 1,
          total_amount: 300000,
          message: "Settled",
        },
        error: null,
      });
    });

    it("calls settle_all_group_debts RPC and dispatches settlement event on success", async () => {
      const { result } = renderHook(() => useSettleAllGroupDebts(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ groupId: "group-1" });
      });

      expect(mockRpc).toHaveBeenCalledWith("settle_all_group_debts", {
        p_group_id: "group-1",
      });
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});
