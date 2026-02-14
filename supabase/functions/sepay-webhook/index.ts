/**
 * SePay Webhook (IPN) Edge Function
 *
 * Receives payment notifications from SePay.
 * On ORDER_PAID: marks order as PAID, settles corresponding splits.
 * Idempotent: duplicate notifications are safely ignored.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Webhook must be POST
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

    const payload = await req.json()
    console.log('SePay webhook received:', JSON.stringify(payload))

    const notificationType = payload?.notification_type
    const orderData = payload?.order

    if (!notificationType || !orderData) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const invoiceNumber = orderData?.order_invoice_number
    if (!invoiceNumber) {
      return new Response(JSON.stringify({ success: false, error: 'Missing invoice number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find the order
    const { data: order, error: orderError } = await serviceClient
      .from('sepay_payment_orders')
      .select('*')
      .eq('order_invoice_number', invoiceNumber)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', invoiceNumber, orderError)
      return new Response(JSON.stringify({ success: false, error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Store raw webhook payload for audit
    await serviceClient
      .from('sepay_payment_orders')
      .update({
        webhook_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    // Idempotency: if already PAID, return success without re-processing
    if (order.status === 'PAID') {
      console.log('Order already paid, skipping:', invoiceNumber)
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (notificationType === 'ORDER_PAID') {
      // Validate paid amount matches expected
      const paidAmount = parseFloat(orderData?.order_amount || '0')
      if (paidAmount > 0 && Math.abs(paidAmount - order.amount) > 1) {
        console.error('Amount mismatch:', { expected: order.amount, received: paidAmount })
        await serviceClient
          .from('sepay_payment_orders')
          .update({
            status: 'FAILED',
            webhook_processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        return new Response(JSON.stringify({ success: false, error: 'Amount mismatch' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Mark order as PAID
      await serviceClient
        .from('sepay_payment_orders')
        .update({
          status: 'PAID',
          webhook_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // Apply settlement based on source_type
      if (order.source_type === 'EXPENSE') {
        // Settle the specific expense split for the payer
        await settleExpenseSplits(serviceClient, order)
      } else if (order.source_type === 'DEBT') {
        // Settle all unsettled splits between payer and payee
        await settleDebtSplits(serviceClient, order)
      }

      console.log('Order settled successfully:', invoiceNumber)
    } else if (notificationType === 'ORDER_CANCELLED') {
      await serviceClient
        .from('sepay_payment_orders')
        .update({
          status: 'CANCELLED',
          webhook_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
    } else if (notificationType === 'ORDER_FAILED') {
      await serviceClient
        .from('sepay_payment_orders')
        .update({
          status: 'FAILED',
          webhook_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Settle expense splits for a specific expense payment.
 * source_id is the expense_id.
 */
async function settleExpenseSplits(client: any, order: any) {
  try {
    // Find the payer's unsettled split for this expense
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

    console.log(`Settled ${splits?.length || 0} expense splits for order ${order.order_invoice_number}`)
  } catch (err) {
    console.error('Error settling expense splits:', err)
  }
}

/**
 * Settle debt splits between payer and payee.
 * source_id is the counterparty user_id (the payee).
 * Settles all unsettled splits where payer owes payee.
 */
async function settleDebtSplits(client: any, order: any) {
  try {
    // Find all unsettled splits where:
    // - The expense was paid by the payee (order.payee_user_id)
    // - The split belongs to the payer (order.payer_user_id)
    // - The split is not yet settled
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

    console.log(`Settled ${totalSettled} debt splits for order ${order.order_invoice_number}`)
  } catch (err) {
    console.error('Error settling debt splits:', err)
  }
}
