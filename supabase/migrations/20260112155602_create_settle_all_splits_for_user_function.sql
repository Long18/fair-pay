-- ========================================
-- Migration: Create settle_all_splits_for_user function
-- Purpose: Settle all unpaid splits for a specific user (profile-based, not relationship-based)
-- Requirements: Profile page "settle all" functionality - only settle the profile user's splits
-- ========================================

-- =============================================
-- settle_all_splits_for_user() - Settle all unpaid splits for a specific user
-- =============================================
CREATE OR REPLACE FUNCTION settle_all_splits_for_user(
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user_id UUID;
  v_split RECORD;
  v_splits_updated INTEGER := 0;
  v_already_paid INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_split_ids UUID[] := ARRAY[]::UUID[];
  v_audit_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate target user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Count already paid splits for the target user
  SELECT COUNT(*) INTO v_already_paid
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE es.user_id = p_user_id
  AND NOT e.is_payment
  AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
  AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
  AND es.is_settled = true
  AND COALESCE(es.settled_amount, 0) >= es.computed_amount - 0.01;

  -- Process each unpaid or partially paid split for the target user
  FOR v_split IN 
    SELECT es.*, e.currency, e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = p_user_id
    AND NOT e.is_payment
    AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
    AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
    AND (
      es.is_settled = false 
      OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01
    )
  LOOP
    -- Calculate remaining amount to settle
    DECLARE
      v_remaining_amount DECIMAL;
      v_event_id UUID;
    BEGIN
      v_remaining_amount := v_split.computed_amount - COALESCE(v_split.settled_amount, 0);
      
      -- Update split to fully settled
      UPDATE expense_splits
      SET 
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.id;

      -- Insert payment event for this split
      INSERT INTO payment_events (
        expense_id,
        split_id,
        event_type,
        from_user_id,
        to_user_id,
        amount,
        currency,
        method,
        actor_user_id,
        metadata,
        created_at
      ) VALUES (
        v_split.expense_id,
        v_split.id,
        'settle_all_user_splits',
        v_split.user_id,                    -- from: the person who owed
        v_split.paid_by_user_id,            -- to: the person who paid
        v_remaining_amount,                 -- remaining amount settled
        v_split.currency,
        'manual',
        v_current_user_id,                  -- actor: current user (who triggered the action)
        jsonb_build_object(
          'previous_settled_amount', COALESCE(v_split.settled_amount, 0),
          'new_settled_amount', v_split.computed_amount,
          'computed_amount', v_split.computed_amount,
          'target_user_id', p_user_id,
          'bulk_operation', true,
          'profile_based', true
        ),
        NOW()
      ) RETURNING id INTO v_event_id;

      -- Track for summary
      v_splits_updated := v_splits_updated + 1;
      v_total_amount := v_total_amount + v_remaining_amount;
      v_split_ids := array_append(v_split_ids, v_split.id);
    END;
  END LOOP;

  -- Write audit trail record
  v_audit_id := write_audit_trail(
    'settle_all_user_splits',
    p_user_id,
    'user',
    jsonb_build_object(
      'splitsUpdated', v_splits_updated,
      'alreadyPaid', v_already_paid,
      'totalAmount', v_total_amount,
      'splitIds', v_split_ids,
      'targetUserId', p_user_id,
      'actorUserId', v_current_user_id
    )
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'splits_updated', v_splits_updated,
    'already_paid', v_already_paid,
    'total_amount', v_total_amount,
    'audit_id', v_audit_id,
    'split_ids', v_split_ids
  );
END;
$$;

COMMENT ON FUNCTION settle_all_splits_for_user(UUID) IS 
'Settle all unpaid splits for a SPECIFIC USER (profile-based operation).
Only settles splits where the target user is the debtor (es.user_id = p_user_id).
Does NOT affect other participants in the same transactions.
Can be called by any authenticated user (e.g., admin settling a user''s profile).
Creates individual payment_event records for each split settled.
Writes audit trail record for the bulk operation. Returns summary with counts and amounts.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION settle_all_splits_for_user(UUID) TO authenticated;
