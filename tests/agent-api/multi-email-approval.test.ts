import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const MIGRATION = resolve(
  __dirname,
  '..',
  '..',
  'supabase/migrations/20261017120000_approve_submission_multi_email_match.sql',
)

describe('approve_external_agent_submission multi-email matching', () => {
  it('defines profile_email_matches and uses it for participant resolution', async () => {
    const sql = await readFile(MIGRATION, 'utf8')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.profile_email_matches')
    expect(sql).toContain('FROM public.user_emails ue')
    const approveBlock = sql.match(
      /CREATE OR REPLACE FUNCTION public\.approve_external_agent_submission[\s\S]*?\$\$;/,
    )
    expect(approveBlock).not.toBeNull()
    expect(approveBlock![0]).toContain('profile_email_matches(gm.user_id, v_participant')
    expect(approveBlock![0]).not.toMatch(
      /AND lower\(p\.email\) = lower\(v_participant->>'email'\)/,
    )
  })
})
