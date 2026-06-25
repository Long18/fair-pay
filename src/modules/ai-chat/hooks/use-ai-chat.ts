// Phase 3 - React state bridge for the FairPay chat orchestrator.

import { useCallback, useEffect, useRef, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { chat as localLlmChat, loadModel, subscribeLocalLlmStatus } from "@/lib/local-llm/client";
import { DEFAULT_WEB_LLM_MODEL, type LocalLlmStatus } from "@/lib/local-llm/types";
import { supabaseClient } from "@/utility/supabaseClient";
import type { Profile } from "@/modules/profile/types";
import type { AgentPreviewResponse } from "@/lib/agent-api/types";
import type { ChatMessage } from "../types";
import {
  FAIRPAY_SYSTEM_PROMPT,
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
  loadLocalModel: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearPreview: () => void;
  clearChat: () => void;
}

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function localModelError(status: LocalLlmStatus): string | null {
  if (status.state === "unsupported") return status.reason;
  if (status.state === "loading") return "Local AI is still loading. Please wait for the model to finish loading.";
  if (status.state === "error") return status.message;
  if (status.state !== "ready") return "Load the local AI model before chatting.";
  return null;
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<AgentPreviewResponse | null>(null);
  const [localLlmStatus, setLocalLlmStatus] = useState<LocalLlmStatus>(() => ({
    state: "idle",
    model: DEFAULT_WEB_LLM_MODEL,
  }));

  const historyRef = useRef<ConversationMessage[]>([
    { role: "system", content: FAIRPAY_SYSTEM_PROMPT },
  ]);
  const conversationIdRef = useRef<string | null>(conversationId);
  const orchestratorRef = useRef<FairPayChatOrchestrator | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => subscribeLocalLlmStatus(setLocalLlmStatus), []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

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
      chatFn: localLlmChat,
      mcpClient,
      legacyExecutor,
    });

    return orchestratorRef.current;
  }, [getAccessToken]);

  const addAssistantMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id: makeMessageId("assistant"),
      conversation_id: conversationIdRef.current || "local",
      role: "assistant",
      content,
      metadata: { mode: "info", status: "success" },
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msg]);
  }, []);

  const loadLocalModel = useCallback(async () => {
    setError(null);
    const loaded = await loadModel();
    if (loaded.state === "unsupported") setError(loaded.reason);
    if (loaded.state === "error") setError(loaded.message);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !identity) return;

      const readinessError = localModelError(localLlmStatus);
      if (readinessError) {
        setError(readinessError);
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

      setMessages((prev) => [...prev, userMsg]);

      try {
        const result = await getOrchestrator().processTurn(trimmed, historyRef.current, pendingPreview);
        historyRef.current = result.updatedHistory;

        if (result.pendingPreview) setPendingPreview(result.pendingPreview);
        if (!conversationId) setConversationId(`local-${Date.now()}`);
        if (result.text) addAssistantMessage(result.text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Local AI chat failed.";
        const friendly =
          msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "Cannot reach FairPay tools. Please check your connection and try again."
            : msg;

        setError(friendly);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setIsLoading(false);
      }
    },
    [addAssistantMessage, conversationId, getOrchestrator, identity, localLlmStatus, pendingPreview],
  );

  const clearPreview = useCallback(() => {
    setPendingPreview(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingPreview(null);
    setConversationId(null);
    historyRef.current = [{ role: "system", content: FAIRPAY_SYSTEM_PROMPT }];
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    pendingPreview,
    localLlmStatus,
    loadLocalModel,
    sendMessage,
    clearPreview,
    clearChat,
  };
}
