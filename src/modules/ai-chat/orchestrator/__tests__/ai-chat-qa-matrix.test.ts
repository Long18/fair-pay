/**
 * Ordered chat QA matrix (easy → complex): planner routing + orchestrator metadata.
 * Use with `pnpm exec vitest run src/modules/ai-chat/orchestrator/__tests__/ai-chat-qa-matrix.test.ts`.
 * Manual UI: see docs/ai-chat-qa-matrix.md (one new chat per row).
 */
import { describe, expect, it } from "vitest";
import FairPayChatOrchestrator from "../FairPayChatOrchestrator";
import { FAIRPAY_SYSTEM_PROMPT } from "../system-prompt";
import { looksLikeCapabilitiesQuery, looksLikeReadDigestQuery } from "../assistant-meta";
import { matchReadIntent, planReadIntentStep } from "../read-intent-registry";
import type { AssistantChatFn, ConversationMessage, LegacyToolExecutor, McpClientInterface } from "../types";
import type { ChatEntitySurface } from "../../utils/chat-entity-surface";

const baseHistory = (): ConversationMessage[] => [{ role: "system", content: FAIRPAY_SYSTEM_PROMPT }];

type UiSurface =
  | "chat-entity-list:balances"
  | "chat-entity-list:groups"
  | "chat-entity-list:friends"
  | "chat-entity-list:expenses"
  | "read-digest-card"
  | "assistant-capabilities-card"
  | "markdown";

type QaCase = {
  id: string;
  tier: "easy" | "medium" | "hard";
  prompt: string;
  expectedUi: UiSurface;
  expectedToolCount: number;
  expectedFirstTool?: string;
};

export const AI_CHAT_QA_MATRIX: QaCase[] = [
  {
    id: "L1",
    tier: "easy",
    prompt: "Ai đang nợ tôi?",
    expectedUi: "chat-entity-list:balances",
    expectedToolCount: 1,
    expectedFirstTool: "get_debt_summary",
  },
  {
    id: "L2",
    tier: "easy",
    prompt: "Tôi đang tham gia nhóm nào?",
    expectedUi: "chat-entity-list:groups",
    expectedToolCount: 1,
    expectedFirstTool: "fairpay_list_groups",
  },
  {
    id: "L3",
    tier: "easy",
    prompt: "Tôi có những bạn nào?",
    expectedUi: "chat-entity-list:friends",
    expectedToolCount: 1,
    expectedFirstTool: "get_friends",
  },
  {
    id: "L4",
    tier: "easy",
    prompt: "Top 5 khoản chi theo số tiền",
    expectedUi: "chat-entity-list:expenses",
    expectedToolCount: 1,
    expectedFirstTool: "get_expenses",
  },
  {
    id: "L5",
    tier: "easy",
    prompt: "bình luận mới gần đây",
    expectedUi: "chat-entity-list:comments",
    expectedToolCount: 1,
    expectedFirstTool: "get_recent_expense_comments",
  },
  {
    id: "M1",
    tier: "medium",
    prompt: "Tổng hợp FairPay",
    expectedUi: "read-digest-card",
    expectedToolCount: 5,
    expectedFirstTool: "get_debt_summary",
  },
  {
    id: "M2",
    tier: "medium",
    prompt: "bạn có thể làm gì",
    expectedUi: "assistant-capabilities-card",
    expectedToolCount: 0,
  },
  {
    id: "H1",
    tier: "hard",
    prompt: "chi tiết nhóm House Rent 5",
    expectedUi: "markdown",
    expectedToolCount: 2,
    expectedFirstTool: "fairpay_list_groups",
  },
  {
    id: "H2",
    tier: "hard",
    prompt: "Who owes me money?",
    expectedUi: "chat-entity-list:balances",
    expectedToolCount: 1,
    expectedFirstTool: "get_debt_summary",
  },
  {
    id: "H3",
    tier: "hard",
    prompt: "FairPay summary",
    expectedUi: "read-digest-card",
    expectedToolCount: 5,
    expectedFirstTool: "get_debt_summary",
  },
];

function entityUi(surface: ChatEntitySurface | undefined): UiSurface {
  if (!surface) return "markdown";
  return `chat-entity-list:${surface.kind}` as UiSurface;
}

const sampleDebt = [
  {
    counterparty_id: "u2",
    counterparty_name: "Alex",
    amount: 120_000,
    currency: "VND",
    i_owe_them: false,
  },
];

