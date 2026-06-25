import { describe, expect, it, vi } from "vitest";
import FairPayChatOrchestrator from "../FairPayChatOrchestrator";
import { FAIRPAY_SYSTEM_PROMPT } from "../system-prompt";
import type { AssistantChatFn, ConversationMessage, LegacyToolExecutor, McpClientInterface } from "../types";
import type { AgentPreviewResponse } from "@/lib/agent-api/types";

const baseHistory = (): ConversationMessage[] => [{ role: "system", content: FAIRPAY_SYSTEM_PROMPT }];
const completion = (content: string) => ({ message: { content } });

function makePreview(): AgentPreviewResponse {
  return {
    preview_id: "preview-1",
    preview_hash: "hash-1",
    operation_id: "operation-1",
    expires_at: "2026-06-25T12:00:00Z",
    duplicate_warnings: [],
    preview: {
      group_id: "group-1",
      group_name: "Trip",
      description: "Lunch",
      amount: 100000,
      currency: "VND",
      expense_date: "2026-06-25",
      category: "Food & Drink",
      comment: null,
      payer: { member_id: "member-1", full_name: "Long", email: "long@example.com" },
      requested_split_method: "equal",
      splits: [{ member_id: "member-1", full_name: "Long", email: "long@example.com", amount: 100000 }],
      total_check: 100000,
    },
  };
}

function orchestrator(
  chatFn: AssistantChatFn,
  overrides: Partial<{
    mcpClient: McpClientInterface;
    legacyExecutor: LegacyToolExecutor;
  }> = {},
) {
  return new FairPayChatOrchestrator({
    chatFn,
    mcpClient: overrides.mcpClient ?? { callTool: vi.fn(async () => ({ ok: true })) },
    legacyExecutor: overrides.legacyExecutor ?? vi.fn(async () => ({ ok: true })),
  });
}

describe("FairPayChatOrchestrator manual JSON protocol", () => {
  it("executes a valid manual tool call and continues to a final response", async () => {
    const legacyExecutor = vi.fn<LegacyToolExecutor>(async () => ({ total: 120000 }));
    const chatFn = vi
      .fn<AssistantChatFn>()
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "tool_call", name: "get_debt_summary", arguments: {} })))
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "final", content: "You have one open balance." })));

    const result = await orchestrator(chatFn, { legacyExecutor }).processTurn("Who owes me?", baseHistory(), null);

    expect(legacyExecutor).toHaveBeenCalledWith("get_debt_summary", {});
    expect(result.text).toBe("You have one open balance.");
  });

  it("treats plain text model output as a final response", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const legacyExecutor = vi.fn<LegacyToolExecutor>();

    const result = await orchestrator(async () => completion("not json"), { mcpClient, legacyExecutor })
      .processTurn("hello", baseHistory(), null);

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(legacyExecutor).not.toHaveBeenCalled();
    expect(result.text).toBe("not json");
  });

  it("does not execute tools for malformed structured JSON", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const legacyExecutor = vi.fn<LegacyToolExecutor>();

    const result = await orchestrator(async () => completion('{"type":"tool_call","name":"get_debt_summary"'), { mcpClient, legacyExecutor })
      .processTurn("hello", baseHistory(), null);

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(legacyExecutor).not.toHaveBeenCalled();
    expect(result.text).toContain("could not parse");
  });

  it("accepts common JSON text fields as final responses", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const legacyExecutor = vi.fn<LegacyToolExecutor>();

    const result = await orchestrator(async () => completion(JSON.stringify({ answer: "I can help with that." })), {
      mcpClient,
      legacyExecutor,
    }).processTurn("hello", baseHistory(), null);

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(legacyExecutor).not.toHaveBeenCalled();
    expect(result.text).toBe("I can help with that.");
  });

  it("does not treat invalid tool-call JSON as a final response", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const legacyExecutor = vi.fn<LegacyToolExecutor>();

    const result = await orchestrator(
      async () => completion(JSON.stringify({ type: "tool_call", name: "get_debt_summary" })),
      { mcpClient, legacyExecutor },
    ).processTurn("hello", baseHistory(), null);

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(legacyExecutor).not.toHaveBeenCalled();
    expect(result.text).toContain("could not parse");
  });

  it("blocks forbidden commit actions", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const chatFn = vi
      .fn<AssistantChatFn>()
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "tool_call", name: "fairpay_commit_expense", arguments: {} })))
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "final", content: "Use the FairPay UI to confirm." })));

    const result = await orchestrator(chatFn, { mcpClient }).processTurn("commit it", baseHistory(), null);

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(result.text).toBe("Use the FairPay UI to confirm.");
  });

  it("protects an existing pending preview from replacement", async () => {
    const mcpClient: McpClientInterface = { callTool: vi.fn() };
    const chatFn = vi
      .fn<AssistantChatFn>()
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "tool_call", name: "fairpay_preview_expense", arguments: {} })))
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "final", content: "Resolve the current preview first." })));

    const result = await orchestrator(chatFn, { mcpClient }).processTurn("add another", baseHistory(), makePreview());

    expect(mcpClient.callTool).not.toHaveBeenCalled();
    expect(result.blockedPreviewReplacement).toBe(true);
  });

  it("asks for member clarification when selected members are ambiguous", async () => {
    const mcpClient: McpClientInterface = {
      callTool: vi.fn(async (name) => {
        if (name === "fairpay_list_group_members") {
          return {
            members: [
              { member_id: "member-ambiguous", full_name: "Alex", email: "a@example.com" },
              { member_id: "member-other", full_name: "Alex", email: "b@example.com" },
            ],
          };
        }
        throw new Error("preview should not execute");
      }),
    };
    const chatFn = vi
      .fn<AssistantChatFn>()
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "tool_call", name: "fairpay_list_group_members", arguments: { group_id: "group-1" } })))
      .mockResolvedValueOnce(completion(JSON.stringify({
        type: "tool_call",
        name: "fairpay_preview_expense",
        arguments: {
          actor_confirmed: true,
          transaction_type: "group",
          group_id: "group-1",
          payer_member_id: "member-1",
          participants: [{ member_id: "member-ambiguous" }],
        },
      })))
      .mockResolvedValueOnce(completion(JSON.stringify({ type: "final", content: "Which Alex should I use?" })));

    const result = await orchestrator(chatFn, { mcpClient }).processTurn("split with Alex", baseHistory(), null);

    expect(mcpClient.callTool).toHaveBeenCalledTimes(1);
    expect(result.text).toBe("Which Alex should I use?");
  });
});
