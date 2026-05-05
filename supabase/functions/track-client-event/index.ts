import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const ALLOWED_EVENT_NAMES = new Set([
  'page_view',
  'nav_click',
  'cta_click',
  'form_step_view',
  'form_submit',
  'form_success',
  'form_error',
  'auth_login',
  'auth_register',
  'expense_created',
  'payment_created',
  'group_created',
  'invite_sent',
  'invite_accepted',
  'settlement_completed',
  'profile_viewed_from_shared_link',
  'share_link_generated',
  'share_button_clicked',
  'share_copy_link_clicked',
  'share_native_sheet_opened',
  'share_completed',
  'share_failed',
])

const ALLOWED_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ref',
])

const BLOCKED_PROPERTY_KEYS = new Set([
  'access_token',
  'refresh_token',
  'password',
  'email',
  'comment',
  'comment_text',
  'note',
  'message',
  'content',
  'description',
  'token',
])

const LONG_STRING_PROPERTY_LIMITS = new Map<string, number>([
  ['destination_url', 2048],
  ['first_landing_url', 2048],
  ['last_landing_url', 2048],
  ['landing_url', 2048],
  ['destination_path', 1024],
  ['generated_path', 1024],
  ['first_landing_path', 1024],
  ['last_landing_path', 1024],
  ['landing_path', 1024],
  ['generated_url_hash', 128],
])

const TRACKED_REFERRERS: Array<[RegExp, string]> = [
  [/(\.|^)facebook\.com$/i, 'facebook'],
  [/(\.|^)fb\.com$/i, 'facebook'],
  [/(\.|^)messenger\.com$/i, 'messenger'],
  [/(\.|^)m\.me$/i, 'messenger'],
  [/(\.|^)tiktok\.com$/i, 'tiktok'],
  [/(\.|^)instagram\.com$/i, 'instagram'],
  [/(\.|^)zalo\.me$/i, 'zalo'],
  [/(\.|^)zalo\.com$/i, 'zalo'],
  [/(\.|^)whatsapp\.com$/i, 'whatsapp'],
  [/(\.|^)wa\.me$/i, 'whatsapp'],
  [/(\.|^)telegram\.org$/i, 'telegram'],
  [/(\.|^)telegram\.me$/i, 'telegram'],
  [/(\.|^)t\.me$/i, 'telegram'],
  [/(\.|^)twitter\.com$/i, 'x'],
  [/(\.|^)x\.com$/i, 'x'],
]

type NullableString = string | null | undefined

interface TrackingSessionPayload {
  id: string
  anonymous_id: string
  started_at?: string
  landing_path?: string
  landing_referrer?: string | null
  entry_link?: string
  device_type?: string | null
  locale?: string | null
}

interface TrackingEventPayload {
  event_name: string
  event_category: string
  page_path: string
  target_type?: string | null
  target_key?: string | null
  flow_name?: string | null
  step_name?: string | null
  referrer_path?: string | null
  properties?: Record<string, unknown> | null
  occurred_at?: string
}

interface TrackClientRequestBody {
  session?: TrackingSessionPayload
  events?: TrackingEventPayload[]
  access_token?: string | null
  attribution?: AttributionContextPayload | null
}

interface AttributionTouchPayload {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
  landing_url?: string | null
  landing_path?: string | null
  first_seen_at?: string | null
  last_seen_at?: string | null
}

interface AttributionContextPayload {
  first_touch?: AttributionTouchPayload | null
  last_touch?: AttributionTouchPayload | null
}

function normalizeString(value: NullableString, maxLength = 255): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function sanitizePath(input: NullableString): string {
  if (!input) return '/'

  try {
    const url = new URL(input, 'https://journey-tracker.local')
    const params = new URLSearchParams()
    for (const [key, value] of url.searchParams.entries()) {
      if (ALLOWED_QUERY_PARAMS.has(key) && value) {
        params.set(key, value.slice(0, 255))
      }
    }

    const pathname = url.pathname || '/'
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  } catch {
    return '/'
  }
}

function sanitizeReferrer(input: NullableString): string | null {
  if (!input) return null

  try {
    const url = new URL(input)
    return `${url.origin}${url.pathname}`.slice(0, 512)
  } catch {
    return null
  }
}

function extractAttribution(entryLink: string) {
  const parsed = new URL(entryLink, 'https://journey-tracker.local')
  return {
    utm_source: normalizeString(parsed.searchParams.get('utm_source')),
    utm_medium: normalizeString(parsed.searchParams.get('utm_medium')),
    utm_campaign: normalizeString(parsed.searchParams.get('utm_campaign')),
    utm_content: normalizeString(parsed.searchParams.get('utm_content')),
    utm_term: normalizeString(parsed.searchParams.get('utm_term')),
    ref: normalizeString(parsed.searchParams.get('ref')),
  }
}

