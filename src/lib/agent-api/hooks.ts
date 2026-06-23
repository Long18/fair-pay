// React hooks for FairPay Agent API v1.
// These are the hooks the AI chat and UI use to call the agent API.

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/utility/supabaseClient'
import { AgentApiClient } from './client'
import type {
  AgentPreviewRequest,
  AgentDuplicateCheckRequest,
  AgentCommitRequest,
  AgentPreviewResponse,
} from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function createAgentApiClient(): AgentApiClient {
  return new AgentApiClient(SUPABASE_URL, async () => {
    const { data } = await supabaseClient.auth.getSession()
    return data.session?.access_token ?? null
  })
}

// -- Read hooks ----------------------------------------------------------

export function useAgentApiClient(): AgentApiClient {
  return useMemo(() => createAgentApiClient(), [])
}

export function useAgentMe() {
  const client = useAgentApiClient()
  return useQuery({
    queryKey: ['agent', 'me'],
    queryFn: () => client.getMe(),
  })
}

export function useAgentGroups() {
  const client = useAgentApiClient()
  return useQuery({
    queryKey: ['agent', 'groups'],
    queryFn: () => client.getGroups(),
  })
}

export function useAgentGroupMembers(groupId: string | null) {
  const client = useAgentApiClient()
  return useQuery({
    queryKey: ['agent', 'groups', groupId, 'members'],
    queryFn: () => client.getGroupMembers(groupId!),
    enabled: !!groupId,
  })
}

export function useAgentOperation(previewId: string | null, poll = false) {
  const client = useAgentApiClient()
  return useQuery({
    queryKey: ['agent', 'operations', previewId],
    queryFn: () => client.pollOperation(previewId!),
    enabled: !!previewId,
    refetchInterval: poll ? 2000 : false,
  })
}

// -- Mutation hooks ------------------------------------------------------

export function useAgentDuplicateCheck() {
  const client = useAgentApiClient()
  return useMutation({
    mutationFn: (body: AgentDuplicateCheckRequest) => client.checkDuplicates(body),
  })
}

export function useAgentPreview() {
  const client = useAgentApiClient()
  return useMutation({
    mutationFn: (body: AgentPreviewRequest) => client.previewExpense(body),
  })
}

// -- Confirm + Commit flow (UI controller only) --------------------------

export interface UseAgentConfirmFlowOptions {
  onSuccess?: (result: { expense_id: string; operation_id: string }) => void
  onError?: (err: Error) => void
}

export function useAgentConfirmFlow(options?: UseAgentConfirmFlowOptions) {
  const client = useAgentApiClient()
  const qc = useQueryClient()
  const [step, setStep] = useState<'idle' | 'confirming' | 'committing' | 'done' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (preview: AgentPreviewResponse) => {
      setStep('confirming')
      setError(null)
      try {
        const confirmation = await client.confirmPreview(preview.preview_id, {
          preview_hash: preview.preview_hash,
        })
        setStep('committing')
        const idempotencyKey = `${preview.preview_id}:${confirmation.confirmation_id}`
        const result = await client.commitExpense(
          {
            preview_id: preview.preview_id,
            preview_hash: preview.preview_hash,
            confirmation_id: confirmation.confirmation_id,
          } satisfies AgentCommitRequest,
          idempotencyKey
        )
        setStep('done')
        // Invalidate expense and group queries so the UI refreshes
        void qc.invalidateQueries({ queryKey: ['expenses'] })
        void qc.invalidateQueries({ queryKey: ['agent', 'groups'] })
        options?.onSuccess?.({ expense_id: result.expense_id, operation_id: result.operation_id })
        return result
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setStep('error')
        setError(e)
        options?.onError?.(e)
        throw e
      }
    },
    [client, qc, options]
  )

  return { run, step, error }
}
