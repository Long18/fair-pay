import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChatMessage } from "../../types";
import type { ConversationMessage } from "../../orchestrator";
import {
  clearStore,
  deriveTitle,
  loadStore,
  makeConversation,
  messagesFingerprint,
  normalizeStore,
} from "../chat-storage";

const STORE_KEY = "fairpay-ai-chat-store-v2";
const LEGACY_KEY = "fairpay-ai-chat-v1";

function installLocalStorage(): void {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}

function sampleMessage(content: string): ChatMessage {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    role: "user",
    content,
    metadata: {},
    created_at: "2026-06-25T12:00:00.000Z",
  };
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("chat-storage", () => {
  it("returns null when no store exists", () => {
    expect(loadStore()).toBeNull();
  });

  it("migrates v1 legacy blob into v2 store and removes legacy key", () => {
    const messages: ChatMessage[] = [sampleMessage("Hello from legacy")];
    const history: ConversationMessage[] = [
      { role: "user", content: "Hello from legacy" },
    ];
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ messages, history }),
    );

    const store = loadStore();

    expect(store).not.toBeNull();
    expect(store!.conversations).toHaveLength(1);
    expect(store!.activeId).toBe(store!.conversations[0].id);
    expect(store!.conversations[0].messages).toEqual(messages);
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem(STORE_KEY)).not.toBeNull();
  });

  it("derives title from first user message and fingerprints messages", () => {
    const messages = [sampleMessage("Short title")];
    const conv = makeConversation(messages, []);
    expect(deriveTitle(messages)).toBe("Short title");
    expect(conv.title).toBe("Short title");
    expect(messagesFingerprint(messages)).toMatch(/^1:msg-1:/);
  });

  it("normalizes missing createdAt on loaded v2 store", () => {
    const conv = makeConversation([sampleMessage("x")], []);
    const store = {
      activeId: conv.id,
      conversations: [
        {
          ...conv,
          createdAt: "",
        },
      ],
    };
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));

    const loaded = loadStore();
    expect(loaded!.conversations[0].createdAt).toBeTruthy();
    expect(normalizeStore(loaded!).conversations[0].updatedAt).toBeTruthy();
  });

  it("clearStore removes v2 key", () => {
    const conv = makeConversation([sampleMessage("bye")], []);
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ activeId: conv.id, conversations: [conv] }),
    );
    clearStore();
    expect(window.localStorage.getItem(STORE_KEY)).toBeNull();
  });
});
