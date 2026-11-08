import { describe, expect, it } from "vitest";

import type { ChatMessage } from "../../types";
import { messagesForThreadRender } from "../thread-messages";

const loading = { state: "loading" as const, model: "m", progress: 0.5, message: "x", fromCache: false };

function msg(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: "1",
    conversation_id: "c",
    role,
    content,
    metadata: {},
    created_at: new Date().toISOString(),
  };
}

describe("messagesForThreadRender", () => {
  it("drops empty trailing assistant while model loads", () => {
    const messages = [msg("user", "hi"), msg("assistant", "")];
    const out = messagesForThreadRender(messages, true, loading);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe("user");
  });

  it("keeps messages when model is ready", () => {
    const messages = [msg("user", "hi"), msg("assistant", "")];
    const ready = { state: "ready" as const, model: "m" };
    expect(messagesForThreadRender(messages, true, ready)).toHaveLength(2);
  });
});
