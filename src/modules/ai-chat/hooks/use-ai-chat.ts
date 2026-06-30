// Phase 3 - React state bridge for the FairPay chat orchestrator.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  chat as localLlmChat,
  deleteSelectedModelCache,
  getSelectedModel,
  loadModel,
  selectModel,
  subscribeLocalLlmStatus,
} from "@/lib/local-llm/client";
import { type LocalLlmStatus, type WebLlmModelId } from "@/lib/local-llm/types";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";
import type { AgentPreviewResponse } from "@/lib/agent-api/types";
import type { ChatMessage } from "../types";
import {
  buildSystemPrompt,
  FairPayChatOrchestrator,
  McpClient,
  type ConversationMessage,
  type LegacyToolExecutor,
} from "../orchestrator";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";
const MCP_ENDPOINT_URL = `${SUPABASE_URL}/functions/v1/fairpay-agent-mcp`;
const LEGACY_AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

interface UseAiChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  pendingPreview: AgentPreviewResponse | null;
  localLlmStatus: LocalLlmStatus;
  selectedModel: WebLlmModelId;
  selectLocalModel: (model: WebLlmModelId) => void;
  loadLocalModel: () => Promise<void>;
  deleteLocalModelCache: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearPreview: () => void;
  clearChat: () => void;
}

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function localModelUnsupported(status: LocalLlmStatus): string | null {
  if (status.state === "unsupported") return status.reason;
  return null;
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<AgentPreviewResponse | null>(null);
  const [localLlmStatus, setLocalLlmStatus] = useState<LocalLlmStatus>(() => ({
    state: "idle",
    model: getSelectedModel(),
  }));
  const [selectedModel, setSelectedModel] = useState<WebLlmModelId>(() => getSelectedModel());

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt({
        userName: identity?.full_name,
        userEmail: identity?.email,
        language,
      }),
    [identity?.full_name, identity?.email, language],
  );

  const historyRef = useRef<ConversationMessage[]>([
    { role: "system", content: systemPrompt },
  ]);
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

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const onChunkRef = useRef<((delta: string) => void) | undefined>(undefined);
  const streamingMsgIdRef = useRef<string | null>(null);

  // Stable chat wrapper that always reads the latest onChunk from the ref.
  // This lets the orchestrator (created once) forward chunks without re-creation.
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

  const loadLocalModel = useCallback(async () => {
    setError(null);
    const loaded = await loadModel(selectedModel);
    if ("model" in loaded) setSelectedModel(loaded.model as WebLlmModelId);
    if (loaded.state === "unsupported") setError(loaded.reason);
    if (loaded.state === "error") setError(loaded.message);
  }, [selectedModel]);

  const deleteLocalModelCache = useCallback(async () => {
    setError(null);
    try {
      await deleteSelectedModelCache(selectedModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete local model cache.");
    }
  }, [selectedModel]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !identity) return;

      // Only hard-block when the browser can't run WebLLM at all.
      const unsupportedReason = localModelUnsupported(localLlmStatus);
      if (unsupportedReason) {
        setError(unsupportedReason);
        return;
      }

      setIsLoading(true);
      setError(null);

      const userMsg: ChatMessage = {
        id: makeMessageId("user"),
        conversation_id: conversationId || "local",
        role: "user",
        content: trimmed,
        metadata: { mode: "info", status: "success" },
        created_at: new Date().toISOString(),
      };

      // Add a streaming placeholder so tokens appear incrementally.
      const streamingId = makeMessageId("assistant-streaming");
      streamingMsgIdRef.current = streamingId;
      const placeholderMsg: ChatMessage = {
        id: streamingId,
        conversation_id: conversationId || "local",
        role: "assistant",
        content: "",
        metadata: { mode: "info", status: "success" },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);

      // Auto-load the model if it isn't ready yet — show user the message is queued.
      if (localLlmStatus.state !== "ready") {
        try {
          // If already loading, wait for it to settle rather than calling loadModel again.
          const settled = await new Promise<LocalLlmStatus>((resolve) => {
            // Kick off load (no-op if already loading the same model).
            void loadModel(selectedModel);
            // Subscribe and resolve when the status reaches a terminal state.
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

      // Wire onChunk to progressively update the streaming placeholder.
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

        if (result.pendingPreview) setPendingPreview(result.pendingPreview);
        if (!conversationId) setConversationId(`local-${Date.now()}`);

        // Replace streaming placeholder with the final confirmed message.
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

  const clearPreview = useCallback(() => {
    setPendingPreview(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingPreview(null);
    setConversationId(null);
    historyRef.current = [{ role: "system", content: systemPrompt }];
  }, [systemPrompt]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    pendingPreview,
    localLlmStatus,
    selectedModel,
    selectLocalModel,
    loadLocalModel,
    deleteLocalModelCache,
    sendMessage,
    clearPreview,
    clearChat,
  };
}
