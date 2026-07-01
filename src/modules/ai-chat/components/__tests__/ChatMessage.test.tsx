import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatMessage from "../ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../types";

vi.mock("@/hooks/ui/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

function makeMessage(content: string, role: ChatMessageType["role"] = "assistant"): ChatMessageType {
  return {
    id: `${role}-1`,
    conversation_id: "local",
    role,
    content,
    metadata: { mode: "info", status: "success" },
    created_at: new Date("2026-06-25T00:00:00.000Z").toISOString(),
  };
}

describe("ChatMessage", () => {
  it("uses the FairPay logo for assistant messages", () => {
    render(<ChatMessage message={makeMessage("Hello")} />);
    expect(screen.getByAltText("FairPay")).toBeInTheDocument();
  });

  it("renders plain text content directly (no timer reveal)", () => {
    render(<ChatMessage message={makeMessage("Hello there")} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders user messages as-is without parsing", () => {
    const raw = `{"type":"final","content":"should not be stripped"}`;
    render(<ChatMessage message={makeMessage(raw, "user")} />);
    // User messages bypass parsing — raw content is shown
    expect(screen.getByText(raw)).toBeInTheDocument();
  });

  it("extracts content from the final JSON contract", () => {
    const raw = `<think>reasoning</think>{"type":"final","content":"Clean answer"}`;
    render(<ChatMessage message={makeMessage(raw)} />);
    expect(screen.getByText("Clean answer")).toBeInTheDocument();
    // Raw JSON must not be visible
    expect(screen.queryByText(/"type"/)).not.toBeInTheDocument();
  });

  it("does not show reasoning text by default (collapsed)", () => {
    const raw = `<think>internal reasoning here</think>{"type":"final","content":"Answer"}`;
    render(<ChatMessage message={makeMessage(raw)} />);
    expect(screen.queryByText("internal reasoning here")).not.toBeInTheDocument();
  });

  it("shows reasoning text after clicking the trigger", async () => {
    const user = userEvent.setup();
    const raw = `<think>internal reasoning here</think>{"type":"final","content":"Answer"}`;
    render(<ChatMessage message={makeMessage(raw)} />);

    const trigger = screen.getByText("Reasoning");
    await user.click(trigger);

    expect(screen.getByText("internal reasoning here")).toBeInTheDocument();
  });

  it("shows Thinking... label while reasoning block is still open", () => {
    const raw = `<think>still thinking...`;
    render(<ChatMessage message={makeMessage(raw)} isStreaming />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("falls back to raw text when no JSON contract is present", () => {
    const raw = "Just a plain response with no wrapper.";
    render(<ChatMessage message={makeMessage(raw)} />);
    expect(screen.getByText(raw)).toBeInTheDocument();
  });
});
