import type { ParsedVietnameseExpenseIntent } from "../utils/vietnamese-expense-intent";
import { formatDebtSummaryResponse } from "../utils/format-debt-summary";
import { formatGroupListResponse } from "../utils/format-group-list";
import {
  formatExpenseCommentsThread,
  formatRecentExpenseComments,
} from "../utils/format-expense-comments";
import { formatRecentExpensesResponse } from "../utils/format-expenses-list";
import { formatFriendsListResponse } from "../utils/format-friends-list";
import {
  buildMissingGroupNameMessage,
  buildPersonalOrLoanGuidance,
  effectiveTransactionScope,
  type ParsedExpenseContext,
} from "../utils/transaction-scope";

import { shouldAutoStartExpenseWorkflow } from "../utils/vietnamese-expense-intent";

export type PlannerDecision =
  | { kind: "tool"; name: string; arguments: Record<string, unknown> }
  | { kind: "final"; content: string }
  | { kind: "delegate_llm" };

export interface PlannerTurnState {
  lastToolName?: string;
  lastToolData?: unknown;
  selectedGroupId?: string;
}

interface GroupRow {
  id: string;
  name?: string;
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function groupsFromListPayload(data: unknown): GroupRow[] {
  if (typeof data !== "object" || data === null) return [];
  const groups = (data as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) return [];
  return groups.filter(
    (g): g is GroupRow =>
      typeof g === "object" && g !== null && typeof (g as GroupRow).id === "string",
  );
}

function pickGroupId(
  groups: GroupRow[],
  groupNameHint: string | null,
  selectedGroupId?: string,
): { groupId: string } | { ask: true } | { ambiguous: GroupRow[] } {
  if (selectedGroupId) return { groupId: selectedGroupId };

  if (groupNameHint) {
    const hint = normalizeName(groupNameHint);
    const matches = groups.filter((g) => normalizeName(g.name ?? "") === hint);
    if (matches.length === 1) return { groupId: matches[0].id };
    const partial = groups.filter((g) => normalizeName(g.name ?? "").includes(hint));
    if (partial.length === 1) return { groupId: partial[0].id };
    if (partial.length > 1) return { ambiguous: partial };
  }

  if (groups.length === 1) return { groupId: groups[0].id };
  if (groups.length === 0) return { ask: true };
  return { ask: true };
}

function resolvedMemberId(entry: unknown): string | null {
  if (typeof entry !== "object" || entry === null) return null;
  const status = (entry as { status?: unknown }).status;
  if (status !== "resolved") return null;
  const candidates = (entry as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (typeof first !== "object" || first === null) return null;
  const memberId = (first as { member_id?: unknown }).member_id;
  return typeof memberId === "string" ? memberId : null;
}

function buildResolveArgs(
  ctx: ParsedExpenseContext,
  groupId: string,
  actorEmail?: string,
  actorName?: string,
): Record<string, unknown> {
  const payer =
    actorEmail != null && actorEmail.length > 0
      ? { email: actorEmail }
      : actorName
        ? { display_name: actorName }
        : { display_name: "me" };

  const participants: Array<{ email?: string; display_name?: string }> = [payer];
  if (ctx.intent.member_name_hint) {
    participants.push({ display_name: ctx.intent.member_name_hint });
  }

  return {
    actor_confirmed: true,
    transaction_type: "group",
    group_id: groupId,
    payer,
    participants,
  };
}

function buildPreviewArgs(
  ctx: ParsedExpenseContext,
  resolveData: Record<string, unknown>,
): Record<string, unknown> | null {
  const group =
    typeof resolveData.group === "object" && resolveData.group !== null
      ? (resolveData.group as { id?: string })
      : undefined;
  const gid = typeof group?.id === "string" ? group.id : null;
  if (!gid) return null;

  const payerId = resolvedMemberId(resolveData.payer);
  if (!payerId) return null;

  const participantEntries = Array.isArray(resolveData.participants)
    ? resolveData.participants
    : [];
  const memberIds = participantEntries
    .map((entry) => resolvedMemberId(entry))
    .filter((id): id is string => id != null);

  if (memberIds.length === 0) return null;

  const amount = ctx.intent.amount_vnd;
  const description =
    ctx.intent.item_description
    ?? (ctx.intent.looks_like_add_expense ? "Expense" : null);
  if (amount == null || !description) return null;

  const today = new Date().toISOString().slice(0, 10);

  return {
    actor_confirmed: true,
    transaction_type: "group",
    group_id: gid,
    description,
    amount,
    currency: "VND",
    category: "Food & Drink",
    expense_date: ctx.intent.expense_date ?? today,
    payer_member_id: payerId,
    split_method: "equal",
    participants: memberIds.map((member_id) => ({ member_id })),
  };
}

export function looksLikeDebtQuery(text: string): boolean {
  // Avoid bare `no` — it matches substrings like "another". No \b for Vietnamese.
  return /(?:nợ|đang\s+nợ|ai\s+đang\s+nợ|ai\s+nợ|bao nhiêu.*nợ|nợ.*bao nhiêu|\bdebt\b|\bbalance\b|who\s+owes|how much.*owe)/i.test(
    text,
  );
}

export function looksLikeGroupListQuery(text: string): boolean {
  return /(?:nhóm\s+(?:của\s+)?tôi|danh\s+sách\s+nhóm|các\s+nhóm|tôi\s+ở\s+nhóm|tham\s*gia\s+.*nhóm|nhóm\s+nào|đang\s+(?:ở|tham\s*gia)\s+.*nhóm|which\s+groups|my\s+groups|list\s+groups|what\s+groups)/i.test(
    text,
  );
}

export function looksLikeFriendsQuery(text: string): boolean {
  return /(?:bạn\s+bè|bạn\s+nào|những\s+bạn|danh\s+sách\s+bạn|friend(?:s)?\s+(?:do\s+i\s+have|list)|who\s+are\s+my\s+friends|connections)/i.test(
    text,
  );
}

export function looksLikeRecentExpensesQuery(text: string): boolean {
  return /(?:top\s*\d*|khoản\s+chi|chi\s+tiêu|thu\s*chi|expenses?|spending|mức\s+chi|bao\s+nhiêu.*chi)/i.test(
    text,
  );
}

function topNFromText(text: string): number {
  const match = text.match(/\btop\s*(\d{1,2})\b/i);
  if (match) return Math.min(Number(match[1]) || 3, 20);
  if (/top\s*3|ba\s+khoản/i.test(text)) return 3;
  return 10;
}

const EXPENSE_ID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export function extractExpenseIdFromText(text: string): string | null {
  const match = text.match(EXPENSE_ID_RE);
  return match ? match[0] : null;
}

export function looksLikeRecentCommentsQuery(text: string): boolean {
  if (extractExpenseIdFromText(text)) return false;
  return /(?:bình\s*luận|comment).*(?:mới|gần\s*đây|recent|latest)|(?:comment\s+mới|ai\s+đã\s+bình\s*luận|recent\s+comments)/i.test(
    text,
  );
}

export function looksLikeExpenseCommentsQuery(text: string): boolean {
  const hasId = Boolean(extractExpenseIdFromText(text));
  return (
    hasId &&
    /(?:bình\s*luận|comment|thread|trả\s*lời)/i.test(text)
  );
}

export function isPlannerOnlyUserMessage(text: string): boolean {
  return (
    looksLikeDebtQuery(text) ||
    looksLikeGroupListQuery(text) ||
    looksLikeFriendsQuery(text) ||
    looksLikeRecentExpensesQuery(text) ||
    looksLikeRecentCommentsQuery(text) ||
    looksLikeExpenseCommentsQuery(text)
  );
}

export function planDebtSummaryStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string },
): PlannerDecision | null {
  if (!looksLikeDebtQuery(displayUserText)) return null;
  if (state?.lastToolName === "get_debt_summary") {
    return {
      kind: "final",
      content: formatDebtSummaryResponse(state.lastToolData, options?.language),
    };
  }
  return { kind: "tool", name: "get_debt_summary", arguments: {} };
}

