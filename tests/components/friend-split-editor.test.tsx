import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FriendSplitEditor } from "@/modules/expenses/components/friend-expense/friend-split-editor";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "expenses.enterAmounts": "Enter amounts",
        "expenses.enterPercentages": "Enter percentages",
        "expenses.yourShare": "Your Share",
        "expenses.friendShare": `${options?.name}'s share`,
        "expenses.friendSplitRemaining": `${options?.amount} left to allocate`,
        "expenses.friendSplitOverAllocated": `${options?.amount} over the total`,
        "expenses.finishSplitExpression": "Finish the split amount before saving",
        "expenses.splitMismatch": `Total (${options?.splitAmount}) doesn't match expense (${options?.expenseAmount})`,
        "common.you": "You",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/lib/locale-utils", () => ({
  formatNumber: (num: number) => String(num),
}));

const members = [
  { id: "you", full_name: "Long Nguyen" },
  { id: "friend", full_name: "Minh Tran" },
];

const participants = [
  { user_id: "you", split_value: 50000, computed_amount: 50000 },
  { user_id: "friend", split_value: 50000, computed_amount: 50000 },
];

describe("FriendSplitEditor", () => {
  it("renders exact amount inputs for both people", () => {
    render(
      <FriendSplitEditor
        members={members}
        currentUserId="you"
        participants={participants}
        splitMethod="exact"
        amount={100000}
        currency="VND"
        totalSplit={100000}
        onSplitValueChange={vi.fn()}
      />
    );

    expect(screen.getByText("Enter amounts")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Share")).toBeInTheDocument();
    expect(screen.getByLabelText("Minh Tran's share")).toBeInTheDocument();
  });

  it("fills the other person's exact remainder when one share changes", async () => {
    const user = userEvent.setup();
    const onSplitValueChange = vi.fn();

    render(
      <FriendSplitEditor
        members={members}
        currentUserId="you"
        participants={participants}
        splitMethod="exact"
        amount={100000}
        currency="VND"
        totalSplit={100000}
        onSplitValueChange={onSplitValueChange}
      />
    );

    const yourShare = screen.getByLabelText("Your Share");
    await user.clear(yourShare);
    await user.type(yourShare, "70000");

    expect(onSplitValueChange).toHaveBeenCalledWith("you", 70000);
    expect(onSplitValueChange).toHaveBeenCalledWith("friend", 30000);
    expect(screen.getByLabelText("Minh Tran's share")).toHaveValue("30000");
  });

  it("fills the other person's remaining percent when one share changes", async () => {
    const user = userEvent.setup();
    const onSplitValueChange = vi.fn();

    render(
      <FriendSplitEditor
        members={members}
        currentUserId="you"
        participants={[
          { user_id: "you", split_value: 50, computed_amount: 50000 },
          { user_id: "friend", split_value: 50, computed_amount: 50000 },
        ]}
        splitMethod="percentage"
        amount={100000}
        currency="VND"
        totalSplit={100000}
        onSplitValueChange={onSplitValueChange}
      />
    );

    expect(screen.getByText("Enter percentages")).toBeInTheDocument();

    const yourShare = screen.getByLabelText("Your Share");
    await user.clear(yourShare);
    await user.type(yourShare, "70");

    expect(onSplitValueChange).toHaveBeenCalledWith("you", 70);
    expect(onSplitValueChange).toHaveBeenCalledWith("friend", 30);
    expect(screen.getByLabelText("Minh Tran's share")).toHaveValue(30);
  });

  it("marks an in-progress exact expression as blocking", () => {
    const onExpressionStateChange = vi.fn();

    render(
      <FriendSplitEditor
        members={members}
        currentUserId="you"
        participants={participants}
        splitMethod="exact"
        amount={100000}
        currency="VND"
        totalSplit={100000}
        onSplitValueChange={vi.fn()}
        onExpressionStateChange={onExpressionStateChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Your Share"), { target: { value: "50+" } });

    expect(onExpressionStateChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Finish the split amount before saving")).toBeInTheDocument();
  });
});
