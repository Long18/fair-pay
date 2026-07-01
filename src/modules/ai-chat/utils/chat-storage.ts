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
export function loadStore(): ChatStore | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatStore;
      if (parsed && Array.isArray(parsed.conversations)) return parsed;
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

/** Update an existing conversation in the store, or insert if missing. */
export function upsertConversation(store: ChatStore, conv: Conversation): ChatStore {
  const idx = store.conversations.findIndex((c) => c.id === conv.id);
  const next = store.conversations.slice();
  if (idx === -1) {
    next.unshift(conv);
  } else {
    next[idx] = conv;
  }
  // Keep most recent first
  next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { ...store, conversations: next };
}

/** Remove a conversation and return the updated store. */
export function removeConversation(store: ChatStore, id: string): ChatStore {
  const next = store.conversations.filter((c) => c.id !== id);
  const activeId = store.activeId === id ? (next[0]?.id ?? "") : store.activeId;
  return { activeId, conversations: next };
}
