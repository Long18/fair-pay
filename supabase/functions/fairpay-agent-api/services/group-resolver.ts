// AgentGroupResolver — turns a group_id into a validated, non-archived group
// row. Centralizes the "load group + assert active" logic that every
// transaction-shaped handler needs.
//
// Returns either a resolved group or a fully-formed Response error. Handlers
// short-circuit on `result.error` and otherwise use `result.group`.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { errJson } from '../response.ts'

export interface ResolvedGroup {
  id: string
  name: string
  is_archived: boolean
}

export type GroupResolveResult =
  | { group: ResolvedGroup; error: null }
  | { group: null; error: Response }

export async function resolveGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<GroupResolveResult> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, is_archived')
    .eq('id', groupId)
    .single()

  if (error || !data) {
    return { group: null, error: errJson(404, 'GROUP_NOT_FOUND', 'Group not found') }
  }
  if (data.is_archived) {
    return { group: null, error: errJson(422, 'GROUP_ARCHIVED', 'Group is archived') }
  }

  return { group: data as ResolvedGroup, error: null }
}
