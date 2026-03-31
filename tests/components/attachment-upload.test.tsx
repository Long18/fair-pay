import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

vi.mock("@/hooks/ui/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import { AttachmentUpload } from "@/modules/expenses/components/attachment-upload";
import { useIsMobile } from "@/hooks/ui/use-mobile";

const mockClipboardRead = vi.fn();

describe("AttachmentUpload", () => {
  beforeEach(() => {
    mockTap.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockClipboardRead.mockReset();
    vi.mocked(useIsMobile).mockReturnValue(false);
    Object.defineProperty(global.navigator, "clipboard", {
      configurable: true,
      value: {
        read: mockClipboardRead,
      },
    });
  });

  it("shows desktop clipboard paste guidance", () => {
    render(<AttachmentUpload attachments={[]} onAttachmentsChange={vi.fn()} />);

    expect(
      screen.getByText(/press Ctrl\+V or Cmd\+V to paste from clipboard/i)
    ).toBeInTheDocument();
  });

  it("shows a mobile clipboard button and guidance", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(<AttachmentUpload attachments={[]} onAttachmentsChange={vi.fn()} />);

    expect(
      screen.getByText(/tap Paste from Clipboard if your receipt is already copied/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /paste from clipboard/i })
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

  it("reads clipboard files from the mobile paste button", async () => {
    const onAttachmentsChange = vi.fn();
    vi.mocked(useIsMobile).mockReturnValue(true);
    mockClipboardRead.mockResolvedValue([
      {
        types: ["image/png"],
        getType: vi.fn().mockResolvedValue(new Blob(["receipt"], { type: "image/png" })),
      },
    ]);

    render(<AttachmentUpload attachments={[]} onAttachmentsChange={onAttachmentsChange} />);

    fireEvent.click(screen.getByRole("button", { name: /paste from clipboard/i }));

    await waitFor(() => {
      expect(onAttachmentsChange).toHaveBeenCalledTimes(1);
    });

    expect(onAttachmentsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        file: expect.objectContaining({
          type: "image/png",
          name: expect.stringMatching(/^clipboard-\d+-1\.png$/),
        }),
        preview: expect.any(String),
      }),
    ]);
    expect(mockToastSuccess).toHaveBeenCalledWith("1 file(s) added from clipboard");
  });

  it("shows a fallback error when mobile clipboard access is blocked", async () => {
    const onAttachmentsChange = vi.fn();
    vi.mocked(useIsMobile).mockReturnValue(true);
    mockClipboardRead.mockRejectedValue(new Error("denied"));

    render(<AttachmentUpload attachments={[]} onAttachmentsChange={onAttachmentsChange} />);

    fireEvent.click(screen.getByRole("button", { name: /paste from clipboard/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Clipboard access was blocked. Allow paste and try again, or use Browse Files."
      );
    });
    expect(onAttachmentsChange).not.toHaveBeenCalled();
  });
});
