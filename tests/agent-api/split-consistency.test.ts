// Split consistency between internal commit and external approval.
//
// This test enforces the cross-flow contract that the same canonical payload
// produces identical expense_splits rows regardless of which agent flow
// created the expense.
//
// The test inspects the SQL migrations themselves rather than running against
// a live database — that lets it run as part of the standard vitest pnpm test
// suite without a Supabase container, while still catching regressions in the
// shared write primitive.

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '..', '..')
const SHARED_WRITE_MIGRATION = resolve(
  REPO_ROOT,
  'supabase/migrations/20260627000000_shared_expense_write.sql',
)

async function readMigration(): Promise<string> {
  return readFile(SHARED_WRITE_MIGRATION, 'utf8')
}

describe('split consistency: shared write primitive', () => {
  it('migration file exists', async () => {
    const sql = await readMigration()
    expect(sql.length).toBeGreaterThan(0)
  })

  it('defines write_group_expense_atomic with the canonical signature', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.write_group_expense_atomic/i)
    // Required parameters (order matters for downstream callers)
    for (const param of [
      'p_group_id',
      'p_payer_user_id',
      'p_payer_member_id',
      'p_amount',
      'p_description',
      'p_category',
      'p_expense_date',
      'p_comment',
      'p_created_by',
      'p_resolved_splits',
      'p_split_method',
    ]) {
      expect(sql).toContain(param)
    }
  })

  it('write primitive is SECURITY DEFINER with locked search_path', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(/write_group_expense_atomic[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = pg_catalog, public, pg_temp/i)
  })

  it('settles payer self-split immediately (is_settled = payer match)', async () => {
    const sql = await readMigration()
    // The is_settled column must be set to the boolean comparison
    //   (split.user_id)::UUID = p_payer_user_id
    expect(sql).toMatch(
      /\(v_split->>'user_id'\)::UUID = p_payer_user_id/,
    )
  })

  it('payer split has settled_amount = split_amount, others have 0', async () => {
    const sql = await readMigration()
    // Match the CASE WHEN for settled_amount in the primitive
    const settledAmountMatches = sql.match(
      /CASE WHEN \(v_split->>'user_id'\)::UUID = p_payer_user_id\s*THEN \(v_split->>'amount'\)::BIGINT ELSE 0 END/g,
    )
    expect(settledAmountMatches).not.toBeNull()
    expect(settledAmountMatches!.length).toBeGreaterThanOrEqual(1)
  })

  it('payer split has settled_at = now(), others NULL', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(
      /CASE WHEN \(v_split->>'user_id'\)::UUID = p_payer_user_id\s*THEN now\(\) ELSE NULL END/,
    )
  })

  it('returns canonical result shape {expense_id, splits_count}', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(/jsonb_build_object\(\s*'expense_id'[\s\S]*?'splits_count'/)
  })

  it('rejects PUBLIC and anon execution', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.write_group_expense_atomic[\s\S]*?FROM PUBLIC, anon/i)
  })

  it('grants execution to authenticated and service_role only', async () => {
    const sql = await readMigration()
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.write_group_expense_atomic[\s\S]*?TO authenticated, service_role/i)
  })
})

describe('split consistency: caller migration', () => {
  it('commit_agent_expense calls the shared write primitive', async () => {
    const sql = await readMigration()
    // The CREATE OR REPLACE for commit_agent_expense must include a call to
    // public.write_group_expense_atomic.
    const commitBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.commit_agent_expense[\s\S]*?\$\$;/,
    )
    expect(commitBlock).not.toBeNull()
    expect(commitBlock![0]).toContain('public.write_group_expense_atomic(')
  })

  it('commit_agent_expense no longer has its own INSERT INTO expense_splits', async () => {
    const sql = await readMigration()
    const commitBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.commit_agent_expense[\s\S]*?\$\$;/,
    )
    expect(commitBlock).not.toBeNull()
    // The duplicated INSERT path must be gone — only the shared primitive writes splits.
    expect(commitBlock![0]).not.toMatch(/INSERT INTO public\.expense_splits/i)
  })

  it('approve_external_agent_submission calls the shared write primitive', async () => {
    const sql = await readMigration()
    const approveBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.approve_external_agent_submission[\s\S]*?\$\$;/,
    )
    expect(approveBlock).not.toBeNull()
    expect(approveBlock![0]).toContain('public.write_group_expense_atomic(')
  })

  it('approve_external_agent_submission no longer has its own INSERT INTO expense_splits', async () => {
    const sql = await readMigration()
    const approveBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.approve_external_agent_submission[\s\S]*?\$\$;/,
    )
    expect(approveBlock).not.toBeNull()
    expect(approveBlock![0]).not.toMatch(/INSERT INTO public\.expense_splits/i)
  })

  it('approve_external_agent_submission records commit_source in resolution', async () => {
    const sql = await readMigration()
    const approveBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.approve_external_agent_submission[\s\S]*?\$\$;/,
    )
    expect(approveBlock).not.toBeNull()
    expect(approveBlock![0]).toMatch(/'commit_source'[\s\S]*?'external_agent'/)
  })

  it('settlement logic appears exactly once (single source of truth)', async () => {
    const sql = await readMigration()
    // Count how many distinct INSERT INTO expense_splits exist across this migration.
    const inserts = sql.match(/INSERT INTO public\.expense_splits/gi) ?? []
    expect(inserts.length).toBe(1)
  })
})