const sampleGroupsMcp = {
  groups: [{ id: "g-house", name: "House Rent 5", description: null }],
};

const sampleGroupsLegacy = [{ group_id: "g-house", groups: { id: "g-house", name: "House Rent 5" } }];

const sampleFriends = [
  {
    user_a: "viewer-1",
    user_b: "f1",
    user_b_profile: { id: "f1", full_name: "Bi", email: "bi@example.com" },
  },
];

const sampleExpenses = [
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0104",
    description: "Movie night",
    amount: 500_000,
    currency: "VND",
    category: "Entertainment",
  },
];

const sampleComments = [
  {
    id: "c1",
    content: "Ok",
    expense_id: sampleExpenses[0].id,
    profiles: { full_name: "Alex" },
    expenses: { description: "Movie night", expense_date: "2026-11-01" },
    created_at: "2026-11-01T10:00:00Z",
  },
];

function buildMockExecutors(): { legacyExecutor: LegacyToolExecutor; mcpClient: McpClientInterface } {
  const legacyExecutor: LegacyToolExecutor = async (name) => {
    if (name === "get_debt_summary") return sampleDebt;
    if (name === "get_groups") return sampleGroupsLegacy;
    if (name === "get_friends") return sampleFriends;
    if (name === "get_expenses") return sampleExpenses;
    if (name === "get_recent_expense_comments") return sampleComments;
    if (name === "get_group_details") {
      return { group: { id: "g-house", name: "House Rent 5" }, members: [], expenses: [] };
    }
    return { ok: true };
  };
  const mcpClient: McpClientInterface = {
    callTool: async (name) => {
      if (name === "fairpay_list_groups") return sampleGroupsMcp;
      return {};
    },
  };
  return { legacyExecutor, mcpClient };
}

describe("ai-chat QA matrix — planner routing", () => {
  it.each(AI_CHAT_QA_MATRIX.map((c) => [c.id, c.prompt, c.expectedFirstTool] as const))(
    "%s first tool for %j",
    (id, prompt, expectedFirstTool) => {
      if (id === "M1" || id === "H3") {
        expect(looksLikeReadDigestQuery(prompt)).toBe(true);
        const step = planReadIntentStep(prompt);
        expect(step).toBeNull();
        return;
      }
      if (id === "M2") {
        expect(looksLikeCapabilitiesQuery(prompt)).toBe(true);
        return;
      }
      const intent = matchReadIntent(prompt);
      expect(intent).not.toBeNull();
      const first = planReadIntentStep(prompt);
      expect(first?.kind).toBe("tool");
      if (expectedFirstTool && first?.kind === "tool") {
        expect(first.name).toBe(expectedFirstTool);
      }
    },
  );
});

describe("ai-chat QA matrix — orchestrator UI metadata", () => {
  const chatFn = (() => {
    const fn = async () => ({ message: { content: "unused" } });
    return fn as AssistantChatFn;
  })();

  it.each(AI_CHAT_QA_MATRIX.map((c) => [c.id, c] as const))("%s end-to-end metadata", async (_id, qa) => {
    const { legacyExecutor, mcpClient } = buildMockExecutors();
    const orch = new FairPayChatOrchestrator({
      chatFn,
      legacyExecutor,
      mcpClient,
      actorUserId: "viewer-1",
    });

    const enPrompt = /^(Who|Which|FairPay|Top)/.test(qa.prompt);
    const result = await orch.processTurn(qa.prompt, baseHistory(), null, {
      language: enPrompt ? "en" : "vi",
    });

    const toolNames = result.toolTrace?.map((s) => s.name) ?? [];
    expect(toolNames).toHaveLength(qa.expectedToolCount);
    if (qa.expectedFirstTool && qa.expectedToolCount > 0) {
      expect(toolNames[0]).toBe(qa.expectedFirstTool);
    }

    let ui: UiSurface = "markdown";
    if (result.readDigest) ui = "read-digest-card";
    else if (result.assistantCapabilities) ui = "assistant-capabilities-card";
    else if (result.entitySurface) ui = entityUi(result.entitySurface);

    expect(ui).toBe(qa.expectedUi);
    expect(result.toolTrace?.every((s) => s.status === "done") ?? qa.expectedToolCount === 0).toBe(true);
  });
});