export function planGroupListStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string },
): PlannerDecision | null {
  if (!looksLikeGroupListQuery(displayUserText)) return null;
  if (state?.lastToolName === "fairpay_list_groups") {
    return {
      kind: "final",
      content: formatGroupListResponse(state.lastToolData, options?.language),
    };
  }
  return { kind: "tool", name: "fairpay_list_groups", arguments: {} };
}

export function planFriendsListStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string; viewerUserId?: string },
): PlannerDecision | null {
  if (!looksLikeFriendsQuery(displayUserText)) return null;
  if (state?.lastToolName === "get_friends") {
    if (!options?.viewerUserId) {
      return {
        kind: "final",
        content:
          options?.language?.startsWith("vi") ?
            "Không xác định được tài khoản. Hãy đăng nhập lại." :
            "Could not resolve your account. Please sign in again.",
      };
    }
    return {
      kind: "final",
      content: formatFriendsListResponse(state.lastToolData, options.viewerUserId, options.language),
    };
  }
  return { kind: "tool", name: "get_friends", arguments: {} };
}

export function planRecentExpensesStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string },
): PlannerDecision | null {
  if (!looksLikeRecentExpensesQuery(displayUserText)) return null;
  const limit = topNFromText(displayUserText);
  if (state?.lastToolName === "get_expenses") {
    return {
      kind: "final",
      content: formatRecentExpensesResponse(state.lastToolData, {
        language: options?.language,
        topN: limit,
      }),
    };
  }
  return { kind: "tool", name: "get_expenses", arguments: { limit: Math.max(limit, 10) } };
}

export function planRecentExpenseCommentsStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string },
): PlannerDecision | null {
  if (!looksLikeRecentCommentsQuery(displayUserText)) return null;
  if (state?.lastToolName === "get_recent_expense_comments") {
    return {
      kind: "final",
      content: formatRecentExpenseComments(state.lastToolData, options?.language),
    };
  }
  return { kind: "tool", name: "get_recent_expense_comments", arguments: { limit: 15 } };
}

export function planExpenseCommentsThreadStep(
  displayUserText: string,
  state?: PlannerTurnState,
  options?: { language?: string },
): PlannerDecision | null {
  if (!looksLikeExpenseCommentsQuery(displayUserText)) return null;
  const expenseId = extractExpenseIdFromText(displayUserText);
  if (!expenseId) return null;
  if (state?.lastToolName === "get_expense_comments") {
    return {
      kind: "final",
      content: formatExpenseCommentsThread(state.lastToolData, options?.language),
    };
  }
  return { kind: "tool", name: "get_expense_comments", arguments: { expense_id: expenseId } };
}

export function planDeterministicStep(
  ctx: ParsedExpenseContext,
  state: PlannerTurnState,
  options: {
    language?: string;
    actorEmail?: string;
    actorName?: string;
    actorIdentityConfirmed?: boolean;
    hasPendingPreview?: boolean;
  },
): PlannerDecision | null {
  const scope = effectiveTransactionScope(ctx);

  if (scope === "personal" || scope === "loan") {
    return {
      kind: "final",
      content: buildPersonalOrLoanGuidance(scope, ctx.intent, options.language),
    };
  }

  if (options.hasPendingPreview) {
    return null;
  }

  if (!shouldAutoStartExpenseWorkflow(ctx.intent, scope)) {
    return null;
  }

  if (options.actorIdentityConfirmed === false) {
    return {
      kind: "final",
      content: options.language?.startsWith("vi")
        ? "Vui lòng đăng nhập FairPay và xác nhận tên/email trước khi tạo preview chi tiêu nhóm."
        : "Sign in to FairPay and confirm your name/email before creating a group expense preview.",
    };
  }

  const lastName = state.lastToolName;
  const lastData = state.lastToolData;

  if (lastName === "fairpay_preview_expense") {
    return {
      kind: "final",
      content: options.language?.startsWith("vi")
        ? "Preview đã sẵn sàng — hãy xác nhận trên thẻ trong chat."
        : "Preview is ready — confirm it using the card in chat.",
    };
  }

  if (lastName === "fairpay_resolve_expense_context" && typeof lastData === "object" && lastData !== null) {
    const resolve = lastData as Record<string, unknown>;
    if (resolve.status === "ready") {
      const previewArgs = buildPreviewArgs(ctx, resolve);
      if (previewArgs) {
        return { kind: "tool", name: "fairpay_preview_expense", arguments: previewArgs };
      }
      return {
        kind: "final",
        content: options.language?.startsWith("vi")
          ? "Thiếu số tiền hoặc mô tả để tạo preview. Bạn gửi lại đầy đủ (số tiền VND, mô tả, ngày nếu có)."
          : "Missing amount or description for preview. Send amount (VND), description, and optional date.",
      };
    }
    if (resolve.reason === "group_required" || resolve.status === "needs_clarification") {
      return {
        kind: "final",
        content: buildMissingGroupNameMessage(options.language),
      };
    }
    return { kind: "delegate_llm" };
  }

  if (lastName === "fairpay_list_groups") {
    const groups = groupsFromListPayload(lastData);
    const pick = pickGroupId(groups, ctx.group_name_hint, state.selectedGroupId);
    if ("ambiguous" in pick) {
      const names = pick.ambiguous.map((g) => g.name ?? g.id).join(", ");
      return {
        kind: "final",
        content: options.language?.startsWith("vi")
          ? `Có nhiều nhóm trùng tên. Bạn chọn một: ${names}`
          : `Multiple groups match. Pick one: ${names}`,
      };
    }
    if ("ask" in pick) {
      return { kind: "final", content: buildMissingGroupNameMessage(options.language) };
    }
    return {
      kind: "tool",
      name: "fairpay_resolve_expense_context",
      arguments: buildResolveArgs(ctx, pick.groupId, options.actorEmail, options.actorName),
    };
  }

  if (!lastName) {
    return { kind: "tool", name: "fairpay_list_groups", arguments: {} };
  }

  return null;
}
