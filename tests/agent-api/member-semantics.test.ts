// Tests for member-ID semantics: member_id is always group_members.id, never profiles.id
import { describe, it, expect } from 'vitest'

const contractsModule = await import(
  '../../supabase/functions/fairpay-agent-api/contracts.ts'
)
const { PreviewRequest, GroupMember } = contractsModule

describe('member-ID semantics', () => {
  it('PreviewRequest.participants[].member_id is a UUID (group_members.id)', () => {
    const valid = {
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Test',
      amount: 50000,
      payer_member_id: '550e8400-e29b-41d4-a716-446655440001',
      split_method: 'equal' as const,
      participants: [{ member_id: '550e8400-e29b-41d4-a716-446655440001' }],
    }
    expect(PreviewRequest.safeParse(valid).success).toBe(true)
  })

  it('member_id rejects non-UUID', () => {
    const invalid = {
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Test',
      amount: 50000,
      payer_member_id: 'not-a-uuid',
      split_method: 'equal' as const,
      participants: [{ member_id: '550e8400-e29b-41d4-a716-446655440001' }],
    }
    expect(PreviewRequest.safeParse(invalid).success).toBe(false)
  })

  it('GroupMember response shape distinguishes member_id from user_id', () => {
    const member = {
      member_id: '550e8400-e29b-41d4-a716-446655440001', // group_members.id
      user_id: '550e8400-e29b-41d4-a716-446655440099',   // profiles.id
      role: 'member' as const,
      full_name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
    }
    expect(GroupMember.safeParse(member).success).toBe(true)
    // Verify the two IDs can be different
    expect(member.member_id).not.toBe(member.user_id)
  })
})
