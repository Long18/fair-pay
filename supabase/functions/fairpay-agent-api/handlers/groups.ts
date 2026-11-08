import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, requireAuth } from '../response.ts'

interface GroupRow {
  id: string
  name: string
  description: string | null
  is_archived: boolean
}
interface GroupMembershipRow {
  role: string
  groups: GroupRow
}

export async function handleGroups(supabase: SupabaseClient): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  // Avoid embedding group_members(count) from within group_members — PostgREST can fail that shape.
  const { data, error: qErr } = await supabase
    .from('group_members')
    .select(`
      role,
      groups!inner(
        id, name, description, is_archived
      )
    `)
    .eq('user_id', auth.user.id)
    .eq('groups.is_archived', false)

  if (qErr) return errJson(500, 'QUERY_ERROR', qErr.message)

  const byId = new Map<string, {
    id: string
    name: string
    description: string | null
    is_archived: boolean
    member_role: string
  }>()

  for (const row of (data ?? []) as GroupMembershipRow[]) {
    const g = row.groups
    if (!g?.id) continue
    if (!byId.has(g.id)) {
      byId.set(g.id, {
        id: g.id,
        name: g.name,
        description: g.description,
        is_archived: g.is_archived,
        member_role: row.role,
      })
    }
  }

  return okJson({ groups: Array.from(byId.values()) })
}

export async function handleGroupMembers(
  supabase: SupabaseClient,
  groupId: string
): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  // Actor must be a member
  const { data: actorMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', auth.user.id)
    .single()

  if (!actorMembership) {
    return errJson(403, 'NOT_GROUP_MEMBER', 'You are not a member of this group')
  }

  // Group must not be archived
  const { data: group } = await supabase
    .from('groups')
    .select('id, is_archived')
    .eq('id', groupId)
    .single()

  if (!group) return errJson(404, 'GROUP_NOT_FOUND', 'Group not found')
  if (group.is_archived) return errJson(422, 'GROUP_ARCHIVED', 'Group is archived')

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select(`
      id, role,
      profiles!inner(id, full_name, email, avatar_url)
    `)
    .eq('group_id', groupId)

  if (mErr) return errJson(500, 'QUERY_ERROR', mErr.message)

  type MemberRow = { id: string; role: string; profiles: { id: string; full_name: string; email: string | null; avatar_url: string | null } }
  const out = ((members ?? []) as MemberRow[]).map((m) => ({
    member_id: m.id,
    user_id: m.profiles.id,
    role: m.role,
    full_name: m.profiles.full_name,
    email: m.profiles.email,
    avatar_url: m.profiles.avatar_url,
  }))

  return okJson({ group_id: groupId, members: out })
}