function sanitizeUtmValue(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized ? normalized.slice(0, 255) : null
}

function mapReferrerSource(referrer: string | null): string | null {
  if (!referrer) return null

  try {
    const url = new URL(referrer)
    const hostname = url.hostname.replace(/^www\./i, '')
    const mapped = TRACKED_REFERRERS.find(([pattern]) => pattern.test(hostname))
    return mapped?.[1] ?? sanitizeUtmValue(hostname) ?? 'referral'
  } catch {
    return 'referral'
  }
}

function deriveLandingSource(entryLink: string, referrer: string | null, attribution: ReturnType<typeof extractAttribution>) {
  if (attribution.utm_source) return attribution.utm_source
  if (attribution.ref) return attribution.ref
  const referrerSource = mapReferrerSource(referrer)
  if (referrerSource) return referrerSource
  return 'direct'
}

function normalizeAttributionTouch(input?: AttributionTouchPayload | null): Record<string, string | null> | null {
  if (!input) return null

  const firstSeenAt = input.first_seen_at ? parseOccurredAt(input.first_seen_at) : null
  const lastSeenAt = input.last_seen_at ? parseOccurredAt(input.last_seen_at) : firstSeenAt
  const normalized = {
    utm_source: normalizeString(input.utm_source),
    utm_medium: normalizeString(input.utm_medium),
    utm_campaign: normalizeString(input.utm_campaign),
    utm_content: normalizeString(input.utm_content),
    utm_term: normalizeString(input.utm_term),
    referrer: normalizeString(input.referrer, 512),
    landing_url: normalizeString(input.landing_url, 2048),
    landing_path: sanitizePath(input.landing_path),
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt,
  }

  if (!normalized.utm_source && !normalized.referrer && !normalized.landing_url) {
    return null
  }

  return normalized
}

function fallbackAttributionTouch(
  attribution: ReturnType<typeof extractAttribution>,
  landingReferrer: string | null,
  landingPath: string,
  entryLink: string,
  seenAt: string,
) {
  return {
    utm_source: attribution.utm_source ?? deriveLandingSource(entryLink, landingReferrer, attribution),
    utm_medium: attribution.utm_medium ?? (landingReferrer && !attribution.utm_source ? 'referral' : 'none'),
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    referrer: landingReferrer,
    landing_url: entryLink,
    landing_path: landingPath,
    first_seen_at: seenAt,
    last_seen_at: seenAt,
  }
}

async function sha256(input: NullableString): Promise<string | null> {
  if (!input) return null
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(hashBuffer))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sanitizeProperties(input: Record<string, unknown> | null | undefined, depth = 0): Record<string, unknown> {
  if (!input || depth > 2) return {}

  const sanitized: Record<string, unknown> = {}

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.trim()
    if (!key || BLOCKED_PROPERTY_KEYS.has(key)) continue

    if (rawValue === null || rawValue === undefined) continue

    if (typeof rawValue === 'string') {
      sanitized[key] = rawValue.slice(0, LONG_STRING_PROPERTY_LIMITS.get(key) ?? 255)
      continue
    }

    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      sanitized[key] = rawValue
      continue
    }

    if (Array.isArray(rawValue)) {
      sanitized[key] = rawValue
        .filter((value) => ['string', 'number', 'boolean'].includes(typeof value))
        .slice(0, 20)
        .map((value) => typeof value === 'string' ? value.slice(0, 255) : value)
      continue
    }

    if (typeof rawValue === 'object') {
      sanitized[key] = sanitizeProperties(rawValue as Record<string, unknown>, depth + 1)
    }
  }

  return sanitized
}

