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

interface TemplateExpense {
  id: string
  description: string
  amount: number
  currency: string
  category: string
  paid_by_user_id: string
  context_type: string
  group_id: string | null
  friendship_id: string | null
}

interface ExpenseSplit {
  user_id: string
  split_method: string
  split_value: number
  computed_amount: number
}

interface ProcessingResults {
  processed: number
  created: number
  skipped: number
  deactivated: number
  errors: string[]
}

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

    const { data: dueRecurring, error: fetchError } = await supabase
      .rpc('get_due_recurring_expenses')

    if (fetchError) {
      throw new Error(`Failed to fetch due recurring expenses: ${fetchError.message}`)
    }

    if (!dueRecurring || dueRecurring.length === 0) {
      console.log('No recurring expenses due for creation')
      return new Response(
        JSON.stringify({ success: true, processed: 0, skipped: 0, message: 'No recurring expenses due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${dueRecurring.length} recurring expenses due for creation`)

    const results: ProcessingResults = {
      processed: 0,
      created: 0,
      skipped: 0,
      deactivated: 0,
      errors: []
    }

    for (const recurring of dueRecurring as RecurringExpense[]) {
      try {
        results.processed++

        // Check if this period is covered by prepaid payment (Requirements 3.1, 3.2)
        if (recurring.prepaid_until) {
          const prepaidUntil = new Date(recurring.prepaid_until)
          const nextOccurrence = new Date(recurring.next_occurrence)
          
          if (nextOccurrence <= prepaidUntil) {
            // Skip this period - it's prepaid (Requirement 3.2)
            // Advance next_occurrence to first uncovered period (Requirement 3.3)
            let newNextOccurrence = nextOccurrence
            
            while (newNextOccurrence <= prepaidUntil) {
              const { data: nextDate, error: calcError } = await supabase
                .rpc('calculate_next_occurrence', {
                  p_current_date: newNextOccurrence.toISOString().split('T')[0],
                  p_frequency: recurring.frequency,
                  p_interval_value: recurring.interval_value
                })
              
              if (calcError) {
                throw new Error(`Failed to calculate next occurrence: ${calcError.message}`)
              }
              
              newNextOccurrence = new Date(nextDate)
            }
            
            // Check if we should deactivate (past end_date)
            const updates: Record<string, unknown> = {
              next_occurrence: newNextOccurrence.toISOString().split('T')[0]
            }
            
            if (recurring.end_date && newNextOccurrence > new Date(recurring.end_date)) {
              updates.is_active = false
              results.deactivated++
              console.log(`Deactivated recurring ${recurring.id} - next occurrence past end_date`)
            }
            
            // Update next_occurrence to first uncovered period
            const { error: updateError } = await supabase
              .from('recurring_expenses')
              .update(updates)
              .eq('id', recurring.id)
            
            if (updateError) {
              console.error(`Failed to update recurring expense ${recurring.id}: ${updateError.message}`)
            }
            
            console.log(`Skipped prepaid period for recurring ${recurring.id}, advanced to ${newNextOccurrence.toISOString().split('T')[0]}`)
            results.skipped++
            continue
          }
        }

        // Normal expense creation flow (Requirement 3.5 - resume normal generation)
        const { data: templateExpense, error: templateError } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', recurring.template_expense_id)
          .single()

        if (templateError || !templateExpense) {
          throw new Error(`Template expense not found: ${recurring.template_expense_id}`)
        }

        const { data: templateSplits, error: splitsError } = await supabase
          .from('expense_splits')
          .select('*')
          .eq('expense_id', recurring.template_expense_id)

        if (splitsError || !templateSplits) {
          throw new Error(`Template splits not found: ${recurring.template_expense_id}`)
        }

        const { data: newExpense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            description: templateExpense.description,
            amount: templateExpense.amount,
            currency: templateExpense.currency,
            category: templateExpense.category,
            expense_date: recurring.next_occurrence,
            paid_by_user_id: templateExpense.paid_by_user_id,
            is_payment: false,
            context_type: recurring.context_type,
            group_id: recurring.group_id,
            friendship_id: recurring.friendship_id,
            created_by: recurring.created_by
          })
          .select()
          .single()

        if (expenseError || !newExpense) {
          throw new Error(`Failed to create expense: ${expenseError?.message}`)
        }

        const newSplits = (templateSplits as ExpenseSplit[]).map(split => ({
          expense_id: newExpense.id,
          user_id: split.user_id,
          split_method: split.split_method,
          split_value: split.split_value,
          computed_amount: split.computed_amount
        }))

        const { error: splitsInsertError } = await supabase
          .from('expense_splits')
          .insert(newSplits)

        if (splitsInsertError) {
          await supabase.from('expenses').delete().eq('id', newExpense.id)
          throw new Error(`Failed to create splits: ${splitsInsertError.message}`)
        }

        const { data: nextDate } = await supabase
          .rpc('calculate_next_occurrence', {
            p_current_date: recurring.next_occurrence,
            p_frequency: recurring.frequency,
            p_interval_value: recurring.interval_value
          })

        const updates: Record<string, unknown> = {
          next_occurrence: nextDate,
          last_created_at: new Date().toISOString()
        }

        const shouldDeactivate = recurring.end_date && new Date(nextDate) > new Date(recurring.end_date)
        if (shouldDeactivate) {
          updates.is_active = false
          results.deactivated++
        }

        const { error: updateError } = await supabase
          .from('recurring_expenses')
          .update(updates)
          .eq('id', recurring.id)

        if (updateError) {
          console.error(`Failed to update recurring expense ${recurring.id}: ${updateError.message}`)
        }

        console.log(`Created expense ${newExpense.id} from recurring ${recurring.id}`)
        results.created++

      } catch (error) {
        const errorMessage = `Error processing recurring expense ${recurring.id}: ${(error as Error).message}`
        console.error(errorMessage)
        results.errors.push(errorMessage)
      }
    }

    console.log('Recurring expense processing complete:', results)

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
