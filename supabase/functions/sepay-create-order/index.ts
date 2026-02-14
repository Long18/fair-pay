/**
 * SePay Create Order Edge Function
 *
 * Two modes:
 * - POST: Creates order, generates signed form fields, returns checkout_url
 * - GET with ?order_id=X: Serves auto-submitting HTML form that POSTs to SePay
 *
 * This bypasses Vercel's CSP form-action restriction because the form
 * submission happens from the edge function's domain, not Vercel's.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEPAY_SANDBOX_URL = 'https://sandbox.pay.sepay.vn/v1/checkout/init'
const SEPAY_PRODUCTION_URL = 'https://pay.sepay.vn/v1/checkout/init'

interface CreateOrderRequest {
  source_type: 'DEBT' | 'EXPENSE'
  source_id: string
  payee_user_id: string
  amount: number
  currency: string
  description: string
  success_url?: string
  error_url?: string
  cancel_url?: string
}

/**
 * Serve an HTML page that auto-submits a form to SePay.
 * This runs in the user's browser tab opened via window.open().
 */
function buildCheckoutHtml(formAction: string, formFields: Record<string, string>): string {
  const inputs = Object.entries(formFields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}" />`)
    .join('\n      ')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Redirecting to SePay...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .loader { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to SePay payment page...</p>
  </div>
  <form id="sepay-form" method="POST" action="${escapeHtml(formAction)}">
      ${inputs}
  </form>
  <script>document.getElementById('sepay-form').submit();</script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

  // GET mode: serve checkout HTML page for a given order
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')
    if (!orderId) {
      return new Response('Missing order_id', { status: 400 })
    }

    // Fetch order + payee config
    const { data: order, error: orderError } = await serviceClient
      .from('sepay_payment_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response('Order not found', { status: 404 })
    }

    if (order.status !== 'PENDING') {
      return new Response('Order is no longer pending', { status: 400 })
    }

    // Fetch payee's SePay config to rebuild form fields
    const { data: payeeSettings } = await serviceClient
      .from('user_settings')
      .select('sepay_config')
      .eq('user_id', order.payee_user_id)
      .single()

    if (!payeeSettings?.sepay_config) {
      return new Response('Payee SePay config not found', { status: 400 })
    }

    const sepayConfig = payeeSettings.sepay_config as {
      merchant_id: string
      secret_key: string
      environment: 'sandbox' | 'production'
    }

    // Rebuild form fields and signature
    const formFields: Record<string, string> = {
      merchant_id: sepayConfig.merchant_id,
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: order.order_invoice_number,
      order_amount: Math.round(order.amount).toString(),
      currency: order.currency || 'VND',
      order_description: `FairPay payment ${order.order_invoice_number}`,
      customer_id: order.payer_user_id,
      success_url: order.sepay_checkout_url?.includes('success') ? order.sepay_checkout_url : `https://long-pay.vercel.app/payments/sepay/success?invoice=${order.order_invoice_number}`,
      error_url: `https://long-pay.vercel.app/payments/sepay/error?invoice=${order.order_invoice_number}`,
      cancel_url: `https://long-pay.vercel.app/payments/sepay/cancel?invoice=${order.order_invoice_number}`,
      custom_data: order.custom_data || '',
    }

    const signatureString = [
      formFields.operation,
      formFields.payment_method,
      formFields.order_invoice_number,
      formFields.order_amount,
      formFields.currency,
      formFields.order_description,
      formFields.customer_id,
      formFields.success_url,
      formFields.error_url,
      formFields.cancel_url,
      formFields.custom_data,
    ].join('')

    const encoder = new TextEncoder()
    const keyData = encoder.encode(sepayConfig.secret_key)
    const msgData = encoder.encode(signatureString)
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    formFields.signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const formAction = sepayConfig.environment === 'production'
      ? SEPAY_PRODUCTION_URL
      : SEPAY_SANDBOX_URL

    const html = buildCheckoutHtml(formAction, formFields)
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action https://pay.sepay.vn https://sandbox.pay.sepay.vn; img-src 'self' data:",
      },
    })
  }

  // POST mode: create order and return checkout URL
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: CreateOrderRequest = await req.json()
    const { source_type, source_id, payee_user_id, amount, currency, description } = body

    if (!source_type || !source_id || !payee_user_id || !amount || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be positive' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch payee's SePay config
    const { data: payeeSettings, error: settingsError } = await serviceClient
      .from('user_settings')
      .select('sepay_config')
      .eq('user_id', payee_user_id)
      .single()

    if (settingsError || !payeeSettings?.sepay_config) {
      return new Response(JSON.stringify({ error: 'Payee has not configured SePay' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sepayConfig = payeeSettings.sepay_config as {
      merchant_id: string
      secret_key: string
      environment: 'sandbox' | 'production'
    }

    if (!sepayConfig.merchant_id || !sepayConfig.secret_key) {
      return new Response(JSON.stringify({ error: 'Payee SePay config incomplete' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const invoiceNumber = `FP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const customData = `${source_type}|${source_id}|${user.id}|${Date.now()}`

    const baseUrl = body.success_url?.replace(/\/[^/]*$/, '') || 'https://long-pay.vercel.app'
    const successUrl = body.success_url || `${baseUrl}/payments/sepay/success?invoice=${invoiceNumber}`
    const errorUrl = body.error_url || `${baseUrl}/payments/sepay/error?invoice=${invoiceNumber}`
    const cancelUrl = body.cancel_url || `${baseUrl}/payments/sepay/cancel?invoice=${invoiceNumber}`

    // Store order in database
    const { data: order, error: insertError } = await serviceClient
      .from('sepay_payment_orders')
      .insert({
        order_invoice_number: invoiceNumber,
        source_type,
        source_id,
        payer_user_id: user.id,
        payee_user_id,
        amount: Math.round(amount),
        currency: currency || 'VND',
        status: 'PENDING',
        sepay_checkout_url: successUrl,
        custom_data: customData,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting order:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create order record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build checkout URL: points to this same edge function in GET mode
    const checkoutUrl = `${supabaseUrl}/functions/v1/sepay-create-order?order_id=${order.id}`

    console.log('Order created:', invoiceNumber, 'checkout:', checkoutUrl)

    return new Response(JSON.stringify({
      success: true,
      order: {
        id: order.id,
        invoice_number: invoiceNumber,
        amount: Math.round(amount),
        currency: currency || 'VND',
        status: 'PENDING',
      },
      checkout_url: checkoutUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})