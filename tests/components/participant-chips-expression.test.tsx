import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

type ButtonProps = { children?: ReactNode } & ComponentProps<"button">;
type InputProps = ComponentProps<"input">;
type SpanProps = { children?: ReactNode } & ComponentProps<"span">;
type DivProps = { children?: ReactNode } & ComponentProps<"div">;
type ImageProps = ComponentProps<"img">;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === "expenses.splitMismatch") {
        return `Total (${options?.splitAmount}) doesn't match expense (${options?.expenseAmount})`;
      }

      const translations: Record<string, string> = {
        "expenses.participants": "Participants",
        "expenses.pendingInvites": "Pending invites",
        "expenses.addByEmail": "Add by email",
        "expenses.add": "Add",
        "expenses.totalSplit": "Total split",
        "expenses.noParticipants": "No participants",
        "expenses.clickToAdd": "Click to add",
        "common.you": "You",
        "common.selectAll": "Select all",
        "common.deselectAll": "Deselect all",
        "auth.invalidEmail": "Invalid email address",
        "auth.emailPlaceholder": "Enter email",
        "expenses.emailAlreadyAdded": "Email already added",
      };

      return translations[key] || key;
    },
  }),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({
    tap: vi.fn(),
  }),
}));

vi.mock("@/lib/locale-utils", () => ({
  formatNumber: (value: number) => value.toLocaleString("vi-VN"),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonProps) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: InputProps) => <input {...props} />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: SpanProps) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: DivProps) => <div {...props}>{children}</div>,
  AvatarImage: (props: ImageProps) => <img alt="" {...props} />,
  AvatarFallback: ({ children, ...props }: SpanProps) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/icons", () => ({
  UserPlusIcon: () => <span>+</span>,
  XIcon: () => <span>x</span>,
  CheckIcon: () => <span>check</span>,
  UsersIcon: () => <span>users</span>,
  MailIcon: () => <span>mail</span>,
  UserCheckIcon: () => <span>user-check</span>,
  ChevronLeftIcon: () => <span>left</span>,
  ChevronRightIcon: () => <span>right</span>,
}));

import { ParticipantChips } from "@/modules/expenses/components/participant-chips";

describe("ParticipantChips exact split expressions", () => {
  const baseProps = {
    members: [
      { id: "user-1", full_name: "Alice" },
      { id: "user-2", full_name: "Bob" },
    ],
    participants: [
      {
        user_id: "user-2",
        split_value: 0,
        computed_amount: 0,
      },
    ],
    availableMembers: [],
    currentUserId: "user-1",
    splitMethod: "exact" as const,
    amount: 30000,
    currency: "USD",
    onAddParticipant: vi.fn(),
    onAddParticipantByEmail: vi.fn(),
    onRemoveParticipant: vi.fn(),
    onSplitValueChange: vi.fn(),
    onExpressionStateChange: vi.fn(),
    totalSplit: 0,
  };

  it("resolves valid expressions and emits numeric split values", async () => {
    const user = userEvent.setup();
    const onSplitValueChange = vi.fn();

    render(
      <ParticipantChips
        {...baseProps}
        onSplitValueChange={onSplitValueChange}
      />
    );

    const input = screen.getByDisplayValue("0");
    await user.clear(input);
    await user.type(input, "10.000+20.000");

    expect(onSplitValueChange).toHaveBeenLastCalledWith("user-2", 30000);
    expect(screen.getByText("= 30.000 $")).toBeInTheDocument();
  });

  it("marks incomplete expressions as blocking without a red error", async () => {
    const user = userEvent.setup();
    const onExpressionStateChange = vi.fn();

    render(
      <ParticipantChips
        {...baseProps}
        onExpressionStateChange={onExpressionStateChange}
      />
    );

    const input = screen.getByDisplayValue("0");
    await user.clear(input);
    await user.type(input, "100+");

    expect(screen.getByText("Finish expression")).toBeInTheDocument();
    expect(screen.getByText("Complete any in-progress expressions before submitting.")).toBeInTheDocument();
    expect(onExpressionStateChange).toHaveBeenLastCalledWith(true);
  });

  it("shows an invalid-expression error for malformed input", () => {
    render(<ParticipantChips {...baseProps} />);

    const input = screen.getByDisplayValue("0");
    fireEvent.change(input, { target: { value: "10x/2" } });

    expect(screen.getByText("Invalid expression")).toBeInTheDocument();
  });
});
