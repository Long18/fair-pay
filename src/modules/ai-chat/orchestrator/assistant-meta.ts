import { buildCapabilitiesMessage } from "../utils/assistant-capabilities-copy";
import { formatReadDigest, type ReadDigestBag } from "../utils/format-read-digest";
import type { PlannerDecision, PlannerTurnState } from "./planner-types";

const CAPABILITIES_PATTERN =
  /(?:bạn có thể làm gì|bạn làm được gì|khả năng.*fairpay|trong fairpay.*(?:làm|giúp)|what can you do|what do you do|your capabilities|chức năng.*(?:có|assistant)|bạn giúp.*gì|\bhelp\b)/i;

const DIGEST_EXPLICIT_PATTERN =
  /(?:tổng\s*hợp\s*fairpay|fairpay\s+summary|xem\s+tất\s+cả|làm\s+(?:10\s+)?thứ|làm\s+đi\b|thực hiện.*(?:trên|đó|list)|do\s+(?:all|those|the\s+above))/i;

function countDigestSignals(text: string): number {
  let n = 0;
  if (/nợ|đối tác|debt|owes/i.test(text)) n += 1;
  if (/nhóm|group/i.test(text)) n += 1;
  if (/bạn bè|friends?/i.test(text)) n += 1;
  if (/giao dịch|chi tiêu|expense|chi phí/i.test(text)) n += 1;
  if (/bình luận|comment/i.test(text)) n += 1;
  return n;
}

export function looksLikeCapabilitiesQuery(text: string): boolean {
  if (looksLikeReadDigestQuery(text)) return false;
  return CAPABILITIES_PATTERN.test(text.trim());
}

export function looksLikeReadDigestQuery(text: string): boolean {
  const t = text.trim();
  if (DIGEST_EXPLICIT_PATTERN.test(t)) return true;
  if (t.length >= 70 && countDigestSignals(t) >= 4) return true;
  return false;
}

export function isAssistantMetaMessage(text: string): boolean {
  return looksLikeCapabilitiesQuery(text) || looksLikeReadDigestQuery(text);
}

const DIGEST_STEPS = [
  { key: "debt" as const, tool: "get_debt_summary", arguments: {} as Record<string, unknown> },
  { key: "groups" as const, tool: "fairpay_list_groups", arguments: {} },
  { key: "friends" as const, tool: "get_friends", arguments: {} },
  { key: "expenses" as const, tool: "get_expenses", arguments: { limit: 10 } },
  {
    key: "comments" as const,
    tool: "get_recent_expense_comments",
    arguments: { limit: 10 },
  },
] as const;

function nextMissingDigestStep(bag: ReadDigestBag): (typeof DIGEST_STEPS)[number] | null {
  for (const step of DIGEST_STEPS) {
    if (bag[step.key] === undefined) return step;
  }
  return null;
}

export function digestBagFromState(state?: PlannerTurnState): ReadDigestBag {
  return state?.digestBag ?? {};
}

export function plannerStatePatchForDigestTool(
  toolName: string,
  toolData: unknown,
  state: PlannerTurnState,
): Partial<PlannerTurnState> {
  if (!state.readDigestActive) return {};
  const step = DIGEST_STEPS.find((s) => s.tool === toolName);
  if (!step) return {};
  return {
    digestBag: { ...digestBagFromState(state), [step.key]: toolData },
  };
}

export function planAssistantMetaStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string; viewerUserId?: string },
): PlannerDecision | null {
  if (looksLikeCapabilitiesQuery(displayUserText)) {
    return { kind: "final", content: buildCapabilitiesMessage(options?.language) };
  }

  const digestActive = state?.readDigestActive || looksLikeReadDigestQuery(displayUserText);
  if (!digestActive) return null;

  const bag = digestBagFromState(state);
  const next = nextMissingDigestStep(bag);
  if (!next) {
    return {
      kind: "final",
      content: formatReadDigest(bag, {
        language: options?.language,
        viewerUserId: options?.viewerUserId,
      }),
    };
  }

  return { kind: "tool", name: next.tool, arguments: { ...next.arguments } };
}

export function initialPlannerStateForMessage(displayUserText: string): Partial<PlannerTurnState> {
  if (looksLikeReadDigestQuery(displayUserText)) {
    return { readDigestActive: true, digestBag: {} };
  }
  return {};
}
