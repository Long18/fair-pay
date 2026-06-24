// AgentMemberResolver — loads group membership for the authenticated agent API.
//
// loadGroupMembers: fetches all members for a group and verifies the actor is
// among them. Returns a typed result or a ready-to-send error Response.
//
// indexById: builds an O(1) member_id → GroupMemberRow map used by handlers
// that need to look up payer/participant details after policy checks.
//
// Name-based resolution (email/display_name → member_id) is intentionally
// omitted here: the authenticated API receives stable member_ids from clients,
// and the no-key external intake defers name resolution to the SQL approval RPC.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { errJson } from '../response.ts'

export interface GroupMemberRow {
  member_id: string
  user_id: string
  role: 'admin' | 'member'
  full_name: string
  email: string | null
  avatar_url: string | null
}

export type MembersLoadResult =
  | { members: GroupMemberRow[]; error: null }
  | { members: null; error: Response }

interface MemberQueryRow {
  id: string
  role: string
  user_id: string
  profiles: { id: string; full_name: string; email: string | null; avatar_url: string | null }
}

export async function loadGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  actorUserId: string
): Promise<MembersLoadResult> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, role, user_id, profiles!inner(id, full_name, email, avatar_url)')
    .eq('group_id', groupId)

  if (error) return { members: null, error: errJson(500, 'QUERY_ERROR', error.message) }

  const rows = (data ?? []) as MemberQueryRow[]
  if (!rows.some((row) => row.user_id === actorUserId)) {
    return { members: null, error: errJson(403, 'NOT_GROUP_MEMBER', 'You are not a member of this group') }
  }

  const members: GroupMemberRow[] = rows.map((row) => ({
    member_id: row.id,
    user_id: row.user_id,
    role: row.role as 'admin' | 'member',
    full_name: row.profiles.full_name,
    email: row.profiles.email,
    avatar_url: row.profiles.avatar_url,
  }))
  return { members, error: null }
}

// indexById — small helper used by handlers that need O(1) member_id lookup.
export function indexById(members: readonly GroupMemberRow[]): Record<string, GroupMemberRow> {
  return Object.fromEntries(members.map((m) => [m.member_id, m]))
}
