import { useState, useCallback, useRef, useMemo } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { supabaseClient } from '@/utility/supabaseClient';
import type { Profile } from '@/modules/profile/types';
import type { ChatMessage, PendingAction, ToolExecuteResponse } from '../types';
import { PUTER_TOOL_DEFINITIONS } from '../types';

/** Puter.js global from CDN script tag */
declare const puter: {
  ai: {
    chat: (
      input: string | Array<Record<string, unknown>>,
      options?: Record<string, unknown>,
    ) => Promise<{ message: { role: string; content: string | null; tool_calls?: ToolCall[] }; text?: string }>;
  };
};

interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SYSTEM_PROMPT = `You are FairPay Assistant, a helpful AI for managing shared expenses.
You help users check balances, view groups, add expenses, and record payments.
Be concise and friendly. Use the available tools to fetch data or perform actions.
When a tool requires confirmation, tell the user what will happen and wait for their approval.
Always respond in the same language the user writes in.`;

const CONFIRMATION_TOOLS = new Set(['create_group', 'add_expense', 'record_payment']);

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
  const conversationRef = useRef<Array<Record<string, unknown>>>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return token;
  }, []);

  /** Call the edge function tool executor */
  const callToolExecutor = useCallback(async (body: Record<string, unknown>): Promise<ToolExecuteResponse> => {
    const token = await getAccessToken();
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('AI Chat service is not deployed yet.');
      }
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<ToolExecuteResponse>;
  }, [getAccessToken]);

  const makeId = useCallback(() => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, []);

  const addAssistantMessage = useCallback((content: string, metadata: ChatMessage['metadata'] = {}) => {
    const msg: ChatMessage = {
      id: makeId(),
      conversation_id: conversationId || 'local',
      role: 'assistant',
      content,
      metadata: { mode: 'info', status: 'success', ...metadata },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, [conversationId, makeId]);

  const tools = useMemo(() => PUTER_TOOL_DEFINITIONS, []);

  /** Process tool calls from Puter AI — execute via edge function, loop back results */
  const processToolCalls = useCallback(async (
    toolCalls: ToolCall[],
  ): Promise<string> => {
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      const toolArgs = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;

      // If tool needs confirmation, send to edge function which creates a pending action
      if (CONFIRMATION_TOOLS.has(toolName)) {
        const resp = await callToolExecutor({
          action: 'execute_tool',
          tool_name: toolName,
          tool_args: toolArgs,
          conversation_id: conversationId,
        });
        if (resp.status === 'needs_confirmation' && resp.pending_action) {
          setPendingAction(resp.pending_action);
          conversationRef.current.push(
            { role: 'assistant', content: null, tool_calls: [tc] },
            { role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ status: 'needs_confirmation', message: 'Waiting for user confirmation' }) },
          );
          return `I'd like to **${toolName.replace(/_/g, ' ')}** with these details:\n${Object.entries(toolArgs).map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')}\n\nPlease confirm or cancel below.`;
        }
      }

      // Read-only tool or no confirmation needed — execute directly
      const resp = await callToolExecutor({
        action: 'execute_tool',
        tool_name: toolName,
        tool_args: toolArgs,
        conversation_id: conversationId,
      });

      // Add the tool call + result to conversation history for AI context
      conversationRef.current.push(
        { role: 'assistant', content: null, tool_calls: [tc] },
        { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(resp.result ?? resp.error ?? 'No data') },
      );

      // Ask Puter AI to interpret the tool result
      const followUp = await puter.ai.chat(
        conversationRef.current,
        { tools, model: 'gpt-4o-mini' },
      );

      // If AI wants more tool calls, recurse
      if (followUp.message?.tool_calls?.length) {
        return processToolCalls(followUp.message.tool_calls);
      }

      const content = followUp.message?.content || followUp.text || '';
      conversationRef.current.push({ role: 'assistant', content });
      return content;
    }
    return '';
  }, [callToolExecutor, conversationId, tools]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !identity) return;
    setIsLoading(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: makeId(),
      conversation_id: conversationId || 'local',
      role: 'user',
      content: text,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    conversationRef.current.push({ role: 'user', content: text });

    try {
      if (typeof puter === 'undefined') {
        throw new Error('AI service is loading. Please try again in a moment.');
      }

      const completion = await puter.ai.chat(
        conversationRef.current,
        { tools, model: 'gpt-4o-mini' },
      );

      let responseText: string;

      if (completion.message?.tool_calls?.length) {
        responseText = await processToolCalls(completion.message.tool_calls);
      } else {
        responseText = completion.message?.content || completion.text || 'I could not generate a response.';
        conversationRef.current.push({ role: 'assistant', content: responseText });
      }

      if (!conversationId) {
        setConversationId(`local-${Date.now()}`);
      }

      addAssistantMessage(responseText);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message;
      const friendlyMsg = msg.includes('Failed to fetch') || msg.includes('NetworkError')
        ? 'Cannot reach AI service. Please check your connection and try again.'
        : msg;
      setError(friendlyMsg);
      conversationRef.current.pop();
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [identity, conversationId, makeId, tools, processToolCalls, addAssistantMessage]);

  const confirmAction = useCallback(async (actionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await callToolExecutor({
        action: 'confirm',
        confirm_action_id: actionId,
      });
      setPendingAction(null);

      if (resp.error) {
        addAssistantMessage(`Action failed: ${resp.error}`, { status: 'failure' });
      } else {
        // Feed result back to Puter AI for a natural language summary
        conversationRef.current.push({
          role: 'tool',
          tool_call_id: 'confirmed',
          content: JSON.stringify(resp.result ?? 'Action completed successfully'),
        });

        try {
          const summary = await puter.ai.chat(
            conversationRef.current,
            { model: 'gpt-4o-mini' },
          );
          const text = summary.message?.content || summary.text || 'Done!';
          conversationRef.current.push({ role: 'assistant', content: text });
          addAssistantMessage(text, { status: 'success' });
        } catch {
          addAssistantMessage('Action completed successfully.', { status: 'success' });
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [callToolExecutor, addAssistantMessage]);

  const rejectAction = useCallback(async (actionId: string) => {
    setIsLoading(true);
    try {
      await callToolExecutor({
        action: 'reject',
        reject_action_id: actionId,
      });
      setPendingAction(null);
      conversationRef.current.push({ role: 'assistant', content: 'Action cancelled.' });
      addAssistantMessage('Action cancelled.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [callToolExecutor, addAssistantMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingAction(null);
    setError(null);
    conversationRef.current = [{ role: 'system', content: SYSTEM_PROMPT }];
  }, []);

  return {
    messages, isLoading, error, conversationId, pendingAction,
    sendMessage, confirmAction, rejectAction, clearChat,
  };
}
