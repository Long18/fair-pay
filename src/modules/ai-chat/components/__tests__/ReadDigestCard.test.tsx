import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ReadDigestCard from "../ReadDigestCard";

const goMock = vi.fn();

vi.mock("@refinedev/core", () => ({
  useGo: () => goMock,
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({ tap: vi.fn() }),
}));

describe("ReadDigestCard", () => {
  it("renders sectioned summary instead of a wall of text", () => {
    render(
      <ReadDigestCard
        language="vi"
        bag={{
          debt: [
            { counterparty_name: "Test User", amount: 100000, currency: "VND", i_owe_them: false },
          ],
          groups: [],
          friends: [],
          expenses: [
            { description: "Movie night (demo)", amount: 400000, currency: "VND", expense_date: "2026-11-07" },
          ],
          comments: [],
        }}
      />,
    );

    expect(screen.getByTestId("read-digest-card")).toBeInTheDocument();
    expect(screen.getByTestId("read-digest-card")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText(/400/)).toBeInTheDocument();
    expect(screen.getByText(/Top spending|Top chi tiêu/)).toBeInTheDocument();
  });

  it("opens group show route when a group row is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ReadDigestCard
        language="en"
        bag={{
          debt: [],
          groups: [{ id: "gid-1", name: "FairPay Demo Squad" }],
          friends: [],
          expenses: [],
          comments: [],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /FairPay Demo Squad/i }));
    expect(goMock).toHaveBeenCalledWith({ to: "/groups/show/gid-1" });
  });
});
