import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AssistantToolTrace from "../AssistantToolTrace";

describe("AssistantToolTrace", () => {
  it("lists localized tool labels when expanded", async () => {
    const user = userEvent.setup();
    render(
      <AssistantToolTrace
        language="vi"
        steps={[
          { name: "get_debt_summary", status: "done" },
          { name: "fairpay_list_groups", status: "done" },
        ]}
      />,
    );

    const trigger = screen.getByText("Đã dùng 2 công cụ");
    await user.click(trigger);
    expect(screen.getByText("get_debt_summary")).toBeInTheDocument();
  });
});
