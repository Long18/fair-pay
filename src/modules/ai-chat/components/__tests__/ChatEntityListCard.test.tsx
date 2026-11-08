import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatEntityListCard from "../ChatEntityListCard";

const goMock = vi.fn();

vi.mock("@refinedev/core", () => ({
  useGo: () => goMock,
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({ tap: vi.fn() }),
}));

describe("ChatEntityListCard", () => {
  it("navigates to group show on row click", async () => {
    const user = userEvent.setup();
    render(
      <ChatEntityListCard
        language="en"
        surface={{
          kind: "groups",
          groups: [{ id: "group-uuid", name: "Demo Squad" }],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Demo Squad/i }));
    expect(goMock).toHaveBeenCalledWith({ to: "/groups/show/group-uuid" });
  });

  it("navigates to expense show on row click", async () => {
    goMock.mockClear();
    const user = userEvent.setup();
    render(
      <ChatEntityListCard
        language="en"
        surface={{
          kind: "expenses",
          expenses: [{ id: "exp-1", description: "Coffee run", amount: 120000, currency: "VND" }],
          currency: "VND",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Coffee run/i }));
    expect(goMock).toHaveBeenCalledWith({ to: "/expenses/show/exp-1" });
  });

  it("navigates to expense from comment row", async () => {
    goMock.mockClear();
    const user = userEvent.setup();
    render(
      <ChatEntityListCard
        language="vi"
        surface={{
          kind: "comments",
          comments: [
            {
              id: "c1",
              content: "Looks good",
              expense_id: "exp-99",
              profiles: { full_name: "Chi" },
              expenses: { description: "Team lunch" },
              created_at: "2026-11-01T10:00:00Z",
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Team lunch/i }));
    expect(goMock).toHaveBeenCalledWith({ to: "/expenses/show/exp-99" });
  });
});
