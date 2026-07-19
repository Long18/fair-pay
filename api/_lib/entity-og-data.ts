import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { defaultOgImageUrl } from './share-html'

export interface ProfileOgData {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface GroupOgData {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  member_count: number | null
}

function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null

  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function fetchProfileOgData(profileId: string): Promise<ProfileOgData | null> {
  const supabase = createServiceClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', profileId)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: String(data.id),
      full_name: String(data.full_name || 'FairPay user'),
      avatar_url: data.avatar_url ? String(data.avatar_url) : null,
    }
  } catch {
    return null
  }
}

export async function fetchGroupOgData(groupId: string): Promise<GroupOgData | null> {
  const supabase = createServiceClient()
  if (!supabase) return null

  try {
    const [{ data: group, error: groupError }, { count }] = await Promise.all([
      supabase
        .from('groups')
        .select('id, name, description, avatar_url')
        .eq('id', groupId)
        .maybeSingle(),
      supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId),
    ])

    if (groupError || !group) return null

    return {
      id: String(group.id),
      name: String(group.name || 'FairPay group'),
      description: group.description ? String(group.description) : null,
      avatar_url: group.avatar_url ? String(group.avatar_url) : null,
      member_count: typeof count === 'number' ? count : null,
    }
  } catch {
    return null
  }
}

export function resolveEntityOgImage(base: string, avatarUrl: string | null | undefined): string {
  if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) return avatarUrl
  return defaultOgImageUrl(base)
}

export function buildProfileOgTitle(profile: ProfileOgData | null): string {
  return profile ? `${profile.full_name} on FairPay` : 'FairPay Profile'
}

export function buildProfileOgDescription(profile: ProfileOgData | null): string {
  if (!profile) return 'Check out this profile on FairPay.'
  return `Check out ${profile.full_name} on FairPay — split expenses with friends and groups.`
}

export function buildGroupOgTitle(group: GroupOgData | null): string {
  return group ? `${group.name} · FairPay` : 'FairPay Group'
}

export function buildGroupOgDescription(group: GroupOgData | null): string {
  if (!group) return 'Join this group on FairPay to split expenses.'
  if (group.description?.trim()) return group.description.trim()
  if (group.member_count != null && group.member_count > 0) {
    return `${group.member_count} member${group.member_count === 1 ? '' : 's'} · Split expenses on FairPay`
  }
  return 'Join this group on FairPay to split expenses.'
}

export const INVITE_OG_TITLE = 'Join me on FairPay'
export const INVITE_OG_DESCRIPTION =
  'Join me on FairPay — the easiest way to split expenses!'
