import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

interface AuthResult {
  user: User | null
  error: string | null
  supabase: SupabaseClient | null
}

/**
 * Authenticate a request by verifying the JWT token via Supabase Auth.
 * Uses supabase.auth.getUser() which cryptographically verifies the token.
 * DO NOT replace this with jwtDecode — that only decodes without verification.
 */
export async function getAuthenticatedUser(authHeader: string | undefined): Promise<AuthResult> {
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header', supabase: null }
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return { user: null, error: 'Invalid authorization header format', supabase: null }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Server misconfiguration', supabase: null }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token', supabase: null }
  }

  return { user, error: null, supabase }
}
