/**
 * SePay Create Order Edge Function
 *
 * Generates signed form fields for SePay checkout.
 * Frontend auto-submits a hidden form to SePay's endpoint.
 * CSP form-action whitelist in vercel.json allows this.
 * SECRET_KEY never leaves the server.
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

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

    // Build form fields in exact order required by SePay for signature
    const formFields: Record<string, string> = {
      merchant_id: sepayConfig.merchant_id,
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: Math.round(amount).toString(),
      currency: currency || 'VND',
      order_description: description || `FairPay payment ${invoiceNumber}`,
      customer_id: user.id,
      success_url: successUrl,
      error_url: errorUrl,
      cancel_url: cancelUrl,
      custom_data: customData,
    }

    // HMAC-SHA256 signature (fields excluding merchant_id and signature)
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
        sepay_checkout_url: formAction,
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

    console.log('Order created:', invoiceNumber, 'env:', sepayConfig.environment)

    return new Response(JSON.stringify({
      success: true,
      order: {
        id: order.id,
        invoice_number: invoiceNumber,
        amount: Math.round(amount),
        currency: currency || 'VND',
        status: 'PENDING',
      },
      form_action: formAction,
      form_fields: formFields,
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