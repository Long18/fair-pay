/**
 * SePay Create Order Edge Function
 *
 * Creates a SePay checkout order by:
 * 1. Generating HMAC-SHA256 signed form fields
 * 2. POSTing form-encoded data to SePay server-side
 * 3. Capturing the redirect URL from SePay's 302 response
 * 4. Returning checkout_url to frontend for window.open()
 *
 * This avoids CSP form-action restrictions on Vercel.
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

    // Get current user
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

    // Generate unique invoice number
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

    // Generate HMAC-SHA256 signature
    // Concatenate field values in exact order (excluding merchant_id and signature)
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
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    formFields.signature = signature

    const sepayUrl = sepayConfig.environment === 'production'
      ? SEPAY_PRODUCTION_URL
      : SEPAY_SANDBOX_URL

    // POST form-encoded data to SePay server-side to capture redirect URL
    // This avoids CSP form-action restrictions on Vercel
    const formBody = new URLSearchParams(formFields).toString()

    let checkoutUrl: string | null = null
    try {
      const sepayResponse = await fetch(sepayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
        redirect: 'manual', // Don't follow redirects — capture Location header
      })

      // SePay returns 302 redirect to the payment page
      if (sepayResponse.status >= 300 && sepayResponse.status < 400) {
        checkoutUrl = sepayResponse.headers.get('Location')
      } else if (sepayResponse.ok) {
        // Some endpoints return 200 with the URL in the body or as final URL
        // Try to extract from response
        const responseText = await sepayResponse.text()
        // If it's a URL, use it directly
        if (responseText.startsWith('http')) {
          checkoutUrl = responseText.trim()
        } else {
          // Try parsing as JSON
          try {
            const json = JSON.parse(responseText)
            checkoutUrl = json.checkout_url || json.url || json.redirect_url || null
          } catch {
            console.log('SePay response (not JSON):', responseText.slice(0, 500))
          }
        }
      }

      if (!checkoutUrl) {
        console.error('SePay did not return redirect. Status:', sepayResponse.status)
        console.error('Headers:', Object.fromEntries(sepayResponse.headers.entries()))
        // Fallback: return the form data so frontend can try alternative approaches
      }
    } catch (fetchError) {
      console.error('Error posting to SePay:', fetchError)
      // Non-fatal: we still have the order, just no checkout URL
    }

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
        sepay_checkout_url: checkoutUrl || sepayUrl,
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

    console.log('Order created:', invoiceNumber, 'checkout_url:', checkoutUrl ? 'captured' : 'fallback')

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
      // Keep form data as fallback
      form_action: sepayUrl,
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