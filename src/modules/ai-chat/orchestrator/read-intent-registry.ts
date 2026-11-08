import { formatDebtSummaryResponse } from "../utils/format-debt-summary";
import { formatGroupDetailsResponse } from "../utils/format-group-details";
import { formatGroupListResponse } from "../utils/format-group-list";
import {
  formatExpenseCommentsThread,
  formatRecentExpenseComments,
} from "../utils/format-expense-comments";
import { formatRecentExpensesResponse } from "../utils/format-expenses-list";
import { formatFriendsListResponse } from "../utils/format-friends-list";
import { extractGroupNameHint } from "../utils/group-name-hint";
import { groupsFromListPayload, pickGroupId } from "../utils/pick-group";

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
  | "group_details"
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
  /(?:nhóm\s+(?:của\s+)?tôi|danh\s*sách\s+nhóm|các\s+nhóm|tôi\s+ở\s+nhóm|tham\s*gia\s+.*nhóm|nhóm\s+nào|đang\s+(?:ở|tham\s*gia)\s+.*nhóm|which\s+groups|my\s+groups|list\s+groups|what\s+groups)/i;

const GROUP_DETAILS_PATTERN =
  /(?:chi\s*tiết\s+nhóm|thông\s*tin\s+nhóm|group\s+.+\s+(?:members?|expenses?)|details?\s+(?:for\s+)?(?:the\s+)?\S.+\s+group)/i;

const FRIENDS_PATTERN =
  /(?:bạn\s+bè|bạn\s+nào|những\s+bạn|danh\s+sách\s+bạn|friend(?:s)?\s+(?:do\s+i\s+have|list)|who\s+are\s+my\s+(?:\w+\s+)*friends?|connections)/i;

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
    id: "group_details",
    priority: 55,
    matches: (text) =>
      GROUP_DETAILS_PATTERN.test(text) && extractGroupNameHint(text) !== null,
    toolName: "get_group_details",
    toolArguments: () => ({}),
    format: (data, ctx) => formatGroupDetailsResponse(data, ctx.language),
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

/** Fallback when regex misses but user clearly asks about one domain (used after hollow refusals). */
export function guessReadIntentId(text: string): ReadIntentId | null {
  const direct = matchReadIntent(text);
  if (direct) return direct.id;
  if (blocksRecentExpensesRead(text)) return null;

  const scores: Partial<Record<ReadIntentId, number>> = {};
  if (/(?:nợ|đang nợ|who\s+owes|balances?|số dư)/i.test(text)) scores.debt_summary = 3;
  if (GROUP_DETAILS_PATTERN.test(text) && extractGroupNameHint(text)) {
    scores.group_details = 3;
  } else if (/(?:nhóm|groups?)/i.test(text)) {
    scores.group_list = 2;
  }
  if (/(?:bạn bè|bạn nào|friends?|connections)/i.test(text)) scores.friends_list = 2;
  if (!blocksRecentExpensesRead(text) && RECENT_EXPENSES_PATTERN.test(text)) {
    scores.recent_expenses = 1;
  }
  if (RECENT_COMMENTS_PATTERN.test(text) && !extractExpenseIdFromText(text)) {
    scores.recent_comments = 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] < 1) return null;
  return ranked[0][0] as ReadIntentId;
}

function buildGroupPickFailure(
  pick: ReturnType<typeof pickGroupId>,
  language?: string,
): PlannerDecision {
  const vi = language?.startsWith("vi") ?? false;
  if ("ambiguous" in pick) {
    const names = pick.ambiguous.map((g) => g.name ?? g.id).join(", ");
    return {
      kind: "final",
      content: vi
        ? `Có nhiều nhóm trùng tên. Bạn chọn một: ${names}`
        : `Multiple groups match. Pick one: ${names}`,
    };
  }
  return {
    kind: "final",
    content: vi
      ? "Không tìm thấy nhóm khớp với tên bạn gửi. Thử tên chính xác hơn hoặc hỏi danh sách nhóm."
      : "No group matched that name. Try a more specific name or ask for your group list.",
  };
}

export function planCompositeReadIntent(
  intentId: "group_details",
  displayUserText: string,
  state: PlannerTurnState | undefined,
  ctx: ReadIntentPlanContext,
): PlannerDecision | null {
  if (intentId !== "group_details") return null;
  const intent = getReadIntent("group_details");
  const hint = extractGroupNameHint(displayUserText);

  if (state?.lastToolName === "get_group_details") {
    const blocked = intent.beforeFormat?.(ctx);
    if (blocked) return blocked;
    return {
      kind: "final",
      content: intent.format(state.lastToolData, ctx),
    };
  }

  if (state?.lastToolName === "fairpay_list_groups") {
    const groups = groupsFromListPayload(state.lastToolData);
    const pick = pickGroupId(groups, hint, state.selectedGroupId);
    if ("groupId" in pick) {
      return {
        kind: "tool",
        name: "get_group_details",
        arguments: { group_id: pick.groupId },
      };
    }
    return buildGroupPickFailure(pick, ctx.language);
  }

  return { kind: "tool", name: "fairpay_list_groups", arguments: {} };
}

/** After a list-groups tool, cache resolved group_id for composite read intents. */
export function plannerStatePatchAfterReadTool(
  displayUserText: string,
  toolName: string,
  toolData: unknown,
  state: PlannerTurnState,
): Partial<PlannerTurnState> {
  if (toolName !== "fairpay_list_groups") return {};
  const intent = matchReadIntent(displayUserText);
  if (intent?.id !== "group_details") return {};
  const hint = extractGroupNameHint(displayUserText);
  const pick = pickGroupId(groupsFromListPayload(toolData), hint, state.selectedGroupId);
  if ("groupId" in pick) return { selectedGroupId: pick.groupId };
  return {};
}

export function planReadIntentStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string; viewerUserId?: string; forceIntentId?: ReadIntentId },
): PlannerDecision | null {
  const intent = options?.forceIntentId
    ? getReadIntent(options.forceIntentId)
    : matchReadIntent(displayUserText);
  if (!intent) return null;

  const ctx: ReadIntentPlanContext = {
    displayUserText,
    state,
    language: options?.language,
    viewerUserId: options?.viewerUserId,
  };

  if (intent.id === "group_details") {
    return planCompositeReadIntent("group_details", displayUserText, state, ctx);
  }

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
