/**
 * SePay Webhook Edge Function
 *
 * Receives bank transaction notifications from SePay.
 * When money comes in, SePay sends transaction data.
 * We match the payment code in `content` field to our orders.
 * On match: mark order PAID + settle corresponding splits.
 *
 * SePay webhook payload:
 * {id, gateway, transactionDate, accountNumber, code, content,
 *  transferType, transferAmount, accumulated, subAccount,
 *  referenceCode, description}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SepayWebhookPayload {
  id: number
  gateway: string
  transactionDate: string
  accountNumber: string
  code: string | null
  content: string
  transferType: 'in' | 'out'
  transferAmount: number
  accumulated: number
  subAccount: string | null
  referenceCode: string
  description: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const payload: SepayWebhookPayload = await req.json()
    console.log('SePay webhook received:', JSON.stringify(payload))

    // Only process incoming transfers
    if (payload.transferType !== 'in') {
      console.log('Ignoring outgoing transfer')
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.content && !payload.code) {
      console.log('No content or code in webhook, skipping')
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract payment code from content
    // Our payment codes start with "FP" followed by alphanumeric chars
    const contentUpper = (payload.content || '').toUpperCase()
    const codeMatch = contentUpper.match(/FP[A-Z0-9]{8,}/)
    const detectedCode = payload.code || (codeMatch ? codeMatch[0] : null)

    if (!detectedCode) {
      console.log('No FP payment code found in content:', payload.content)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Detected payment code:', detectedCode)

    // Find matching pending order
    const { data: order, error: orderError } = await serviceClient
      .from('sepay_payment_orders')
      .select('*')
      .eq('order_invoice_number', detectedCode)
      .eq('status', 'PENDING')
      .single()

    if (orderError || !order) {
      console.log('No pending order found for code:', detectedCode)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate amount (allow small rounding differences)
    if (Math.abs(payload.transferAmount - order.amount) > 1) {
      console.error('Amount mismatch:', {
        expected: order.amount,
        received: payload.transferAmount,
      })
      // Still store webhook data for audit
      await serviceClient
        .from('sepay_payment_orders')
        .update({
          webhook_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotency check
    if (order.status === 'PAID') {
      console.log('Order already paid:', detectedCode)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark order as PAID
    await serviceClient
      .from('sepay_payment_orders')
      .update({
        status: 'PAID',
        webhook_payload: payload,
        webhook_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    // Settle splits
    if (order.source_type === 'EXPENSE') {
      await settleExpenseSplits(serviceClient, order)
    } else if (order.source_type === 'DEBT') {
      await settleDebtSplits(serviceClient, order)
    }

    console.log('Order settled:', detectedCode, 'amount:', payload.transferAmount)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})


/**
 * Settle expense splits for a specific expense payment.
 */
async function settleExpenseSplits(client: any, order: any) {
  try {
    const { data: splits, error } = await client
      .from('expense_splits')
      .select('id, computed_amount, settled_amount, is_settled')
      .eq('expense_id', order.source_id)
      .eq('user_id', order.payer_user_id)
      .eq('is_settled', false)

    if (error) {
      console.error('Error finding expense splits:', error)
      return
    }

    for (const split of (splits || [])) {
      await client
        .from('expense_splits')
        .update({
          is_settled: true,
          settled_amount: split.computed_amount,
          settled_at: new Date().toISOString(),
        })
        .eq('id', split.id)
    }

    console.log(`Settled ${splits?.length || 0} expense splits for ${order.order_invoice_number}`)
  } catch (err) {
    console.error('Error settling expense splits:', err)
  }
}

/**
 * Settle debt splits between payer and payee.
 */
async function settleDebtSplits(client: any, order: any) {
  try {
    const { data: splits, error } = await client
      .from('expense_splits')
      .select('id, expense_id, computed_amount, settled_amount, is_settled, expenses!inner(paid_by_user_id)')
      .eq('user_id', order.payer_user_id)
      .eq('is_settled', false)
      .eq('expenses.paid_by_user_id', order.payee_user_id)

    if (error) {
      console.error('Error finding debt splits:', error)
      return
    }

    let totalSettled = 0
    let remainingBudget = order.amount

    for (const split of (splits || [])) {
      if (remainingBudget <= 0) break

      const splitRemaining = split.computed_amount - (split.settled_amount || 0)
      const settleAmount = Math.min(splitRemaining, remainingBudget)
      const newSettledAmount = (split.settled_amount || 0) + settleAmount
      const isFullySettled = newSettledAmount >= split.computed_amount

      await client
        .from('expense_splits')
        .update({
          is_settled: isFullySettled,
          settled_amount: newSettledAmount,
          settled_at: new Date().toISOString(),
        })
        .eq('id', split.id)

      remainingBudget -= settleAmount
      totalSettled++
    }

    console.log(`Settled ${totalSettled} debt splits for ${order.order_invoice_number}`)
  } catch (err) {
    console.error('Error settling debt splits:', err)
  }
}
