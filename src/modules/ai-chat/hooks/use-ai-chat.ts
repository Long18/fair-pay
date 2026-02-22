import { useState, useCallback, useRef } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { supabaseClient } from '@/utility/supabaseClient';
import type { Profile } from '@/modules/profile/types';
import type { ChatMessage, AiChatResponse, PendingAction } from '../types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

interface UseAiChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  pendingAction: PendingAction | null;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => Promise<void>;
  clearChat: () => void;
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const callFunction = useCallback(async (body: Record<string, unknown>): Promise<AiChatResponse> => {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    abortRef.current = new AbortController();
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: abortRef.current.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }, [getAccessToken]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !identity) return;
    setIsLoading(true);
    setError(null);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: text,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await callFunction({
        conversation_id: conversationId,
        message: text,
      });

      setConversationId(response.conversation_id);
      if (response.pending_action) {
        setPendingAction(response.pending_action);
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        const userMsg: ChatMessage = {
          ...tempUserMsg,
          id: `user-${Date.now()}`,
          conversation_id: response.conversation_id,
        };
        return [...withoutTemp, userMsg, response.message];
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [identity, conversationId, callFunction]);

  const confirmAction = useCallback(async (actionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await callFunction({ confirm_action_id: actionId });
      setPendingAction(null);
      if (response.message) {
        setMessages((prev) => [...prev, response.message]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [callFunction]);

  const rejectAction = useCallback(async (actionId: string) => {
    setIsLoading(true);
    try {
      await callFunction({ reject_action_id: actionId });
      setPendingAction(null);
      setMessages((prev) => [...prev, {
        id: `reject-${Date.now()}`,
        conversation_id: conversationId || '',
        role: 'assistant',
        content: 'Action cancelled.',
        metadata: { mode: 'info', status: 'success' },
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [callFunction, conversationId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingAction(null);
    setError(null);
    abortRef.current?.abort();
  }, []);

  return {
    messages, isLoading, error, conversationId, pendingAction,
    sendMessage, confirmAction, rejectAction, clearChat,
  };
}
