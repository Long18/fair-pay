-- Migration: Fix authorization checks in settle functions
-- Date: 2026-02-26
-- Purpose: Add proper payer/admin authorization to settle_splits_batch,
--          settle_all_splits_for_user, and settle_all_debts_with_person
--
-- SECURITY FIX: Previously, any authenticated user could settle any splits.
-- Now only the payer (paid_by_user_id) or system admin can settle.

-- =============================================
-- 1. Fix settle_splits_batch - Add payer/admin check
-- =============================================
CREATE OR REPLACE FUNCTION public.settle_splits_batch(
  p_split_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user_id UUID;
  v_is_system_admin BOOLEAN;
  v_unauthorized_count INTEGER;
  v_updated INTEGER := 0;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- If not admin, verify the current user is the payer for ALL splits
  IF NOT v_is_system_admin THEN
    SELECT COUNT(*) INTO v_unauthorized_count
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.id = ANY(p_split_ids)
      AND e.paid_by_user_id != v_current_user_id;

    IF v_unauthorized_count > 0 THEN
      RAISE EXCEPTION 'Only the payer or admin can settle splits';
    END IF;
  END IF;

  UPDATE expense_splits
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  WHERE id = ANY(p_split_ids)
    AND (is_settled = false OR COALESCE(settled_amount, 0) < computed_amount - 0.01);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'splits_updated', v_updated
  );
END;
$$;

COMMENT ON FUNCTION public.settle_splits_batch(UUID[]) IS
  'Batch settle splits by IDs. Only the payer or system admin can settle. Sets settled_amount = computed_amount for each split.';

GRANT EXECUTE ON FUNCTION public.settle_splits_batch(UUID[]) TO authenticated;

