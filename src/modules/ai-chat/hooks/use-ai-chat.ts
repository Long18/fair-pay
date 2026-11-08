// Phase 3 - React state bridge for the FairPay chat orchestrator.

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createCloudOrchestratorChatFn } from "../orchestrator/cloud-orchestrator-client";
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
  messagesFingerprint,
} from "../utils/chat-storage";
import { recognizeReceiptText } from "../utils/receipt-ocr-client";
import {
  buildReceiptDraftPrompt,
  extractReceiptDraft,
} from "../utils/receipt-ocr-stub";
import {
  parseExpenseContext,
  effectiveTransactionScope,
} from "../utils/transaction-scope";
import {
  appendExpenseIntentToUserMessage,
} from "../utils/vietnamese-expense-intent";
import { isPlannerOnlyUserMessage } from "../orchestrator/deterministic-planner";
import { resolveResponseLanguage } from "../utils/detect-user-message-language";
import { waitForLocalModelReady } from "../utils/wait-for-local-model";
import type { AssistantToolTraceStep } from "../orchestrator/tool-trace";

const ORCHESTRATOR_TURN_TIMEOUT_MS = 120_000;

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

/** Map worker / client English errors to localized copy when we have a known key. */
function localizeAiChatError(
  message: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const known: Record<string, string> = {
    "Local AI requires a browser with Web Worker support.":
      "aiChat.errors.noWebWorker",
    "Local AI requires a browser with WebGPU support.":
      "aiChat.errors.noWebGpu",
    "Your WebGPU device cannot run local AI models. Try a smaller model in the picker or use another browser with WebGPU.":
      "aiChat.errors.webGpuLimits",
    "Local AI model is not ready. Load the model before chatting.":
      "aiChat.errors.modelNotReady",
    "Local AI worker failed.": "aiChat.errors.workerFailed",
    "Failed to load local AI model.": "aiChat.errors.loadFailed",
    "Local AI chat failed.": "aiChat.errors.chatFailed",
    "Cannot reach FairPay tools. Please check your connection and try again.":
      "aiChat.errors.network",
    MODEL_LOAD_TIMEOUT: "aiChat.errors.modelLoadTimeout",
    ORCHESTRATOR_TIMEOUT: "aiChat.errors.orchestratorTimeout",
    LOCAL_LLM_CHAT_TIMEOUT: "aiChat.errors.chatTimeout",
  };
  const key = known[message];
  return key ? t(key) : message;
}

