import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson } from '../response.ts'

export async function handleMe(supabase: SupabaseClient): Promise<Response> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errJson(401, 'UNAUTHENTICATED', 'Not authenticated')

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (pErr || !profile) return errJson(404, 'PROFILE_NOT_FOUND', 'Profile not found')

  return okJson({
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
  })
}
