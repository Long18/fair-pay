import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

import { AmountInput } from "@/modules/expenses/components/amount-input";

describe("AmountInput expression support", () => {
  it("resolves vi-VN grouped expressions and shows a live preview", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleExpressionStateChange = vi.fn();

    render(
      <AmountInput
        value={undefined}
        onChange={handleChange}
        onExpressionStateChange={handleExpressionStateChange}
        currency="VND"
      />
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "10.000+20.000");

    expect(handleChange).toHaveBeenLastCalledWith(30000);
    expect(screen.getByText("= 30.000 ₫")).toBeInTheDocument();
    expect(handleExpressionStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "valid",
        value: 30000,
      })
    );
  });

  it("keeps incomplete expressions unresolved without a red error", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <AmountInput
        value={undefined}
        onChange={handleChange}
        currency="USD"
      />
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "100+");

    expect(handleChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText("Finish the expression to apply the amount")).toBeInTheDocument();
  });

  it("collapses a valid expression to a formatted numeric value on blur", () => {
    const handleChange = vi.fn();

    render(
      <AmountInput
        value={undefined}
        onChange={handleChange}
        currency="VND"
      />
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10000+5000" } });
    fireEvent.blur(input);

    expect(input.value).toBe("15.000");
  });
});
