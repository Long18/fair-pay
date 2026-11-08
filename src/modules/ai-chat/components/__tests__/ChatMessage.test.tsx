import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatMessage from "../ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../types";

vi.mock("@/hooks/ui/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("@refinedev/core", () => ({
  useGo: () => vi.fn(),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({ tap: vi.fn() }),
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

  it("keeps the stream cursor inline while partial final JSON is streaming", () => {
    const raw = '{"type":"final","content":"Tôi không có thông tin';
    const { container } = render(<ChatMessage message={makeMessage(raw)} isStreaming />);
    expect(screen.getByText(/Tôi không có thông tin/)).toBeInTheDocument();
    const bubble = container.querySelector(".rounded-bl-sm");
    expect(bubble?.className).toMatch(/last-child.*after:content/);
    expect(bubble?.querySelector("span[aria-hidden]")).toBeNull();
  });

  it("falls back to raw text when no JSON contract is present", () => {
    const raw = "Just a plain response with no wrapper.";
    render(<ChatMessage message={makeMessage(raw)} />);
    expect(screen.getByText(raw)).toBeInTheDocument();
  });

  it("renders ReadDigestCard when metadata includes read_digest", () => {
    const message: ChatMessageType = {
      ...makeMessage("## Tổng hợp FairPay\n\n..."),
      metadata: {
        mode: "info",
        status: "success",
        response_language: "vi",
        read_digest: {
          debt: [{ counterparty_name: "Alice", amount: 50, currency: "VND", i_owe_them: false }],
          groups: [],
          friends: [],
          expenses: [],
          comments: [],
        },
      },
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByTestId("read-digest-card")).toBeInTheDocument();
    expect(screen.queryByText(/## Tổng hợp/)).not.toBeInTheDocument();
  });

  it("renders ChatEntityListCard when metadata includes entity_surface", () => {
    const message: ChatMessageType = {
      ...makeMessage("Groups markdown list..."),
      metadata: {
        mode: "info",
        status: "success",
        response_language: "en",
        entity_surface: {
          kind: "groups",
          groups: [{ id: "g-1", name: "Lunch club" }],
        },
      },
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByTestId("chat-entity-list-card")).toBeInTheDocument();
    expect(screen.queryByText(/Groups markdown/)).not.toBeInTheDocument();
  });

  it("renders AssistantCapabilitiesCard when metadata includes assistant_capabilities", () => {
    const message: ChatMessageType = {
      ...makeMessage("**Capabilities** markdown"),
      metadata: {
        mode: "info",
        status: "success",
        assistant_capabilities: true,
        response_language: "vi",
      },
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByTestId("assistant-capabilities-card")).toBeInTheDocument();
    expect(screen.queryByText(/Capabilities/)).not.toBeInTheDocument();
  });

  it("renders collapsible tool trace from metadata", () => {
    const message: ChatMessageType = {
      ...makeMessage(""),
      metadata: {
        mode: "info",
        status: "success",
        response_language: "en",
        tool_trace: [
          { name: "get_debt_summary", status: "done" },
          { name: "fairpay_list_groups", status: "done" },
        ],
      },
    };
    render(<ChatMessage message={message} />);
    expect(screen.getByText("Used 2 tools")).toBeInTheDocument();
  });
});
