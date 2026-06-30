import { getAuthenticatedUser } from './auth.js'
import type { User } from '@supabase/auth-js'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AdminAuthResult {
  user: User | null
  error: string | null
  supabase: SupabaseClient | null
  /**
   * HTTP status code that maps to the error case:
   *   - 401 for missing/invalid auth (caller is not authenticated)
   *   - 403 for authenticated-but-not-admin (caller lacks admin role)
   *   - null on success.
   */
  status: 401 | 403 | null
}

/**
 * Authenticate + authorize admin access at the HTTP layer (defense-in-depth on top
 * of any RPC-level checks). First verifies the JWT via getAuthenticatedUser, then
 * checks the admin role via the user_roles table using the user's authenticated
 * supabase client (so RLS still applies).
 *
 * Callers should return:
 *   - 401 when status === 401 (no/invalid auth)
 *   - 403 when status === 403 (not admin)
 */
export async function getAdminUser(authHeader: string | undefined): Promise<AdminAuthResult> {
  const { user, error, supabase } = await getAuthenticatedUser(authHeader)
  if (!user || !supabase) {
    return { user: null, error: error || 'Unauthorized', supabase: null, status: 401 }
  }

  // Check admin role via user_roles. This matches the schema used elsewhere in
  // the codebase (see api/admin/api-console/execute.ts). We deliberately use the
  // user-scoped client so RLS applies (admins can read their own role row).
  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleError || !roleRow || roleRow.role !== 'admin') {
    return {
      user: null,
      error: 'Forbidden: admin access required',
      supabase: null,
      status: 403,
    }
  }

  return { user, error: null, supabase, status: null }
}
