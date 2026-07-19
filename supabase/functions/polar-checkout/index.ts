/**
 * Polar Checkout — creates a Polar checkout session for FairPay Pro.
 *
 * Auth: Supabase JWT (Authorization Bearer).
 * Env: POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, SITE_URL, optional POLAR_SERVER=sandbox|production
 *
 * Prefer fetch REST (no @polar-sh/sdk dependency in Deno).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'

function polarApiBase(): string {
  const server = (Deno.env.get('POLAR_SERVER') ?? 'production').toLowerCase()
  if (server === 'sandbox') {
    return 'https://sandbox-api.polar.sh/v1'
  }
  return 'https://api.polar.sh/v1'
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightIfNeeded(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: getCorsHeaders(),
    })
  }

  const polarToken = Deno.env.get('POLAR_ACCESS_TOKEN')
  const productId = Deno.env.get('POLAR_PRODUCT_ID')
  const siteUrl = (Deno.env.get('SITE_URL') ?? Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')

  if (!polarToken || !productId || !siteUrl) {
    return new Response(
      JSON.stringify({
        error:
          'Polar checkout is not configured. Set POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, and SITE_URL (or APP_URL).',
      }),
      { status: 503, headers: getCorsHeaders() },
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: getCorsHeaders(),
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: getCorsHeaders(),
      })
    }

    const successUrl = `${siteUrl}/pricing?status=success`
    const checkoutRes = await fetch(`${polarApiBase()}/checkouts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${polarToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        products: [productId],
        external_customer_id: user.id,
        success_url: successUrl,
        customer_email: user.email ?? undefined,
      }),
    })

    if (!checkoutRes.ok) {
      const detail = await checkoutRes.text()
      console.error('Polar checkout failed', checkoutRes.status, detail)
      return new Response(
        JSON.stringify({ error: 'Failed to create Polar checkout session', detail }),
        { status: 502, headers: getCorsHeaders() },
      )
    }

    const checkout = (await checkoutRes.json()) as { url?: string }
    if (!checkout.url) {
      return new Response(JSON.stringify({ error: 'Polar checkout missing url' }), {
        status: 502,
        headers: getCorsHeaders(),
      })
    }

    return new Response(JSON.stringify({ url: checkout.url }), {
      status: 200,
      headers: getCorsHeaders(),
    })
  } catch (err) {
    console.error('polar-checkout error', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: getCorsHeaders(),
    })
  }
})
