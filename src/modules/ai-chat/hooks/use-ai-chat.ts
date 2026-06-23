import { useState, useCallback, useRef, useMemo } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { supabaseClient } from '@/utility/supabaseClient';
import type { Profile } from '@/modules/profile/types';
import { getPuter } from '@/lib/puter-auth';
import type { ChatMessage, PendingAction, ToolExecuteResponse } from '../types';
import { PUTER_TOOL_DEFINITIONS } from '../types';
import { useAgentApiClient } from '@/lib/agent-api';
import type { AgentPreviewResponse, AgentDuplicateCheckRequest, AgentPreviewRequest } from '@/lib/agent-api';

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
You help users check balances, view groups, and safely preview group expenses.
Be concise and friendly. Use the available tools to fetch data or perform actions.
Always respond in the same language the user writes in.

When users ask about their debts or balances:
- Use get_debt_summary first to get an overview of who they owe / who owes them.
- If they ask for details about a specific person's debt (what expenses, when, how much for each), use get_debt_details with that person's counterparty_id from the summary.
- Present debt details clearly: expense description, date, amount remaining, and group/context.

To add a new group expense (Phase 1A — VND only):
1. Use get_groups to find the group_id.
2. Use agent_get_group_members to get member_id values for everyone in that group.
3. Optionally use agent_check_duplicates to avoid creating duplicate expenses.
4. Use agent_preview_expense to propose the expense.
   CRITICAL: Use member_id (from agent_get_group_members), NOT user_id, for payer_member_id and all participants.
   CRITICAL: Amount must be an integer VND — no decimals (e.g. 150000 not 150000.0).
5. The UI will display a confirmation card — do NOT call confirm or commit. The user clicks to confirm.`;

// Tools routed to fairpay-agent-api instead of the legacy ai-chat function
const AGENT_API_TOOLS = new Set(['agent_get_group_members', 'agent_check_duplicates', 'agent_preview_expense']);

interface UseAiChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  pendingAction: PendingAction | null;
  pendingPreview: AgentPreviewResponse | null;
  clearPreview: () => void;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => Promise<void>;
  clearChat: () => void;
}

export function useAiChat(): UseAiChatReturn {
  const agentApiClient = useAgentApiClient();
  const { data: identity } = useGetIdentity<Profile>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingPreview, setPendingPreview] = useState<AgentPreviewResponse | null>(null);
  const conversationRef = useRef<Array<Record<string, unknown>>>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return token;
  }, []);

  /** Call the legacy edge function tool executor (read-only tools only) */
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

  /** Process tool calls from Puter AI */
  const processToolCalls = useCallback(async (
    toolCalls: ToolCall[],
  ): Promise<string> => {
    async function processCalls(calls: ToolCall[]): Promise<string> {
      for (const tc of calls) {
      const toolName = tc.function.name;
      const toolArgs = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;

      // Phase 1A: route agent tools to fairpay-agent-api directly
      if (AGENT_API_TOOLS.has(toolName)) {
        let agentResult: unknown;

        if (toolName === 'agent_get_group_members') {
          agentResult = await agentApiClient.getGroupMembers(toolArgs.group_id as string);
        } else if (toolName === 'agent_check_duplicates') {
          agentResult = await agentApiClient.checkDuplicates(toolArgs as unknown as AgentDuplicateCheckRequest);
        } else if (toolName === 'agent_preview_expense') {
          const preview = await agentApiClient.previewExpense(toolArgs as unknown as AgentPreviewRequest);
          // Store full preview for the UI confirmation card
          setPendingPreview(preview);
          // Give the AI a compact summary (not the full preview object)
          agentResult = {
            preview_id: preview.preview_id,
            description: preview.preview.description,
            total_amount: preview.preview.amount,
            currency: 'VND',
            payer: preview.preview.payer.full_name,
            splits_count: preview.preview.splits.length,
            duplicate_warnings: preview.duplicate_warnings.length,
            status: 'preview_ready',
            note: 'A confirmation card has been shown to the user. Do not call confirm or commit.',
          };
        }

        conversationRef.current.push(
          { role: 'assistant', content: null, tool_calls: [tc] },
          { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(agentResult) },
        );

        const followUp = await puter.ai.chat(conversationRef.current, { tools, model: 'gpt-4o-mini' });

        if (followUp.message?.tool_calls?.length) {
          return processCalls(followUp.message.tool_calls);
        }

        const content = followUp.message?.content || followUp.text || '';
        conversationRef.current.push({ role: 'assistant', content });
        return content;
      }

      // Legacy read-only tools — route to ai-chat edge function
      const resp = await callToolExecutor({
        action: 'execute_tool',
        tool_name: toolName,
        tool_args: toolArgs,
        conversation_id: conversationId,
      });

      conversationRef.current.push(
        { role: 'assistant', content: null, tool_calls: [tc] },
        { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(resp.result ?? resp.error ?? 'No data') },
      );

      const followUp = await puter.ai.chat(
        conversationRef.current,
        { tools, model: 'gpt-4o-mini' },
      );

      if (followUp.message?.tool_calls?.length) {
        return processCalls(followUp.message.tool_calls);
      }

      const content = followUp.message?.content || followUp.text || '';
      conversationRef.current.push({ role: 'assistant', content });
      return content;
      }
      return '';
    }

    return processCalls(toolCalls);
  }, [agentApiClient, callToolExecutor, conversationId, tools]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !identity) return;
    if (!getPuter()?.auth?.isSignedIn()) {
      setError('Please connect Puter first to use AI chat.');
      return;
    }
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

  const clearPreview = useCallback(() => setPendingPreview(null), []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingAction(null);
    setPendingPreview(null);
    setError(null);
    conversationRef.current = [{ role: 'system', content: SYSTEM_PROMPT }];
  }, []);

  return {
    messages, isLoading, error, conversationId, pendingAction, pendingPreview,
    sendMessage, confirmAction, rejectAction, clearPreview, clearChat,
  };
}