function freshConvId(): string {
  return makeConversationId();
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n, t } = useTranslation();
  const uiLanguage = i18n.resolvedLanguage || i18n.language;
  const [selectedModel, setSelectedModel] = useState<WebLlmModelId>(() => getSelectedModel());

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt({
        userName: identity?.full_name,
        userEmail: identity?.email,
        language: uiLanguage,
        tier: resolveSystemPromptTier(selectedModel),
      }),
    [identity?.full_name, identity?.email, uiLanguage, selectedModel],
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
  const messagesFingerprintRef = useRef<string | null>(null);
  if (messagesFingerprintRef.current === null) {
    messagesFingerprintRef.current = messagesFingerprint(messages);
  }
  const conversationIdRef = useRef<string | null>(conversationId);
  const orchestratorRef = useRef<FairPayChatOrchestrator | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    orchestratorRef.current = null;
  }, [identity?.email, identity?.full_name]);

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

  useEffect(
    () =>
      subscribeLocalLlmStatus((next) => {
        startTransition(() => setLocalLlmStatus(next));
      }),
    [],
  );

  // Auto-load the selected model on mount if it's already cached on this device
  useEffect(() => {
    const s = getLocalLlmStatus();
    if (s.state !== "idle") return;

    const warmup = () => {
      void checkModelCached(s.model).then((cached) => {
        if (cached) void loadModel(s.model);
      });
    };

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(warmup, { timeout: 4_000 });
      return () => cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmup, 150);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // ── Persist store whenever messages or store changes ───────────────────────
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    const fingerprint = messagesFingerprint(messages);
    const touchActivity = fingerprint !== messagesFingerprintRef.current;
    messagesFingerprintRef.current = fingerprint;

    const existing = storeRef.current.conversations.find((c) => c.id === conversationId);
    const conv: Conversation = {
      id: conversationId,
      title: deriveTitle(messages),
      createdAt: existing?.createdAt ?? activeConversation?.createdAt ?? new Date().toISOString(),
      updatedAt: touchActivity
        ? new Date().toISOString()
        : (existing?.updatedAt ?? new Date().toISOString()),
      messages,
      history: historyRef.current,
    };
    const nextStore = upsertConversation(
      { ...storeRef.current, activeId: conversationId },
      conv,
      { touchActivity },
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
  const liveToolTraceRef = useRef<AssistantToolTraceStep[]>([]);

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
      cloudChatFn: createCloudOrchestratorChatFn(getAccessToken),
      mcpClient,
      legacyExecutor,
      actorIdentityConfirmed: Boolean(identity?.email?.trim() || identity?.full_name?.trim()),
      actorEmail: identity?.email ?? undefined,
      actorName: identity?.full_name ?? undefined,
      actorUserId: identity?.id,
    });

    return orchestratorRef.current;
  }, [getAccessToken, identity?.email, identity?.full_name, identity?.id]);

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
    messagesFingerprintRef.current = messagesFingerprint(conv.messages);
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
        setError(localizeAiChatError(unsupportedReason, t));
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
      liveToolTraceRef.current = [];
      const placeholderMsg: ChatMessage = {
        id: streamingId,
        conversation_id: activeId,
        role: "assistant",
        content: "",
        metadata: { mode: "info", status: "success" },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);

      const turnLanguage = resolveResponseLanguage(trimmed, uiLanguage);
      const turnSystemPrompt = buildSystemPrompt({
        userName: identity?.full_name,
        userEmail: identity?.email,
        language: turnLanguage,
        tier: resolveSystemPromptTier(selectedModel),
      });
      if (historyRef.current[0]?.role === "system") {
        historyRef.current[0] = { role: "system", content: turnSystemPrompt };
      }

      const plannerOnly = isPlannerOnlyUserMessage(trimmed);
      const modelReady = getLocalLlmStatus().state === "ready";

      if (!plannerOnly && !modelReady) {
        try {
          const settled = await waitForLocalModelReady(selectedModel);

          if (settled.state === "unsupported") {
            setError(localizeAiChatError(settled.reason, t));
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
            return;
          }
          if (settled.state === "error") {
            const msg =
              settled.message === "MODEL_LOAD_TIMEOUT"
                ? "MODEL_LOAD_TIMEOUT"
                : settled.message;
            setError(localizeAiChatError(msg, t));
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
            return;
          }
        } catch (err) {
          const raw =
            err instanceof Error ? err.message : "Failed to load local AI model.";
          setError(localizeAiChatError(raw, t));
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
          return;
        }
      } else if (plannerOnly && !modelReady) {
        void loadModel(selectedModel);
      }

      onChunkRef.current = (delta: string) => {
        const streamId = streamingMsgIdRef.current;
        if (!streamId || !delta) return;
        startTransition(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content: m.content + delta } : m)),
          );
        });
      };

      try {
        const expenseContext = parseExpenseContext(trimmed);
        const scope = effectiveTransactionScope(expenseContext);
        const orchestratorUserText = appendExpenseIntentToUserMessage(
          trimmed,
          expenseContext.intent,
          scope,
        );
        const turnPromise = getOrchestrator().processTurn(
          orchestratorUserText,
          historyRef.current,
          pendingPreview,
          {
            displayUserText: trimmed,
            expenseIntent: expenseContext.intent,
            expenseContext,
            transactionScope: scope,
            language: turnLanguage,
            onToolRound: (toolName, phase) => {
              const streamId = streamingMsgIdRef.current;
              if (!streamId) return;
              let next = [...liveToolTraceRef.current];
              if (phase === "start") {
                next = next.filter((s) => !(s.name === toolName && s.status === "running"));
                next.push({ name: toolName, status: "running" });
              } else {
                const status = phase === "done" ? "done" : "error";
                let patched = false;
                for (let i = next.length - 1; i >= 0; i -= 1) {
                  if (next[i].name === toolName && next[i].status === "running") {
                    next[i] = { name: toolName, status };
                    patched = true;
                    break;
                  }
                }
                if (!patched) next.push({ name: toolName, status });
              }
              liveToolTraceRef.current = next;
              startTransition(() => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId
                      ? {
                          ...m,
                          metadata: {
                            ...m.metadata,
                            tool_trace: next,
                            response_language: turnLanguage,
                          },
                        }
                      : m,
                  ),
                );
              });
            },
          },
        );
        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("ORCHESTRATOR_TIMEOUT")), ORCHESTRATOR_TURN_TIMEOUT_MS);
        });
        const result = await Promise.race([turnPromise, timeoutPromise]);
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

        const replyText =
          result.text?.trim() ||
          (plannerOnly
            ? t("aiChat.errors.emptyReply", { lng: turnLanguage })
            : t("aiChat.errors.emptyReplyRetry", { lng: turnLanguage }));
        const toolTrace =
          result.toolTrace?.length ? result.toolTrace : liveToolTraceRef.current.length
            ? liveToolTraceRef.current
            : undefined;
        const structuredUi = Boolean(
          result.readDigest || result.entitySurface || result.assistantCapabilities,
        );
        const finalMsg: ChatMessage = {
          id: makeMessageId("assistant"),
          conversation_id: conversationIdRef.current || "local",
          role: "assistant",
          content: replyText,
          metadata: {
            mode: "info",
            status: "success",
            ...(structuredUi || toolTrace?.length
              ? { response_language: turnLanguage }
              : {}),
            ...(result.readDigest
              ? {
                  read_digest: result.readDigest,
                  viewer_user_id: identity?.id,
                }
              : {}),
            ...(result.entitySurface ? { entity_surface: result.entitySurface } : {}),
            ...(result.assistantCapabilities ? { assistant_capabilities: true } : {}),
            ...(toolTrace?.length ? { tool_trace: [...toolTrace] } : {}),
          },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev.filter((m) => m.id !== streamingId), finalMsg]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Local AI chat failed.";
        const friendly =
          msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "Cannot reach FairPay tools. Please check your connection and try again."
            : msg;

        setError(localizeAiChatError(friendly, t));
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
      } finally {
        onChunkRef.current = undefined;
        streamingMsgIdRef.current = null;
        liveToolTraceRef.current = [];
        setIsLoading(false);
      }
    },
    [
      conversationId,
      getOrchestrator,
      identity?.email,
      identity?.full_name,
      localLlmStatus,
      pendingPreview,
      selectedModel,
      t,
      uiLanguage,
    ],
  );

  const attachReceiptImage = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      try {
        const ocrText = await recognizeReceiptText(file);
        const draft = extractReceiptDraft(file.name, { ocrText });
        const prompt = buildReceiptDraftPrompt(draft);
        setIsLoading(false);
        await sendMessage(prompt);
      } catch {
        setIsLoading(false);
        setError(
          t("aiChat.errors.receiptOcrFailed", {
            defaultValue: "Could not read the receipt image. Try a clearer photo or type the amount.",
          }),
        );
      }
    },
    [sendMessage, t],
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
