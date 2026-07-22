// Phase 3 - React state bridge for the FairPay chat orchestrator.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  chat as localLlmChat,
  checkModelCached,
  getLocalLlmStatus,
  getSelectedModel,
  loadModel,
  selectModel,
  subscribeLocalLlmStatus,
} from "@/lib/local-llm/client";
import { type LocalLlmStatus, type WebLlmModelId } from "@/lib/local-llm/types";
import { supabaseClient } from "@/utility/supabaseClient";
import { journeyTracking } from "@/lib/journey-tracking";
import type { Profile } from "@/modules/profile/types";
import type { AgentPreviewResponse } from "@/lib/agent-api/types";
import type { ChatMessage } from "../types";
import {
  buildSystemPrompt,
  FairPayChatOrchestrator,
  McpClient,
  resolveSystemPromptTier,
  type ConversationMessage,
  type LegacyToolExecutor,
} from "../orchestrator";
import {
  type Conversation,
  type ChatStore,
  clearStore,
  deriveTitle,
  loadStore,
  makeConversationId,
  removeConversation,
  saveStore,
  upsertConversation,
} from "../utils/chat-storage";
import {
  buildReceiptDraftPrompt,
  extractReceiptDraftFromFilename,
} from "../utils/receipt-ocr-stub";

export type { Conversation } from "../utils/chat-storage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";
const MCP_ENDPOINT_URL = `${SUPABASE_URL}/functions/v1/fairpay-agent-mcp`;
const LEGACY_AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseAiChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  conversations: Conversation[];
  pendingPreview: AgentPreviewResponse | null;
  localLlmStatus: LocalLlmStatus;
  selectedModel: WebLlmModelId;
  selectLocalModel: (model: WebLlmModelId) => void;
  sendMessage: (text: string) => Promise<void>;
  /** Attach receipt image → filename OCR stub → chat prompt → preview card flow. */
  attachReceiptImage: (file: File) => Promise<void>;
  clearPreview: () => void;
  confirmPreview: (result?: { expense_id: string; operation_id: string }) => void;
  clearChat: () => void;
  newChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function localModelUnsupported(status: LocalLlmStatus): string | null {
  if (status.state === "unsupported") return status.reason;
  return null;
}

