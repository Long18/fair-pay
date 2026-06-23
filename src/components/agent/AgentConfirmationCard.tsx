// AgentConfirmationCard — renders the server preview for user confirmation.
//
// This card is shown in the AI chat when the agent proposes an expense.
// It renders exactly the server preview data — no client-side recalculation.
//
// The confirm button calls confirm → commit atomically via the flow hook.
// The model's tool list MUST NOT contain confirm or commit.

import { useState } from 'react'
import type { AgentPreviewResponse } from '@/lib/agent-api/types'
import { useAgentConfirmFlow } from '@/lib/agent-api/hooks'
import { cn } from '@/lib/utils'
import { getSemanticStatusColors } from '@/lib/status-colors'

interface AgentConfirmationCardProps {
  preview: AgentPreviewResponse
  onDone?: (result: { expense_id: string; operation_id: string }) => void
  onError?: (err: Error) => void
}

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

export function AgentConfirmationCard({ preview, onDone, onError }: AgentConfirmationCardProps) {
  const { run, step, error } = useAgentConfirmFlow({ onSuccess: onDone, onError })
  const [dismissed, setDismissed] = useState(false)

  const p = preview.preview
  const isLoading = step === 'confirming' || step === 'committing'
  const isDone = step === 'done'
  const successColors = getSemanticStatusColors('success')

  if (dismissed) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Agent Expense Preview</h4>
        <span className="text-xs text-muted-foreground">{p.group_name}</span>
      </div>

      {/* Main info */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Description</span>
          <span className="font-medium">{p.description}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{formatVnd(p.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid by</span>
          <span>{p.payer.full_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{p.expense_date}</span>
        </div>
        {p.category && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span>{p.category}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Split method</span>
          <span>{p.requested_split_method.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Splits table */}
      <div className="border-t pt-2">
        <p className="text-xs text-muted-foreground mb-1">Split breakdown</p>
        <div className="space-y-0.5">
          {p.splits.map((s) => (
            <div key={s.member_id} className="flex justify-between text-xs">
              <span>{s.full_name}</span>
              <span>{formatVnd(s.amount)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs font-medium mt-1 pt-1 border-t">
          <span>Total check</span>
          <span>{formatVnd(p.total_check)}</span>
        </div>
      </div>

      {/* Duplicate warnings */}
      {preview.duplicate_warnings.length > 0 && (
        <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ {preview.duplicate_warnings.length} potential duplicate(s) found.
        </div>
      )}

      {/* Comment */}
      {p.comment && (
        <div className="text-xs text-muted-foreground italic">&ldquo;{p.comment}&rdquo;</div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">
          {error.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {!isDone && (
          <>
            <button
              type="button"
              onClick={() => void run(preview)}
              disabled={isLoading}
              className="flex-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (step === 'confirming' ? 'Confirming…' : 'Committing…') : 'Confirm & Create'}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              disabled={isLoading}
              className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
        {isDone && (
          <div className={cn('flex-1 text-center text-sm font-medium', successColors.text)}>
            ✓ Expense created
          </div>
        )}
      </div>
    </div>
  )
}
