import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { mockTap, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockTap: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({
    tap: mockTap,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import { AttachmentUpload } from "@/modules/expenses/components/attachment-upload";

describe("AttachmentUpload", () => {
  beforeEach(() => {
    mockTap.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  it("shows clipboard paste guidance", () => {
    render(<AttachmentUpload attachments={[]} onAttachmentsChange={vi.fn()} />);

    expect(
      screen.getByText(/press Ctrl\+V or Cmd\+V to paste from clipboard/i)
    ).toBeInTheDocument();
  });

  it("adds pasted clipboard files as attachments", () => {
    const onAttachmentsChange = vi.fn();
    const file = new File(["receipt"], "receipt.png", { type: "image/png" });

    render(<AttachmentUpload attachments={[]} onAttachmentsChange={onAttachmentsChange} />);

    const uploadArea = screen.getByRole("group", { name: /attachment upload area/i });
    fireEvent.paste(uploadArea, {
      clipboardData: {
        items: [
          {
            kind: "file",
            getAsFile: () => file,
          },
        ],
      },
    });

    expect(onAttachmentsChange).toHaveBeenCalledTimes(1);
    expect(onAttachmentsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        file,
        preview: expect.any(String),
      }),
    ]);
    expect(mockToastSuccess).toHaveBeenCalledWith("1 file(s) added from clipboard");
  });
});
