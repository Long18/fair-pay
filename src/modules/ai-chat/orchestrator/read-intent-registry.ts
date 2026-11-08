import { formatDebtSummaryResponse } from "../utils/format-debt-summary";
import { formatGroupListResponse } from "../utils/format-group-list";
import {
  formatExpenseCommentsThread,
  formatRecentExpenseComments,
} from "../utils/format-expense-comments";
import { formatRecentExpensesResponse } from "../utils/format-expenses-list";
import { formatFriendsListResponse } from "../utils/format-friends-list";

import type { PlannerDecision, PlannerTurnState } from "./planner-types";

export const EXPENSE_ID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export function extractExpenseIdFromText(text: string): string | null {
  const match = text.match(EXPENSE_ID_RE);
  return match ? match[0] : null;
}

export function topNFromText(text: string): number {
  const match = text.match(/\btop\s*(\d{1,2})\b/i);
  if (match) return Math.min(Number(match[1]) || 3, 20);
  if (/top\s*3|ba\s+khoản/i.test(text)) return 3;
  return 10;
}

export type ReadIntentId =
  | "debt_summary"
  | "group_list"
  | "friends_list"
  | "recent_expenses"
  | "recent_comments"
  | "expense_comments_thread";

export interface ReadIntentPlanContext {
  displayUserText: string;
  state?: PlannerTurnState;
  language?: string;
  viewerUserId?: string;
}

export interface ReadIntentDefinition {
  id: ReadIntentId;
  /** Higher priority wins when multiple intents match the same message. */
  priority: number;
  matches: (text: string) => boolean;
  toolName: string;
  toolArguments: (text: string) => Record<string, unknown>;
  format: (data: unknown, ctx: ReadIntentPlanContext) => string;
  /** Return a planner decision to short-circuit formatting (e.g. missing viewer id). */
  beforeFormat?: (ctx: ReadIntentPlanContext) => PlannerDecision | null;
}

const DEBT_PATTERN =
  /(?:nợ|đang\s+nợ|ai\s+đang\s+nợ|ai\s+nợ|bao nhiêu.*nợ|nợ.*bao nhiêu|\bdebt\b|\bbalance\b|who\s+owes|how much.*owe)/i;

const GROUP_LIST_PATTERN =
  /(?:nhóm\s+(?:của\s+)?tôi|danh\s+sách\s+nhóm|các\s+nhóm|tôi\s+ở\s+nhóm|tham\s*gia\s+.*nhóm|nhóm\s+nào|đang\s+(?:ở|tham\s*gia)\s+.*nhóm|which\s+groups|my\s+groups|list\s+groups|what\s+groups)/i;

const FRIENDS_PATTERN =
  /(?:bạn\s+bè|bạn\s+nào|những\s+bạn|danh\s+sách\s+bạn|friend(?:s)?\s+(?:do\s+i\s+have|list)|who\s+are\s+my\s+friends|connections)/i;

const RECENT_EXPENSES_PATTERN =
  /(?:top\s*\d*|khoản\s+chi|chi\s+tiêu|thu\s*chi|\bspending\b|mức\s+chi|bao\s+nhiêu.*chi|\bmy\s+expenses\b|\brecent\s+expenses\b|\blist\s+expenses\b)/i;

/** Avoid classifying preview/confirm/settle messages as "list my expenses". */
function blocksRecentExpensesRead(text: string): boolean {
  return (
    /\b(add|create|confirm|commit|preview|settle|record)\b/i.test(text) && /\bexpense/i.test(text)
  );
}

const RECENT_COMMENTS_PATTERN =
  /(?:bình\s*luận|comment).*(?:mới|gần\s*đây|recent|latest)|(?:comment\s+mới|ai\s+đã\s+bình\s*luận|recent\s+comments)/i;

const EXPENSE_COMMENT_THREAD_PATTERN = /(?:bình\s*luận|comment|thread|trả\s*lời)/i;

