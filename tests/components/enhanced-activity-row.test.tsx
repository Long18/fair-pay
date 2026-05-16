import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGo = vi.fn();

vi.mock("@refinedev/core", () => ({
  useGo: () => mockGo,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : fallback.defaultValue || "",
  }),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({
    tap: vi.fn(),
  }),
}));

import { EnhancedActivityRow } from "@/components/dashboard/activity/enhanced-activity-row";
import type { EnhancedActivityItem } from "@/types/activity";

const expenseActivity: EnhancedActivityItem = {
  id: "expense-1",
  type: "expense",
  description: "Team dinner",
  amount: 120000,
  totalAmount: 120000,
  userAmount: 60000,
  currency: "VND",
  date: "2026-05-10T00:00:00.000Z",
  activityDate: "2026-05-10T00:00:00.000Z",
  paymentState: "unpaid",
  settlementProgressPct: 0,
  oweStatus: { direction: "owed", amount: 60000 },
  participantCount: 2,
  payingParticipants: [],
  paymentEvents: [],
  originalExpense: {
    paid_by_user_id: "viewer-1",
    profiles: { full_name: "Viewer One" },
  },
};

const paymentActivity: EnhancedActivityItem = {
  id: "payment-1",
  type: "payment",
  description: "Coffee payback",
  amount: 45000,
  totalAmount: 45000,
  userAmount: 45000,
  currency: "VND",
  date: "2026-05-11T00:00:00.000Z",
  activityDate: "2026-05-11T00:00:00.000Z",
  paymentState: "paid",
  settlementProgressPct: 100,
  oweStatus: { direction: "neutral", amount: 0 },
  participantCount: 2,
  payingParticipants: [
    { id: "viewer-1", name: "Viewer One" },
  ],
  paymentEvents: [],
  originalPayment: {
    from_user: "viewer-1",
    to_user: "friend-2",
    from_profile: { full_name: "Viewer One" },
    to_profile: { full_name: "Friend Two" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EnhancedActivityRow", () => {
  it("shows total and viewer share side by side for ledger rows", () => {
    render(
      <EnhancedActivityRow
        activity={expenseActivity}
        currentUserId="viewer-1"
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("120,000 VND")).toBeInTheDocument();
    expect(screen.getByText("My share")).toBeInTheDocument();
    expect(screen.getByText("60,000 VND")).toBeInTheDocument();
  });

  it("routes direct payment rows to payment detail instead of expense detail", async () => {
    const user = userEvent.setup();

    render(
      <EnhancedActivityRow
        activity={paymentActivity}
        currentUserId="viewer-1"
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    await user.click(screen.getByText("Coffee payback"));

    expect(mockGo).toHaveBeenCalledWith({ to: "/payments/show/payment-1" });
  });

  it("treats dashboard payment rows as first-class payments, not empty expenses", async () => {
    const user = userEvent.setup();

    render(
      <EnhancedActivityRow
        activity={paymentActivity}
        currentUserId="viewer-1"
        isExpanded={false}
        onToggleExpand={vi.fn()}
        variant="dashboard"
      />
    );

    expect(screen.getByText("Direct payment")).toBeInTheDocument();
    expect(screen.queryByText("No payments yet for this expense.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(mockGo).toHaveBeenCalledWith({ to: "/payments/show/payment-1" });
  });
});
