import type { Conversation } from "./chat-storage";

export type ConversationGroupKey = "today" | "yesterday" | "previous7Days" | "older";

export interface ConversationGroup {
  key: ConversationGroupKey;
  conversations: Conversation[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupKeyFor(iso: string, now = new Date()): ConversationGroupKey {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "older";

  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 7) return "previous7Days";
  return "older";
}

const GROUP_ORDER: ConversationGroupKey[] = ["today", "yesterday", "previous7Days", "older"];

/** Group conversations by createdAt (start date); sort within bucket by recent activity. */
export function groupConversations(
  conversations: Conversation[],
  now = new Date(),
): ConversationGroup[] {
  const buckets = new Map<ConversationGroupKey, Conversation[]>();
  for (const key of GROUP_ORDER) buckets.set(key, []);

  for (const conv of conversations) {
    const key = groupKeyFor(conv.createdAt || conv.updatedAt, now);
    buckets.get(key)!.push(conv);
  }

  for (const key of GROUP_ORDER) {
    const list = buckets.get(key);
    if (list) {
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  }

  return GROUP_ORDER.map((key) => ({
    key,
    conversations: buckets.get(key) ?? [],
  })).filter((g) => g.conversations.length > 0);
}

/** Case-insensitive title/content search over conversation titles. */
export function filterConversations(
  conversations: Conversation[],
  query: string,
): Conversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });
}
