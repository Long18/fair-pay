import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionButtonGroup } from "@/components/ui/action-button-group";
import { PencilIcon, Trash2Icon, Share2Icon } from "@/components/ui/icons";

describe("ActionButtonGroup", () => {
  const mockActions = [
    {
      label: "Edit",
      icon: PencilIcon,
      onClick: vi.fn(),
      variant: "outline" as const,
    },
    {
      label: "Share",
      icon: Share2Icon,
      onClick: vi.fn(),
      variant: "outline" as const,
    },
    {
      label: "Delete",
      icon: Trash2Icon,
      onClick: vi.fn(),
      variant: "destructive" as const,
      destructive: true,
    },
  ];

  it("renders all action buttons in horizontal layout", () => {
    render(<ActionButtonGroup actions={mockActions} layout="horizontal" />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("renders all action buttons in vertical layout", () => {
    render(<ActionButtonGroup actions={mockActions} layout="vertical" />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("renders dropdown menu in dropdown layout", async () => {
    const user = userEvent.setup();
    render(<ActionButtonGroup actions={mockActions} layout="dropdown" />);

    // Should show dropdown trigger button
    const trigger = screen.getByRole("button", { name: /open actions menu/i });
    expect(trigger).toBeInTheDocument();

    // Click to open dropdown
    await user.click(trigger);

    // Should show all actions in dropdown
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onClick handler when button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    const actions = [
      {
        label: "Test Action",
        onClick: mockOnClick,
      },
    ];

    render(<ActionButtonGroup actions={actions} />);

    const button = screen.getByRole("button", { name: /test action/i });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when disabled prop is true", () => {
    const actions = [
      {
        label: "Disabled Action",
        onClick: vi.fn(),
        disabled: true,
      },
    ];

    render(<ActionButtonGroup actions={actions} />);

    const button = screen.getByRole("button", { name: /disabled action/i });
    expect(button).toBeDisabled();
  });

  it("applies destructive variant to destructive actions", () => {
    render(<ActionButtonGroup actions={mockActions} layout="horizontal" />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).toHaveClass("bg-destructive");
  });

  it("separates destructive actions with extra spacing in horizontal layout", () => {
    const { container } = render(
      <ActionButtonGroup actions={mockActions} layout="horizontal" />
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).toHaveClass("ml-6");
  });

  it("ensures minimum touch target size on mobile", () => {
    render(<ActionButtonGroup actions={mockActions} layout="horizontal" />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveClass("min-h-[44px]");
    });
  });

  it("renders icons when provided", () => {
    render(<ActionButtonGroup actions={mockActions} layout="horizontal" />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    const svg = editButton.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("handles empty actions array", () => {
    const { container } = render(<ActionButtonGroup actions={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("handles only destructive actions", () => {
    const destructiveOnly = [
      {
        label: "Delete",
        onClick: vi.fn(),
        destructive: true,
      },
    ];

    render(<ActionButtonGroup actions={destructiveOnly} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("handles only non-destructive actions", () => {
    const nonDestructiveOnly = [
      {
        label: "Edit",
        onClick: vi.fn(),
      },
      {
        label: "Share",
        onClick: vi.fn(),
      },
    ];

    render(<ActionButtonGroup actions={nonDestructiveOnly} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });
});
