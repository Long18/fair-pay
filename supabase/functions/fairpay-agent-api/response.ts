import { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAgentApiCorsHeaders } from './_cors.ts'
import {
  okJson as sharedOkJson,
  errJson as sharedErrJson,
  parseBody as sharedParseBody,
  type ParseBodyResult,
} from '../_shared/agent-response.ts'

// requireAuth — shared auth guard used by all handlers.
// Returns either { user, error: null } or { user: null, error: Response }.
// Call at the top of every handler, return error immediately on failure.
export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: Response }

export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return { user: null, error: errJson(401, 'UNAUTHENTICATED', 'Not authenticated') }
    }
    return { user: data.user, error: null }
  } catch {
    return { user: null, error: errJson(401, 'UNAUTHENTICATED', 'Not authenticated') }
  }
}

/** Convenience wrappers that bake in the agent-api CORS headers. */
export function okJson(data: unknown, status = 200): Response {
  return sharedOkJson(data, getAgentApiCorsHeaders(), status)
}

export function errJson(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return sharedErrJson(status, code, message, getAgentApiCorsHeaders(), details)
}

export async function parseBody(req: Request): Promise<ParseBodyResult> {
  return sharedParseBody(req, getAgentApiCorsHeaders())
}

export type { ParseBodyResult }
