import { describe, expect, it } from "vitest";

import { looksLikeCapabilitiesQuery, looksLikeReadDigestQuery } from "../assistant-meta";
import {
  guessReadIntentId,
  matchReadIntent,
  type ReadIntentId,
} from "../read-intent-registry";

const EXPENSE_THREAD_ID = "a0000000-0000-4000-8000-000000000001";

type GoldenMatchCase = { text: string; expectedId: ReadIntentId | null };

/** Product phrases + i18n quick-action prompts (`aiChat.suggestions.*` en/vi). */
const MATCH_GOLDEN: GoldenMatchCase[] = [
  // Screenshot / Vietnamese conversational
  { text: "tôi đang tham gia nhóm nào?", expectedId: "group_list" },
  { text: "tôi có những bạn nào", expectedId: "friends_list" },
  { text: "top 3 thu chi", expectedId: "recent_expenses" },
  { text: "danh sách nhóm của tôi", expectedId: "group_list" },
  { text: "danh sách bạn bè", expectedId: "friends_list" },
  { text: "nợ của tôi bao nhiêu", expectedId: "debt_summary" },
  { text: "các khoản chi tiêu gần đây", expectedId: "recent_expenses" },
  { text: "bình luận mới gần đây", expectedId: "recent_comments" },
  { text: "ai đã bình luận", expectedId: "recent_comments" },
  // vi.json aiChat.suggestions
  { text: "Ai đang nợ tôi?", expectedId: "debt_summary" },
  { text: "Tôi đang tham gia nhóm nào?", expectedId: "group_list" },
  { text: "Tôi có những bạn nào?", expectedId: "friends_list" },
  { text: "Top 5 khoản chi theo số tiền", expectedId: "recent_expenses" },
  // en.json aiChat.suggestions
  { text: "Who owes me money?", expectedId: "debt_summary" },
  { text: "Which groups am I in?", expectedId: "group_list" },
  { text: "Who are my FairPay friends?", expectedId: "friends_list" },
  { text: "Top 5 expenses by amount", expectedId: "recent_expenses" },
  // English variants
  { text: "my groups", expectedId: "group_list" },
  { text: "what groups do I belong to", expectedId: "group_list" },
  { text: "chi tiết nhóm Du lịch", expectedId: "group_details" },
  { text: "group Travel members and expenses", expectedId: "group_details" },
  { text: "details for the Travel group", expectedId: "group_details" },
  { text: "connections list", expectedId: "friends_list" },
  { text: "how much do I owe?", expectedId: "debt_summary" },
  { text: "list my expenses", expectedId: "recent_expenses" },
  { text: "recent comments on expenses", expectedId: "recent_comments" },
  // Expense comment thread (UUID beats feed)
  {
    text: `bình luận expense ${EXPENSE_THREAD_ID}`,
    expectedId: "expense_comments_thread",
  },
  {
    text: `comment thread for expense ${EXPENSE_THREAD_ID}`,
    expectedId: "expense_comments_thread",
  },
  {
    text: `show comments on ${EXPENSE_THREAD_ID}`,
    expectedId: "expense_comments_thread",
  },
  // Write / confirm — must not classify as read intents
  { text: "Add expense", expectedId: null },
  { text: "confirm the expense", expectedId: null },
  { text: "Please confirm the expense", expectedId: null },
  { text: "create expense preview", expectedId: null },
  { text: "record expense 500k", expectedId: null },
  { text: "Prepare dinner expense for 4 people", expectedId: null },
];

const GUESS_GOLDEN: { text: string; expectedId: ReadIntentId | null }[] = [
  { text: "tình hình balance của tôi", expectedId: "debt_summary" },
  { text: "nhóm công ty", expectedId: "group_list" },
  { text: "fairpay friends", expectedId: "friends_list" },
  { text: "spending overview", expectedId: "recent_expenses" },
  { text: "Add expense", expectedId: null },
];

describe("read-intent golden phrases", () => {
  it.each(MATCH_GOLDEN.map((c) => [c.text, c.expectedId] as const))(
    "matchReadIntent(%j) -> %s",
    (text, expectedId) => {
      const intent = matchReadIntent(text);
      if (expectedId === null) {
        expect(intent).toBeNull();
      } else {
        expect(intent?.id).toBe(expectedId);
      }
    },
  );
});

describe("assistant meta golden phrases", () => {
  it.each([
    "bạn có thể làm gì",
    "những khả năng bạn có thể làm trong fairpay nè",
    "làm 10 thứ ở trên đi",
    "Tổng hợp FairPay",
    "FairPay summary",
    "what can you do",
  ])("classifies meta intent for %s", (text) => {
    const caps = looksLikeCapabilitiesQuery(text);
    const digest = looksLikeReadDigestQuery(text);
    expect(caps || digest).toBe(true);
    expect(matchReadIntent(text)).toBeNull();
  });
});

describe("guessReadIntentId golden phrases", () => {
  it.each(GUESS_GOLDEN.map((c) => [c.text, c.expectedId] as const))(
    "guessReadIntentId(%j) -> %s",
    (text, expectedId) => {
      expect(guessReadIntentId(text)).toBe(expectedId);
    },
  );
});
