import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson } from '../response.ts'

interface GroupMemberCountRow { count: number }
interface GroupRow {
  id: string
  name: string
  description: string | null
  is_archived: boolean
  group_members: GroupMemberCountRow[]
}
interface GroupMembershipRow {
  role: string
  groups: GroupRow
}

interface MemberProfileRow {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
}
interface MemberRow {
  id: string
  role: string
  profiles: MemberProfileRow
}

export async function handleGroups(supabase: SupabaseClient): Promise<Response> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errJson(401, 'UNAUTHENTICATED', 'Not authenticated')

  const { data, error: qErr } = await supabase
    .from('group_members')
    .select(`
      role,
      groups!inner(
        id, name, description, is_archived,
        group_members(count)
      )
    `)
    .eq('user_id', user.id)
    .eq('groups.is_archived', false)

  if (qErr) return errJson(500, 'QUERY_ERROR', qErr.message)

  const groups = ((data ?? []) as GroupMembershipRow[]).map((row) => ({
    id: row.groups.id,
    name: row.groups.name,
    description: row.groups.description,
    is_archived: row.groups.is_archived,
    member_count: row.groups.group_members?.[0]?.count ?? 0,
    member_role: row.role,
  }))

  return okJson({ groups })
}

export async function handleGroupMembers(
  supabase: SupabaseClient,
  groupId: string
): Promise<Response> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errJson(401, 'UNAUTHENTICATED', 'Not authenticated')

  // Actor must be a member
  const { data: actorMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
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

  // Fetch members — registered users only (no pending_email in Phase 1A)
  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select(`
      id, role,
      profiles!inner(id, full_name, email, avatar_url)
    `)
    .eq('group_id', groupId)

  if (mErr) return errJson(500, 'QUERY_ERROR', mErr.message)

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