export const READ_INTENT_REGISTRY: readonly ReadIntentDefinition[] = [
  {
    id: "expense_comments_thread",
    priority: 100,
    matches: (text) =>
      Boolean(extractExpenseIdFromText(text)) && EXPENSE_COMMENT_THREAD_PATTERN.test(text),
    toolName: "get_expense_comments",
    toolArguments: (text) => ({ expense_id: extractExpenseIdFromText(text)! }),
    format: (data, ctx) => formatExpenseCommentsThread(data, ctx.language),
  },
  {
    id: "recent_comments",
    priority: 90,
    matches: (text) =>
      !extractExpenseIdFromText(text) && RECENT_COMMENTS_PATTERN.test(text),
    toolName: "get_recent_expense_comments",
    toolArguments: () => ({ limit: 15 }),
    format: (data, ctx) => formatRecentExpenseComments(data, ctx.language),
  },
  {
    id: "debt_summary",
    priority: 50,
    matches: (text) => DEBT_PATTERN.test(text),
    toolName: "get_debt_summary",
    toolArguments: () => ({}),
    format: (data, ctx) => formatDebtSummaryResponse(data, ctx.language),
  },
  {
    id: "group_list",
    priority: 50,
    matches: (text) => GROUP_LIST_PATTERN.test(text),
    toolName: "fairpay_list_groups",
    toolArguments: () => ({}),
    format: (data, ctx) => formatGroupListResponse(data, ctx.language),
  },
  {
    id: "friends_list",
    priority: 50,
    matches: (text) => FRIENDS_PATTERN.test(text),
    toolName: "get_friends",
    toolArguments: () => ({}),
    beforeFormat: (ctx) => {
      if (ctx.viewerUserId) return null;
      const vi = ctx.language?.startsWith("vi") ?? false;
      return {
        kind: "final",
        content: vi
          ? "Không xác định được tài khoản. Hãy đăng nhập lại."
          : "Could not resolve your account. Please sign in again.",
      };
    },
    format: (data, ctx) =>
      formatFriendsListResponse(data, ctx.viewerUserId ?? "", ctx.language),
  },
  {
    id: "recent_expenses",
    priority: 40,
    matches: (text) =>
      !blocksRecentExpensesRead(text) && RECENT_EXPENSES_PATTERN.test(text),
    toolName: "get_expenses",
    toolArguments: (text) => {
      const limit = topNFromText(text);
      return { limit: Math.max(limit, 10) };
    },
    format: (data, ctx) =>
      formatRecentExpensesResponse(data, {
        language: ctx.language,
        topN: topNFromText(ctx.displayUserText),
      }),
  },
] as const;

const ORDERED_INTENTS = [...READ_INTENT_REGISTRY].sort((a, b) => b.priority - a.priority);

export function matchReadIntent(text: string): ReadIntentDefinition | null {
  for (const intent of ORDERED_INTENTS) {
    if (intent.matches(text)) return intent;
  }
  return null;
}

export function isReadIntentMessage(text: string): boolean {
  return matchReadIntent(text) !== null;
}

export function getReadIntent(id: ReadIntentId): ReadIntentDefinition {
  const intent = READ_INTENT_REGISTRY.find((entry) => entry.id === id);
  if (!intent) throw new Error(`Unknown read intent: ${id}`);
  return intent;
}

export function planReadIntentStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string; viewerUserId?: string },
): PlannerDecision | null {
  const intent = matchReadIntent(displayUserText);
  if (!intent) return null;

  const ctx: ReadIntentPlanContext = {
    displayUserText,
    state,
    language: options?.language,
    viewerUserId: options?.viewerUserId,
  };

  if (state?.lastToolName === intent.toolName) {
    const blocked = intent.beforeFormat?.(ctx);
    if (blocked) return blocked;
    return {
      kind: "final",
      content: intent.format(state.lastToolData, ctx),
    };
  }

  return {
    kind: "tool",
    name: intent.toolName,
    arguments: intent.toolArguments(displayUserText),
  };
}
