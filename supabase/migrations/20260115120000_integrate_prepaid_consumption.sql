-- Migration: Integrate Prepaid Consumption with Instance Generation
-- Description: Documentation and helper for integrating prepaid consumption
-- Requirements: Automatic consumption when recurring instances are generated

-- ========================================
-- INTEGRATION NOTES
-- ========================================

/*
INTEGRATION POINT: Recurring Instance Generation

When a recurring expense instance is created (either via cron, scheduled job, or manual trigger),
the consume_prepaid_for_instance() function MUST be called immediately after creating the instance.

EXAMPLE INTEGRATION (Pseudocode):

1. If recurring instance generation happens in SQL function:

   CREATE OR REPLACE FUNCTION create_recurring_instance(p_recurring_id UUID)
   RETURNS UUID AS $$
   DECLARE
     v_instance_id UUID;
   BEGIN
     -- Create instance expense
     INSERT INTO expenses (...)
     SELECT ... FROM expenses WHERE id = (template_expense_id)
     RETURNING id INTO v_instance_id;

     -- Copy splits
     INSERT INTO expense_splits (...)
     SELECT ... FROM expense_splits WHERE expense_id = (template_expense_id);

     -- **NEW: Consume prepaid**
     PERFORM consume_prepaid_for_instance(v_instance_id);

     -- Update next_occurrence
     UPDATE recurring_expenses SET next_occurrence = calculate_next_occurrence(...);

     RETURN v_instance_id;
   END;
   $$ LANGUAGE plpgsql;

2. If recurring instance generation happens in application code:

   async function createRecurringInstance(recurringId: string) {
     // Create instance expense
     const { data: instance } = await supabase
       .from('expenses')
       .insert({ ... })
       .select()
       .single();

     // Copy splits
     await supabase
       .from('expense_splits')
       .insert(splits);

     // **NEW: Consume prepaid**
     await supabase.rpc('consume_prepaid_for_instance', {
       p_expense_instance_id: instance.id
     });

     // Update next_occurrence
     await supabase
       .from('recurring_expenses')
       .update({ next_occurrence: nextDate })
       .eq('id', recurringId);
   }

TESTING:
- Create recurring expense with 4 members
- Member A prepays 5 months using record_member_prepaid()
- Generate instance (trigger your generation logic)
- Verify Member A's split is marked settled
- Verify Member A's balance reduced by monthly_share
- Verify consumption logged in prepaid_consumption_log
*/

-- ========================================
-- HELPER FUNCTION: Manual Instance Creation (For Testing)
-- ========================================

CREATE OR REPLACE FUNCTION create_recurring_instance_manual(
  p_recurring_expense_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_recurring RECORD;
  v_template RECORD;
  v_instance_id UUID;
  v_consume_result JSONB;
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get recurring expense
  SELECT * INTO v_recurring
  FROM recurring_expenses
  WHERE id = p_recurring_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring expense not found';
  END IF;

  -- Get template expense
  SELECT * INTO v_template
  FROM expenses
  WHERE id = v_recurring.template_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template expense not found';
  END IF;

  -- Create instance expense
  INSERT INTO expenses (
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    is_payment,
    context_type,
    group_id,
    friendship_id,
    recurring_expense_id,
    created_by
  ) VALUES (
    v_template.description,
    v_template.amount,
    v_template.currency,
    v_template.category,
    CURRENT_DATE,
    v_template.paid_by_user_id,
    v_template.is_payment,
    v_template.context_type,
    v_template.group_id,
    v_template.friendship_id,
    p_recurring_expense_id,
    v_current_user
  ) RETURNING id INTO v_instance_id;

  -- Copy expense splits from template
  INSERT INTO expense_splits (
    expense_id,
    user_id,
    split_method,
    split_value,
    computed_amount,
    is_settled,
    settled_amount
  )
  SELECT
    v_instance_id,
    es.user_id,
    es.split_method,
    es.split_value,
    es.computed_amount,
    false, -- Will be updated by consume_prepaid if applicable
    0
  FROM expense_splits es
  WHERE es.expense_id = v_recurring.template_expense_id;

  -- **CRITICAL: Consume prepaid for this instance**
  v_consume_result := consume_prepaid_for_instance(v_instance_id);

  RETURN jsonb_build_object(
    'success', true,
    'instance_id', v_instance_id,
    'recurring_id', p_recurring_expense_id,
    'prepaid_consumed', v_consume_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_recurring_instance_manual(UUID) TO authenticated;

COMMENT ON FUNCTION create_recurring_instance_manual(UUID) IS
'Manual function to create a recurring instance for testing.
Automatically consumes prepaid balances.
DO NOT USE IN PRODUCTION - for testing only.';