function freshConvId(): string {
  return makeConversationId();
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [selectedModel, setSelectedModel] = useState<WebLlmModelId>(() => getSelectedModel());

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt({
        userName: identity?.full_name,
        userEmail: identity?.email,
        language,
        tier: resolveSystemPromptTier(selectedModel),
      }),
    [identity?.full_name, identity?.email, language, selectedModel],
  );

  // ── Store bootstrap ───────────────────────────────────────────────────────
  const [store, setStore] = useState<ChatStore>(() => {
    const persisted = loadStore();
    if (persisted && persisted.conversations.length > 0) {
      return persisted;
    }
    // Start with an empty store — no active conversation yet.
    return { activeId: "", conversations: [] };
  });

  const activeConversation = useMemo(
    () => store.conversations.find((c) => c.id === store.activeId) ?? null,
    [store],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => activeConversation?.messages ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    () => activeConversation?.id ?? null,
  );
  const [pendingPreview, setPendingPreview] = useState<AgentPreviewResponse | null>(null);
  const [localLlmStatus, setLocalLlmStatus] = useState<LocalLlmStatus>(() => ({
    state: "idle",
    model: getSelectedModel(),
  }));

  const historyRef = useRef<ConversationMessage[]>(
    activeConversation?.history ?? [{ role: "system", content: systemPrompt }],
  );
  const conversationIdRef = useRef<string | null>(conversationId);
  const orchestratorRef = useRef<FairPayChatOrchestrator | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Keep the system message in sync with the latest identity and language.
  useEffect(() => {
    const history = historyRef.current;
    const systemMessage: ConversationMessage = { role: "system", content: systemPrompt };
    if (history.length > 0 && history[0].role === "system") {
      historyRef.current = [systemMessage, ...history.slice(1)];
    } else {
      historyRef.current = [systemMessage, ...history];
    }
  }, [systemPrompt]);

  useEffect(() => subscribeLocalLlmStatus(setLocalLlmStatus), []);

  // Auto-load the selected model on mount if it's already cached on this device
  useEffect(() => {
    const s = getLocalLlmStatus();
    if (s.state !== "idle") return;
    void checkModelCached(s.model).then((cached) => {
      if (cached) void loadModel(s.model);
    });
  }, []);

  // ── Persist store whenever messages or store changes ───────────────────────
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    const conv: Conversation = {
      id: conversationId,
      title: deriveTitle(messages),
      createdAt: activeConversation?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages,
      history: historyRef.current,
    };
    const nextStore = upsertConversation(
      { ...storeRef.current, activeId: conversationId },
      conv,
    );
    setStore(nextStore);
    saveStore(nextStore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conversationId]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const onChunkRef = useRef<((delta: string) => void) | undefined>(undefined);
  const streamingMsgIdRef = useRef<string | null>(null);

  const chatFnWithStreaming = useCallback<typeof localLlmChat>(
    (messages, options) => localLlmChat(messages, { ...options, onChunk: onChunkRef.current }),
    [],
  );

  const getOrchestrator = useCallback(() => {
    if (orchestratorRef.current) return orchestratorRef.current;

    const mcpClient = new McpClient({
      endpointUrl: MCP_ENDPOINT_URL,
      getToken: getAccessToken,
      anonKey: SUPABASE_ANON_KEY,
    });

    const legacyExecutor: LegacyToolExecutor = async (toolName, toolArgs) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(LEGACY_AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: "execute_tool",
          tool_name: toolName,
          tool_args: toolArgs,
        }),
      });

      const json = await response.json().catch(() => ({ error: "Request failed" }));
      if (!response.ok) {
        if (response.status === 404) throw new Error("AI Chat service is not deployed yet.");
        throw new Error(json.error ?? "AI Chat tool request failed.");
      }

      return json.result ?? json;
    };

    orchestratorRef.current = new FairPayChatOrchestrator({
      chatFn: chatFnWithStreaming,
      mcpClient,
      legacyExecutor,
    });

    return orchestratorRef.current;
  }, [getAccessToken]);

  const selectLocalModel = useCallback((model: WebLlmModelId) => {
    setError(null);
    setSelectedModel(model);
    const next = selectModel(model);
    setLocalLlmStatus(next);
  }, []);

  // ── New chat ──────────────────────────────────────────────────────────────
  const newChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingPreview(null);
    const newId = freshConvId();
    setConversationId(newId);
    historyRef.current = [{ role: "system", content: systemPrompt }];
    setStore((prev) => {
      const next = { ...prev, activeId: newId };
      saveStore(next);
      return next;
    });
  }, [systemPrompt]);

  // ── Select existing conversation ─────────────────────────────────────────
  const selectConversation = useCallback((id: string) => {
    const conv = storeRef.current.conversations.find((c) => c.id === id);
    if (!conv) return;
    setMessages(conv.messages);
    setConversationId(conv.id);
    setError(null);
    setPendingPreview(null);
    historyRef.current = conv.history.length > 0
      ? conv.history
      : [{ role: "system", content: systemPrompt }];
    setStore((prev) => {
      const next = { ...prev, activeId: id };
      saveStore(next);
      return next;
    });
  }, [systemPrompt]);

  // ── Delete conversation ──────────────────────────────────────────────────
  const deleteConversation = useCallback((id: string) => {
    const prev = storeRef.current;
    const next = removeConversation(prev, id);
    saveStore(next);
    setStore(next);

    if (prev.activeId === id) {
      const nextConv = next.conversations[0];
      if (nextConv) {
        setMessages(nextConv.messages);
        setConversationId(nextConv.id);
        historyRef.current = nextConv.history.length > 0
          ? nextConv.history
          : [{ role: "system", content: systemPrompt }];
      } else {
        setMessages([]);
        setConversationId(null);
        historyRef.current = [{ role: "system", content: systemPrompt }];
      }
      setError(null);
    }
  }, [systemPrompt]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !identity) return;

      const unsupportedReason = localModelUnsupported(localLlmStatus);
      if (unsupportedReason) {
        setError(unsupportedReason);
        return;
      }

      setIsLoading(true);
      setError(null);

      journeyTracking.trackEvent({
        event_name: "ai_chat_message_sent",
        event_category: "ai_chat",
        page_path: window.location.pathname,
        flow_name: "ai-chat",
        step_name: "message",
        properties: { message_length: trimmed.length },
      });

      // Ensure there's an active conversation id.
      const activeId = conversationIdRef.current ?? freshConvId();
      if (!conversationIdRef.current) {
        setConversationId(activeId);
      }

      const userMsg: ChatMessage = {
        id: makeMessageId("user"),
        conversation_id: activeId,
        role: "user",
        content: trimmed,
        metadata: { mode: "info", status: "success" },
        created_at: new Date().toISOString(),
      };

      const streamingId = makeMessageId("assistant-streaming");
      streamingMsgIdRef.current = streamingId;
      const placeholderMsg: ChatMessage = {
        id: streamingId,
        conversation_id: activeId,
        role: "assistant",
        content: "",
        metadata: { mode: "info", status: "success" },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);

      if (localLlmStatus.state !== "ready") {
        try {
          const settled = await new Promise<LocalLlmStatus>((resolve) => {
            void loadModel(selectedModel);
            const unsub = subscribeLocalLlmStatus((s) => {
              if (s.state === "ready" || s.state === "unsupported" || s.state === "error") {
                unsub();
                resolve(s);
              }
            });
          });

          if (settled.state === "unsupported") {
            setError(settled.reason);
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
            setIsLoading(false);
            return;
          }
          if (settled.state === "error") {
            setError(settled.message);
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
            setIsLoading(false);
            return;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to load local AI model.";
          setError(msg);
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
          setIsLoading(false);
          return;
        }
      }

      onChunkRef.current = (delta: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingMsgIdRef.current ? { ...m, content: m.content + delta } : m,
          ),
        );
      };

      try {
        const result = await getOrchestrator().processTurn(trimmed, historyRef.current, pendingPreview);
        historyRef.current = result.updatedHistory;

        if (result.pendingPreview) {
          setPendingPreview(result.pendingPreview);
          journeyTracking.trackEvent({
            event_name: "ai_chat_tool_preview_shown",
            event_category: "ai_chat",
            page_path: window.location.pathname,
            flow_name: "ai-chat",
            step_name: "preview",
            properties: {
              preview_type: result.pendingPreview.operation_id ?? "unknown",
            },
          });
        }

        const finalMsg: ChatMessage = {
          id: makeMessageId("assistant"),
          conversation_id: conversationIdRef.current || "local",
          role: "assistant",
          content: result.text,
          metadata: { mode: "info", status: "success" },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== streamingId),
          ...(result.text ? [finalMsg] : []),
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Local AI chat failed.";
        const friendly =
          msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "Cannot reach FairPay tools. Please check your connection and try again."
            : msg;

        setError(friendly);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
      } finally {
        onChunkRef.current = undefined;
        streamingMsgIdRef.current = null;
        setIsLoading(false);
      }
    },
    [conversationId, getOrchestrator, identity, localLlmStatus, pendingPreview, selectedModel],
  );

  const attachReceiptImage = useCallback(
    async (file: File) => {
      const draft = extractReceiptDraftFromFilename(file.name);
      const prompt = buildReceiptDraftPrompt(draft);
      await sendMessage(prompt);
    },
    [sendMessage],
  );

  const dismissPreview = useCallback(() => {
    if (pendingPreview) {
      journeyTracking.trackEvent({
        event_name: "ai_chat_preview_dismissed",
        event_category: "ai_chat",
        page_path: window.location.pathname,
        flow_name: "ai-chat",
        step_name: "preview-dismiss",
        properties: {
          preview_type: pendingPreview.operation_id ?? "unknown",
        },
      });
    }
    setPendingPreview(null);
  }, [pendingPreview]);

  const confirmPreview = useCallback(
    (result?: { expense_id: string; operation_id: string }) => {
      const preview = pendingPreview;

      if (preview) {
        journeyTracking.trackEvent({
          event_name: "ai_chat_preview_confirmed",
          event_category: "ai_chat",
          page_path: window.location.pathname,
          flow_name: "ai-chat",
          step_name: "preview-confirm",
          properties: {
            preview_type: preview.operation_id ?? "unknown",
          },
        });
      }

      if (result && preview) {
        const p = preview.preview;
        const amountLabel = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(p.amount);
        const content = t("aiChat.expenseCreated", {
          description: p.description,
          amount: amountLabel,
          groupName: p.group_name,
          defaultValue:
            "Done — I created **{{description}}** ({{amount}}) in **{{groupName}}**.",
        });

        const confirmMsg: ChatMessage = {
          id: makeMessageId("assistant"),
          conversation_id: conversationIdRef.current || "local",
          role: "assistant",
          content,
          metadata: {
            mode: "action",
            status: "success",
            entity_type: "expense",
            entity_id: result.expense_id,
          },
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, confirmMsg]);
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content },
        ];
      }

      setPendingPreview(null);
    },
    [pendingPreview, t],
  );

  const clearPreview = dismissPreview;

  // clearChat deletes the current conversation and starts fresh.
  const clearChat = useCallback(() => {
    if (conversationId) {
      setStore((prev) => {
        const next = removeConversation(prev, conversationId);
        const nextId = freshConvId();
        const withNew = { ...next, activeId: nextId };
        saveStore(withNew);
        return withNew;
      });
    } else {
      clearStore();
    }
    setMessages([]);
    setError(null);
    setPendingPreview(null);
    setConversationId(null);
    historyRef.current = [{ role: "system", content: systemPrompt }];
  }, [conversationId, systemPrompt]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    conversations: store.conversations,
    pendingPreview,
    localLlmStatus,
    selectedModel,
    selectLocalModel,
    sendMessage,
    attachReceiptImage,
    clearPreview,
    confirmPreview,
    clearChat,
    newChat,
    selectConversation,
    deleteConversation,
  };
}
