// Phase 3 — Thin React hook bridging the FairPay chat orchestrator to UI state.
//
// All AI/tool/conversation logic lives in the orchestrator (pure TS).
// This hook only:
//   1. Constructs the orchestrator with hook-scoped DI (no singletons).
//   2. Holds React state (messages, isLoading, pendingPreview, error).
//   3. Adapts orchestrator output to setState calls.

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGetIdentity } from '@refinedev/core'
import { supabaseClient } from '@/utility/supabaseClient'
import type { Profile } from '@/modules/profile/types'
import { getPuter } from '@/lib/puter-auth'
import type { ChatMessage, ToolExecuteResponse } from '../types'
import type { AgentPreviewResponse } from '@/lib/agent-api'
import {
  FairPayChatOrchestrator,
  McpClient,
  FAIRPAY_SYSTEM_PROMPT,
  type ConversationMessage,
  type LegacyToolExecutor,
  type PuterChatFn,
} from '../orchestrator'

/** Puter.js global from the CDN <script> tag. */
declare const puter: {
  ai: {
    chat: (
      input: string | ReadonlyArray<Record<string, unknown>>,
      options?: Record<string, unknown>,
    ) => Promise<{
      message: { role: string; content: string | null; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> }
      text?: string
    }>
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ''
const MCP_ENDPOINT_URL = `${SUPABASE_URL}/functions/v1/fairpay-agent-mcp`
const LEGACY_AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`

interface UseAiChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  conversationId: string | null
  pendingPreview: AgentPreviewResponse | null
  /** Explicit cancellation of the pending preview (user-driven). */
  clearPreview: () => void
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

export function useAiChat(): UseAiChatReturn {
  const { data: identity } = useGetIdentity<Profile>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pendingPreview, setPendingPreview] = useState<AgentPreviewResponse | null>(null)

  // Conversation history (system + user/assistant/tool turns) — held in a ref
  // because every turn rewrites it as a unit and React state would re-render.
  const historyRef = useRef<ConversationMessage[]>([
    { role: 'system', content: FAIRPAY_SYSTEM_PROMPT },
  ])

  // Ref to avoid stale-closure capture of conversationId inside useMemo.
  const conversationIdRef = useRef<string | null>(conversationId)
  const orchestratorRef = useRef<FairPayChatOrchestrator | null>(null)
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  // ── Build the orchestrator with hook-scoped DI ─────────────────────────
  const getOrchestrator = useCallback(() => {
    if (orchestratorRef.current) return orchestratorRef.current
    const chatFn: PuterChatFn = async (msgs, options) => {
      if (typeof puter === 'undefined') {
        throw new Error('AI service is loading. Please try again in a moment.')
      }
      // Puter accepts an array of message objects
      return puter.ai.chat(msgs as unknown as ReadonlyArray<Record<string, unknown>>, options)
    }

    const mcpClient = new McpClient({
      endpointUrl: MCP_ENDPOINT_URL,
      getToken: getAccessToken,
      anonKey: SUPABASE_ANON_KEY,
    })

    const legacyExecutor: LegacyToolExecutor = async (toolName, toolArgs) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(LEGACY_AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'execute_tool',
          tool_name: toolName,
          tool_args: toolArgs,
          conversation_id: conversationIdRef.current,
        }),
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error('AI Chat service is not deployed yet.')
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as ToolExecuteResponse
      return json.result ?? json.error ?? 'No data'
    }

    orchestratorRef.current = new FairPayChatOrchestrator({ chatFn, mcpClient, legacyExecutor })
    return orchestratorRef.current
  }, [getAccessToken])

  const makeId = useCallback(
    () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    [],
  )

  const addAssistantMessage = useCallback(
    (content: string, metadata: ChatMessage['metadata'] = {}) => {
      const msg: ChatMessage = {
        id: makeId(),
        conversation_id: conversationId || 'local',
        role: 'assistant',
        content,
        metadata: { mode: 'info', status: 'success', ...metadata },
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, msg])
      return msg
    },
    [conversationId, makeId],
  )

  // ── Send message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !identity) return
      if (!getPuter()?.auth?.isSignedIn()) {
        setError('Please connect Puter first to use AI chat.')
        return
      }
      setIsLoading(true)
      setError(null)

      const userMsg: ChatMessage = {
        id: makeId(),
        conversation_id: conversationId || 'local',
        role: 'user',
        content: text,
        metadata: {},
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      try {
        const result = await getOrchestrator().processTurn(text, historyRef.current, pendingPreview)

        // Persist updated history for the next turn
        historyRef.current = result.updatedHistory

        // The orchestrator blocks replacement while a preview card is active.
        if (result.pendingPreview) {
          setPendingPreview(result.pendingPreview)
        }

        if (!conversationId) setConversationId(`local-${Date.now()}`)
        if (result.text) addAssistantMessage(result.text)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const msg = (err as Error).message
        const friendly =
          msg.includes('Failed to fetch') || msg.includes('NetworkError')
            ? 'Cannot reach AI service. Please check your connection and try again.'
            : msg
        setError(friendly)
        // Roll back the optimistic user message
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      } finally {
        setIsLoading(false)
      }
    },
    [identity, conversationId, makeId, getOrchestrator, pendingPreview, addAssistantMessage],
  )

  const clearPreview = useCallback(() => setPendingPreview(null), [])

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setPendingPreview(null)
    setError(null)
    historyRef.current = [{ role: 'system', content: FAIRPAY_SYSTEM_PROMPT }]
    orchestratorRef.current = null
  }, [])

  return {
    messages,
    isLoading,
    error,
    conversationId,
    pendingPreview,
    sendMessage,
    clearPreview,
    clearChat,
  }
}