function parseOccurredAt(value?: string): string {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function normalizeSessionId(value: NullableString): string | null {
  const normalized = normalizeString(value, 36)
  if (!normalized) return null
  return /^[0-9a-f-]{36}$/i.test(normalized) ? normalized : null
}

function normalizeAnonymousId(value: NullableString): string | null {
  return normalizeString(value, 128)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders() })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: getCorsHeaders(),
    })
  }

  try {
    const body = await req.json() as TrackClientRequestBody
    const session = body.session
    const events = (body.events ?? []).slice(0, 50)

    if (!session || events.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing session or events' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    const sessionId = normalizeSessionId(session.id)
    const anonymousId = normalizeAnonymousId(session.anonymous_id)
    if (!sessionId || !anonymousId) {
      return new Response(JSON.stringify({ error: 'Invalid session payload' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let userId: string | null = null
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '').trim() || null
    const bodyToken = normalizeString(body.access_token, 4096)
    const token = headerToken || bodyToken
    if (token) {
      const { data: authData, error: authError } = await serviceClient.auth.getUser(token)
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Invalid access token' }), {
          status: 401,
          headers: getCorsHeaders(),
        })
      }
      userId = authData.user.id
    }

    if (userId) {
      const { data: ignoredUser, error: ignoredUserError } = await serviceClient
        .from('user_tracking_ignored_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (ignoredUserError) {
        console.error('Failed to check ignored tracking user', ignoredUserError)
        return new Response(JSON.stringify({ error: 'Failed to evaluate tracking preference' }), {
          status: 500,
          headers: getCorsHeaders(),
        })
      }

      if (ignoredUser?.user_id) {
        return new Response(JSON.stringify({
          success: true,
          session_id: sessionId,
          accepted: 0,
          ignored: true,
          user_id: userId,
        }), {
          status: 200,
          headers: getCorsHeaders(),
        })
      }
    }

    const entryLink = sanitizePath(session.entry_link ?? session.landing_path ?? events[0]?.page_path ?? '/')
    const landingPath = sanitizePath(session.landing_path ?? events[0]?.page_path ?? '/')
    const landingReferrer = sanitizeReferrer(session.landing_referrer)
    const attribution = extractAttribution(entryLink)
    const startedAt = parseOccurredAt(session.started_at)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip')
    const userAgent = req.headers.get('user-agent')

    const sessionRow = {
      id: sessionId,
      anonymous_id: anonymousId,
      user_id: userId,
      started_at: startedAt,
      last_seen_at: new Date().toISOString(),
      landing_path: landingPath,
      landing_referrer: landingReferrer,
      landing_source: deriveLandingSource(entryLink, landingReferrer, attribution),
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      entry_link: entryLink,
      device_type: normalizeString(session.device_type),
      locale: normalizeString(session.locale),
      ip_hash: await sha256(ipAddress),
      user_agent_hash: await sha256(userAgent),
    }

    const { error: sessionError } = await serviceClient
      .from('user_tracking_sessions')
      .upsert(sessionRow, { onConflict: 'id' })

    if (sessionError) {
      console.error('Failed to upsert journey session', sessionError)
      return new Response(JSON.stringify({ error: 'Failed to store session' }), {
        status: 500,
        headers: getCorsHeaders(),
      })
    }

    const fallbackTouch = fallbackAttributionTouch(attribution, landingReferrer, landingPath, entryLink, startedAt)
    const firstTouch = normalizeAttributionTouch(body.attribution?.first_touch) ?? fallbackTouch
    const lastTouch = normalizeAttributionTouch(body.attribution?.last_touch) ?? fallbackTouch
    const { error: attributionError } = await serviceClient.rpc('upsert_user_attribution', {
      p_user_id: userId,
      p_anonymous_id: anonymousId,
      p_session_id: sessionId,
      p_first: firstTouch,
      p_last: lastTouch,
    })

    if (attributionError) {
      console.error('Failed to upsert user attribution', attributionError)
    }

    const sanitizedEvents = events
      .filter((event) => ALLOWED_EVENT_NAMES.has(event.event_name))
      .map((event) => ({
        session_id: sessionId,
        user_id: userId,
        anonymous_id: anonymousId,
        event_name: event.event_name,
        event_category: normalizeString(event.event_category, 64) ?? 'journey',
        page_path: sanitizePath(event.page_path),
        target_type: normalizeString(event.target_type, 64),
        target_key: normalizeString(event.target_key, 128),
        flow_name: normalizeString(event.flow_name, 64),
        step_name: normalizeString(event.step_name, 64),
        referrer_path: event.referrer_path ? sanitizePath(event.referrer_path) : null,
        properties: sanitizeProperties(event.properties),
        occurred_at: parseOccurredAt(event.occurred_at),
      }))

    if (sanitizedEvents.length === 0) {
      return new Response(JSON.stringify({ success: true, accepted: 0 }), {
        headers: getCorsHeaders(),
        status: 200,
      })
    }

    const { error: insertError } = await serviceClient
      .from('user_tracking_events')
      .insert(sanitizedEvents)

    if (insertError) {
      console.error('Failed to insert journey events', insertError)
      return new Response(JSON.stringify({ error: 'Failed to store events' }), {
        status: 500,
        headers: getCorsHeaders(),
      })
    }

    if (userId) {
      await serviceClient
        .from('user_tracking_events')
        .update({ user_id: userId })
        .eq('session_id', sessionId)
        .is('user_id', null)

      await serviceClient
        .from('user_tracking_sessions')
        .update({ user_id: userId, last_seen_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: sessionId,
      accepted: sanitizedEvents.length,
      user_id: userId,
    }), {
      status: 200,
      headers: getCorsHeaders(),
    })
  } catch (error) {
    console.error('track-client-event error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: getCorsHeaders(),
    })
  }
})
