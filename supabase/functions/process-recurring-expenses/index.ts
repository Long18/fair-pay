import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringExpense {
  id: string
  template_expense_id: string
  frequency: string
  interval_value: number
  next_occurrence: string
  context_type: 'group' | 'friend'
  group_id: string | null
  friendship_id: string | null
  created_by: string
  prepaid_until: string | null
  end_date: string | null
}

interface ProcessingResults {
  processed: number
  created: number
  skipped: number
  deactivated: number
  prepaid_consumed: number
  errors: string[]
  details: Array<{
    recurring_id: string
    cycle_date: string
    action: string
    instance_id?: string
  }>
}

/**
 * Process Recurring Expenses Edge Function
 *
 * Called via cron (daily recommended) or manually.
 * For each due recurring expense:
 *   1. Handles multi-cycle catch-up (if system was down)
 *   2. Calls process_single_recurring_instance() SQL function for each cycle
 *   3. The SQL function atomically handles:
 *      - Idempotency (no duplicate instances)
 *      - Expense creation with recurring_expense_id + cycle_date
 *      - Split copying with payer auto-settlement
 *      - Prepaid balance consumption
 *      - next_occurrence advancement
 *      - Deactivation when past end_date
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting recurring expense processing...')

    // Fetch all active recurring expenses that are due
    const { data: dueRecurring, error: fetchError } = await supabase
      .rpc('get_due_recurring_expenses')

    if (fetchError) {
      throw new Error(`Failed to fetch due recurring expenses: ${fetchError.message}`)
    }

    if (!dueRecurring || dueRecurring.length === 0) {
      console.log('No recurring expenses due for creation')
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          created: 0,
          skipped: 0,
          message: 'No recurring expenses due'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${dueRecurring.length} recurring expenses due for creation`)

    const results: ProcessingResults = {
      processed: 0,
      created: 0,
      skipped: 0,
      deactivated: 0,
      prepaid_consumed: 0,
      errors: [],
      details: []
    }

    const today = new Date().toISOString().split('T')[0]

    for (const recurring of dueRecurring as RecurringExpense[]) {
      try {
        results.processed++

        // Multi-cycle catch-up: process all missed cycles sequentially
        // The SQL function handles idempotency, so re-running is safe
        let currentCycleDate = recurring.next_occurrence
        const MAX_CATCHUP_CYCLES = 52 // Safety limit: max 1 year of weekly cycles

        let cyclesProcessed = 0

        while (currentCycleDate <= today && cyclesProcessed < MAX_CATCHUP_CYCLES) {
          // Call the atomic SQL function for this cycle
          const { data: result, error: processError } = await supabase
            .rpc('process_single_recurring_instance', {
              p_recurring_expense_id: recurring.id,
              p_cycle_date: currentCycleDate
            })

          if (processError) {
            const errorMsg = `Error processing recurring ${recurring.id} cycle ${currentCycleDate}: ${processError.message}`
            console.error(errorMsg)
            results.errors.push(errorMsg)
            break // Stop processing this recurring expense on error
          }

          if (result) {
            const resultObj = typeof result === 'string' ? JSON.parse(result) : result

            if (!resultObj.success) {
              const errorMsg = `Failed to process recurring ${recurring.id}: ${resultObj.error}`
              console.error(errorMsg)
              results.errors.push(errorMsg)
              break
            }

            if (resultObj.skipped) {
              console.log(`Skipped cycle ${currentCycleDate} for recurring ${recurring.id}: ${resultObj.reason}`)
              results.skipped++
              results.details.push({
                recurring_id: recurring.id,
                cycle_date: currentCycleDate,
                action: 'skipped'
              })
            } else {
              console.log(`Created instance ${resultObj.instance_id} for recurring ${recurring.id} cycle ${currentCycleDate}`)
              results.created++
              results.details.push({
                recurring_id: recurring.id,
                cycle_date: currentCycleDate,
                action: 'created',
                instance_id: resultObj.instance_id
              })

              // Track prepaid consumption
              if (resultObj.prepaid_consumed?.total_consumed > 0) {
                results.prepaid_consumed++
              }

              // Track deactivation
              if (resultObj.deactivated) {
                results.deactivated++
                break // No more cycles to process
              }
            }
          }

          // Calculate next cycle date for catch-up loop
          const { data: nextDate, error: calcError } = await supabase
            .rpc('calculate_next_occurrence', {
              p_current_date: currentCycleDate,
              p_frequency: recurring.frequency,
              p_interval_value: recurring.interval_value
            })

          if (calcError) {
            console.error(`Failed to calculate next occurrence: ${calcError.message}`)
            break
          }

          currentCycleDate = nextDate

          // Check end_date
          if (recurring.end_date && currentCycleDate > recurring.end_date) {
            break
          }

          cyclesProcessed++
        }

        if (cyclesProcessed >= MAX_CATCHUP_CYCLES) {
          console.warn(`Hit max catch-up limit for recurring ${recurring.id}`)
          results.errors.push(`Recurring ${recurring.id}: hit max catch-up limit of ${MAX_CATCHUP_CYCLES} cycles`)
        }

      } catch (error) {
        const errorMessage = `Error processing recurring expense ${recurring.id}: ${(error as Error).message}`
        console.error(errorMessage)
        results.errors.push(errorMessage)
      }
    }

    console.log('Recurring expense processing complete:', {
      processed: results.processed,
      created: results.created,
      skipped: results.skipped,
      deactivated: results.deactivated,
      prepaid_consumed: results.prepaid_consumed,
      errors: results.errors.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
