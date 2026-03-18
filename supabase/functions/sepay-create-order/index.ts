/**
 * SePay Create Order Edge Function
 *
 * QR Bank Transfer flow:
 * 1. Creates payment order in DB
 * 2. Fetches payee's bank info from sepay_config
 * 3. Generates QR URL from qr.sepay.vn with payment code
 * 4. Returns QR URL + payment code to frontend
 *
 * User scans QR → transfers → SePay webhook confirms payment.
 * No HMAC signature needed — QR is just a VietQR image.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const QR_BASE_URL = 'https://qr.sepay.vn/img'

interface CreateOrderRequest {
  source_type: 'DEBT' | 'EXPENSE'
  source_id: string
  payee_user_id: string
  amount: number
  currency: string
  description: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
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
        headers: getCorsHeaders(),
      })
    }

    const body: CreateOrderRequest = await req.json()
    const { source_type, source_id, payee_user_id, amount, currency } = body

    if (!source_type || !source_id || !payee_user_id || !amount || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be positive' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    // Fetch payee's SePay config (bank account info)
    const { data: payeeSettings, error: settingsError } = await serviceClient
      .from('user_settings')
      .select('sepay_config')
      .eq('user_id', payee_user_id)
      .single()

    if (settingsError || !payeeSettings?.sepay_config) {
      return new Response(JSON.stringify({ error: 'Payee has not configured SePay' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    const sepayConfig = payeeSettings.sepay_config as {
      bank_account_number: string
      bank_name: string
      api_token?: string
      account_holder_name?: string
    }

    if (!sepayConfig.bank_account_number || !sepayConfig.bank_name) {
      return new Response(JSON.stringify({ error: 'Payee SePay bank config incomplete' }), {
        status: 400,
        headers: getCorsHeaders(),
      })
    }

    // Generate unique payment code for matching webhook
    const paymentCode = `FP${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().slice(0, 4).toUpperCase()}`
    const roundedAmount = Math.round(amount)

    // Build QR URL
    const qrParams = new URLSearchParams({
      acc: sepayConfig.bank_account_number,
      bank: sepayConfig.bank_name,
      amount: roundedAmount.toString(),
      des: paymentCode,
    })
    const qrUrl = `${QR_BASE_URL}?${qrParams.toString()}`

    // Store order in database
    const { data: order, error: insertError } = await serviceClient
      .from('sepay_payment_orders')
      .insert({
        order_invoice_number: paymentCode,
        source_type,
        source_id,
        payer_user_id: user.id,
        payee_user_id,
        amount: roundedAmount,
        currency: currency || 'VND',
        status: 'PENDING',
        sepay_checkout_url: qrUrl,
        custom_data: `${source_type}|${source_id}|${user.id}`,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting order:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create order record' }), {
        status: 500,
        headers: getCorsHeaders(),
      })
    }

    console.log('QR order created:', paymentCode, 'bank:', sepayConfig.bank_name)

    return new Response(JSON.stringify({
      success: true,
      order: {
        id: order.id,
        invoice_number: paymentCode,
        amount: roundedAmount,
        currency: currency || 'VND',
        status: 'PENDING',
      },
      qr_url: qrUrl,
      payment_code: paymentCode,
    }), {
      status: 200,
      headers: getCorsHeaders(),
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: getCorsHeaders(),
    })
  }
})
