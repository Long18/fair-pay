import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260622094450_agent_api_phase1a.sql'),
  'utf8'
)
const legacyAiChat = readFileSync(
  resolve(process.cwd(), 'supabase/functions/ai-chat/index.ts'),
  'utf8'
)

describe('agent migration security boundaries', () => {
  it('does not grant authenticated users direct DML on agent control tables', () => {
    expect(migration).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE|ALL).*agent_(?:operations|previews|confirmations|idempotency_keys).*authenticated/is)
  })

  it('exposes only narrow authenticated write RPCs', () => {
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.create_agent_expense_preview')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.confirm_agent_preview')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.commit_agent_expense')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.mark_agent_operation_terminal')
    expect(migration).not.toContain('GRANT EXECUTE ON FUNCTION public.expire_agent_previews() TO authenticated')
  })

  it('locks and claims idempotency before creating an expense', () => {
    const claim = migration.indexOf('INSERT INTO public.agent_idempotency_keys')
    const expense = migration.indexOf('INSERT INTO public.expenses')
    expect(claim).toBeGreaterThan(-1)
    expect(expense).toBeGreaterThan(claim)
  })

  it('removes legacy financial write implementations', () => {
    expect(legacyAiChat).not.toMatch(/case\s+['"](?:add_expense|record_payment|create_group)['"]/)
    expect(legacyAiChat).toContain("new Set(['create_group', 'add_expense', 'record_payment'])")
  })
})
