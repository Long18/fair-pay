import { act } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the FairPay logo for assistant messages", () => {
    render(<ChatMessage message={makeMessage("Hello")} />);

    expect(screen.getByAltText("FairPay")).toBeInTheDocument();
  });

  it("reveals assistant content with a streaming effect", async () => {
    render(<ChatMessage message={makeMessage("Streaming response text")} />);

    expect(screen.queryByText("Streaming response text")).not.toBeInTheDocument();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Streaming response text")).toBeInTheDocument();
  });
});