-- =============================================
-- 2. Fix settle_all_splits_for_user - Add payer/admin check
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
  v_is_system_admin BOOLEAN;
  v_split RECORD;
  v_splits_updated INTEGER := 0;
  v_already_paid INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_split_ids UUID[] := ARRAY[]::UUID[];
  v_audit_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate target user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();


  -- Authorization: Only the payer of the expenses OR system admin can settle
  -- For profile-based settle, the current user must be the payer of each expense
  -- where the target user has unsettled splits
  IF NOT v_is_system_admin THEN
    -- Verify current user is the payer for ALL expenses where target user has unsettled splits
    IF EXISTS (
      SELECT 1
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE es.user_id = p_user_id
        AND NOT e.is_payment
        AND es.user_id != e.paid_by_user_id
        AND e.expense_date <= CURRENT_DATE
        AND (es.is_settled = false OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01)
        AND e.paid_by_user_id != v_current_user_id
    ) THEN
      RAISE EXCEPTION 'Only the payer or admin can settle splits. You can only settle splits for expenses you paid for.';
    END IF;
  END IF;

  -- Count already paid splits for the target user
  SELECT COUNT(*) INTO v_already_paid
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE es.user_id = p_user_id
    AND NOT e.is_payment
    AND es.user_id != e.paid_by_user_id
    AND e.expense_date <= CURRENT_DATE
    AND es.is_settled = true
    AND COALESCE(es.settled_amount, 0) >= es.computed_amount - 0.01;

  -- Process each unpaid or partially paid split for the target user
  -- Only settle splits where current user is the payer (or admin settles all)
  FOR v_split IN
    SELECT es.*, e.currency, e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = p_user_id
      AND NOT e.is_payment
      AND es.user_id != e.paid_by_user_id
      AND e.expense_date <= CURRENT_DATE
      AND (
        es.is_settled = false
        OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01
      )
      AND (v_is_system_admin OR e.paid_by_user_id = v_current_user_id)
  LOOP
    DECLARE
      v_remaining_amount DECIMAL;
      v_event_id UUID;
    BEGIN
      v_remaining_amount := v_split.computed_amount - COALESCE(v_split.settled_amount, 0);

      UPDATE expense_splits
      SET
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.id;

      -- Insert payment event (only if user_id is not null - pending email fix)
      IF v_split.user_id IS NOT NULL THEN
        INSERT INTO payment_events (
          expense_id, split_id, event_type, from_user_id, to_user_id,
          amount, currency, method, actor_user_id, metadata, created_at
        ) VALUES (
          v_split.expense_id, v_split.id, 'settle_all_user_splits',
          v_split.user_id, v_split.paid_by_user_id,
          v_remaining_amount, v_split.currency, 'manual', v_current_user_id,
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
      END IF;

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
Only the PAYER of each expense or system admin can settle.
A debtor cannot settle their own splits through this function.';

GRANT EXECUTE ON FUNCTION settle_all_splits_for_user(UUID) TO authenticated;

-- =============================================
-- 3. Fix settle_all_debts_with_person - Add payer/admin check
-- =============================================
CREATE OR REPLACE FUNCTION settle_all_debts_with_person(
  p_counterparty_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user_id UUID;
  v_is_system_admin BOOLEAN;
  v_split RECORD;
  v_splits_updated INTEGER := 0;
  v_already_paid INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_split_ids UUID[] := ARRAY[]::UUID[];
  v_audit_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_counterparty_id) THEN
    RAISE EXCEPTION 'Counterparty user not found';
  END IF;

  IF v_current_user_id = p_counterparty_id THEN
    RAISE EXCEPTION 'Cannot settle debts with yourself';
  END IF;

  v_is_system_admin := is_admin();

  -- Count already paid splits between current user and counterparty
  SELECT COUNT(*) INTO v_already_paid
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE (
    (es.user_id = v_current_user_id AND e.paid_by_user_id = p_counterparty_id) OR
    (es.user_id = p_counterparty_id AND e.paid_by_user_id = v_current_user_id)
  )
  AND NOT e.is_payment
  AND es.user_id != e.paid_by_user_id
  AND e.expense_date <= CURRENT_DATE
  AND es.is_settled = true
  AND COALESCE(es.settled_amount, 0) >= es.computed_amount - 0.01;

  -- Process each unpaid or partially paid split between current user and counterparty
  -- SECURITY: Only settle splits where current user is the PAYER (or admin)
  FOR v_split IN
    SELECT es.*, e.currency, e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE (
      -- Current user PAID and counterparty owes
      (es.user_id = p_counterparty_id AND e.paid_by_user_id = v_current_user_id)
      OR
      -- Admin can also settle where counterparty paid and current user owes
      (v_is_system_admin AND es.user_id = v_current_user_id AND e.paid_by_user_id = p_counterparty_id)
    )
    AND NOT e.is_payment
    AND es.user_id != e.paid_by_user_id
    AND e.expense_date <= CURRENT_DATE
    AND (
      es.is_settled = false
      OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01
    )
  LOOP
    DECLARE
      v_remaining_amount DECIMAL;
      v_event_id UUID;
    BEGIN
      v_remaining_amount := v_split.computed_amount - COALESCE(v_split.settled_amount, 0);

      UPDATE expense_splits
      SET
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.id;

      IF v_split.user_id IS NOT NULL THEN
        INSERT INTO payment_events (
          expense_id, split_id, event_type, from_user_id, to_user_id,
          amount, currency, method, actor_user_id, metadata, created_at
        ) VALUES (
          v_split.expense_id, v_split.id, 'settle_all_with_person',
          v_split.user_id, v_split.paid_by_user_id,
          v_remaining_amount, v_split.currency, 'manual', v_current_user_id,
          jsonb_build_object(
            'previous_settled_amount', COALESCE(v_split.settled_amount, 0),
            'new_settled_amount', v_split.computed_amount,
            'computed_amount', v_split.computed_amount,
            'counterparty_id', p_counterparty_id,
            'bulk_operation', true
          ),
          NOW()
        ) RETURNING id INTO v_event_id;
      END IF;

      v_splits_updated := v_splits_updated + 1;
      v_total_amount := v_total_amount + v_remaining_amount;
      v_split_ids := array_append(v_split_ids, v_split.id);
    END;
  END LOOP;

  v_audit_id := write_audit_trail(
    'settle_all_with_person',
    p_counterparty_id,
    'user',
    jsonb_build_object(
      'splitsUpdated', v_splits_updated,
      'alreadyPaid', v_already_paid,
      'totalAmount', v_total_amount,
      'splitIds', v_split_ids,
      'counterpartyId', p_counterparty_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'counterparty_id', p_counterparty_id,
    'splits_updated', v_splits_updated,
    'already_paid', v_already_paid,
    'total_amount', v_total_amount,
    'audit_id', v_audit_id,
    'split_ids', v_split_ids
  );
END;
$$;

COMMENT ON FUNCTION settle_all_debts_with_person(UUID) IS
'Settle all outstanding debts between CURRENT USER and specified counterparty.
SECURITY: Only settles splits where current user is the PAYER (creditor).
A debtor cannot settle their own debts — only the person who paid can mark them as settled.
System admins can settle in both directions.';

GRANT EXECUTE ON FUNCTION settle_all_debts_with_person(UUID) TO authenticated;
