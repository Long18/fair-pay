/**
 * Multi-conversation local storage for the FairPay AI chat.
 * Single JSON blob keyed by `fairpay-ai-chat-store-v2` holding all conversations
 * plus the active id. Migrates from the v1 single-chat blob on first load.
 */
import type { ChatMessage } from "../types";
import type { ConversationMessage } from "../orchestrator";

const STORE_KEY = "fairpay-ai-chat-store-v2";
const LEGACY_KEY = "fairpay-ai-chat-v1";
const MAX_TITLE_LEN = 48;

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  history: ConversationMessage[];
}

export interface ChatStore {
  activeId: string;
  conversations: Conversation[];
}

/** Read the store from localStorage. Runs migration from the v1 single-chat format if needed. */
function parseConvIdTimestamp(id: string): string | null {
  const match = /^conv-(\d+)-/.exec(id);
  if (!match?.[1]) return null;
  const ms = Number(match[1]);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/** Ensure createdAt exists for sidebar grouping by conversation start date. */
export function normalizeConversation(conv: Conversation): Conversation {
  const createdAt =
    conv.createdAt
    || conv.updatedAt
    || parseConvIdTimestamp(conv.id)
    || new Date().toISOString();
  return {
    ...conv,
    createdAt,
    updatedAt: conv.updatedAt || createdAt,
  };
}

export function normalizeStore(store: ChatStore): ChatStore {
  return {
    ...store,
    conversations: store.conversations.map(normalizeConversation),
  };
}

export function messagesFingerprint(messages: readonly ChatMessage[]): string {
  if (messages.length === 0) return "empty";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last.id}:${last.content.length}`;
}

export function loadStore(): ChatStore | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatStore;
      if (parsed && Array.isArray(parsed.conversations)) return normalizeStore(parsed);
    }
    // Migrate v1 → v2 if the old blob exists and v2 doesn't.
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as {
        messages?: ChatMessage[];
        history?: ConversationMessage[];
      };
      if (legacy && Array.isArray(legacy.messages) && legacy.messages.length > 0) {
        const conv = makeConversation(legacy.messages, legacy.history ?? []);
        const store: ChatStore = { activeId: conv.id, conversations: [conv] };
        saveStore(store);
        window.localStorage.removeItem(LEGACY_KEY);
        return store;
      }
      window.localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // fall through
  }
  return null;
}

export function saveStore(store: ChatStore): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors — chat won't persist this write.
  }
}

export function clearStore(): void {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}

export function makeConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a conversation object from an initial set of messages. */
export function makeConversation(
  messages: ChatMessage[],
  history: ConversationMessage[],
): Conversation {
  const now = new Date().toISOString();
  return {
    id: makeConversationId(),
    title: deriveTitle(messages),
    createdAt: now,
    updatedAt: now,
    messages,
    history,
  };
}

/** Derive a short title from the first user message, or a default placeholder. */
export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser || !firstUser.content.trim()) return "";
  const oneLine = firstUser.content.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_TITLE_LEN ? `${oneLine.slice(0, MAX_TITLE_LEN - 1)}…` : oneLine;
}

export interface UpsertConversationOptions {
  /** When false, preserve the existing updatedAt (e.g. switching chats in the sidebar). */
  touchActivity?: boolean;
}

/** Update an existing conversation in the store, or insert if missing. */
export function upsertConversation(
  store: ChatStore,
  conv: Conversation,
  options: UpsertConversationOptions = {},
): ChatStore {
  const touchActivity = options.touchActivity !== false;
  const idx = store.conversations.findIndex((c) => c.id === conv.id);
  const next = store.conversations.slice();
  const normalized = normalizeConversation(conv);

  if (idx === -1) {
    next.unshift(normalized);
  } else {
    const previous = next[idx];
    next[idx] = touchActivity
      ? normalized
      : { ...normalized, updatedAt: previous.updatedAt };
  }
  next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { ...store, conversations: next };
}

/** Remove a conversation and return the updated store. */
export function removeConversation(store: ChatStore, id: string): ChatStore {
  const next = store.conversations.filter((c) => c.id !== id);
  const activeId = store.activeId === id ? (next[0]?.id ?? "") : store.activeId;
  return { activeId, conversations: next };
}
