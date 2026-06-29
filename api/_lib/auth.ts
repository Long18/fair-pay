import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/auth-js'

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
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (!authHeader) {
    return { user: null, error: 'Missing authorization header', supabase: null }
  }

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

  let user: User | null = null
  try {
    // supabase.auth.getUser() always resolves (never rejects) in normal operation,
    // but we wrap in try/catch to handle unexpected runtime failures (network errors,
    // version mismatches, etc.) that would otherwise cause FUNCTION_INVOCATION_FAILED.
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return { user: null, error: 'Invalid or expired token', supabase: null }
    }
    user = data.user
  } catch {
    return { user: null, error: 'Auth verification failed', supabase: null }
  }

  return { user, error: null, supabase }
}
