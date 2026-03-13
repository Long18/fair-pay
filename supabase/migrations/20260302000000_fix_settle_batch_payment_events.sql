-- Migration: Fix settle_splits_batch and settle_all_group_debts to create payment_events
-- Date: 2026-03-02
-- Purpose: These two functions were missing payment_events inserts, causing settled items
--          to not show participant avatars/dates in Activity feed and debt detail pages.
--
-- Functions fixed:
-- 1. settle_splits_batch - Used by useSettleSplits hook (debt detail page settle + settle all)
-- 2. settle_all_group_debts - Used by group page settle all
--
-- Also: Drop old CHECK constraint on event_type to allow new event types

-- =============================================
-- 1. Drop old CHECK constraint on event_type (if exists)
--    and add broader one supporting all event types
-- =============================================
DO $$
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE payment_events DROP CONSTRAINT IF EXISTS payment_events_event_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE payment_events
  ADD CONSTRAINT payment_events_event_type_check
  CHECK (event_type IN (
    'manual_settle',
    'momo_payment',
    'banking_payment',
    'settle_all',
    'settle_all_with_person',
    'settle_all_user_splits',
    'settle_batch',
    'settle_all_group'
  ));

-- =============================================
-- 2. Fix settle_splits_batch - Add payment_events creation
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
  v_split RECORD;
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

  -- Loop through each split to update and create payment events
  FOR v_split IN
    SELECT es.id AS split_id, es.expense_id, es.user_id, es.computed_amount,
           COALESCE(es.settled_amount, 0) AS current_settled,
           e.currency, e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.id = ANY(p_split_ids)
      AND (es.is_settled = false OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01)
  LOOP
    DECLARE
      v_remaining DECIMAL;
    BEGIN
      v_remaining := v_split.computed_amount - v_split.current_settled;

      -- Update the split
      UPDATE expense_splits
      SET
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.split_id;

      -- Create payment event (only if user_id is not null - pending email participants)
      IF v_split.user_id IS NOT NULL AND v_split.user_id != v_split.paid_by_user_id THEN
        INSERT INTO payment_events (
          expense_id, split_id, event_type, from_user_id, to_user_id,
          amount, currency, method, actor_user_id, metadata, created_at
        ) VALUES (
          v_split.expense_id, v_split.split_id, 'settle_batch',
          v_split.user_id, v_split.paid_by_user_id,
          v_remaining, v_split.currency, 'manual', v_current_user_id,
          jsonb_build_object(
            'previous_settled_amount', v_split.current_settled,
            'new_settled_amount', v_split.computed_amount,
            'computed_amount', v_split.computed_amount,
            'bulk_operation', true,
            'batch_size', array_length(p_split_ids, 1)
          ),
          NOW()
        );
      END IF;

      v_updated := v_updated + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'splits_updated', v_updated
  );
END;
$$;

COMMENT ON FUNCTION public.settle_splits_batch(UUID[]) IS
  'Batch settle splits by IDs with payment event creation. Only the payer or system admin can settle.';

GRANT EXECUTE ON FUNCTION public.settle_splits_batch(UUID[]) TO authenticated;

-- =============================================
-- 3. Fix settle_all_group_debts - Add payment_events creation
-- =============================================
CREATE OR REPLACE FUNCTION settle_all_group_debts(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_group_admin BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_splits_count INTEGER := 0;
  v_total_amount NUMERIC(10,2) := 0;
  v_expenses_count INTEGER := 0;
  v_split RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_is_system_admin := is_admin();

  IF NOT v_is_system_admin THEN
    SELECT role = 'admin' INTO v_is_group_admin
    FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    IF NOT v_is_group_admin THEN
      RAISE EXCEPTION 'Only group admins or system admins can settle all debts';
    END IF;
  END IF;

  -- Loop through unsettled splits to update and create payment events
  FOR v_split IN
    SELECT es.id AS split_id, es.expense_id, es.user_id, es.computed_amount,
           COALESCE(es.settled_amount, 0) AS current_settled,
           e.currency, e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND e.is_payment = false
      AND es.is_settled = false
  LOOP
    DECLARE
      v_remaining DECIMAL;
    BEGIN
      v_remaining := v_split.computed_amount - v_split.current_settled;

      UPDATE expense_splits
      SET
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.split_id;

      -- Create payment event (skip self-pay splits and null user_id)
      IF v_split.user_id IS NOT NULL AND v_split.user_id != v_split.paid_by_user_id THEN
        INSERT INTO payment_events (
          expense_id, split_id, event_type, from_user_id, to_user_id,
          amount, currency, method, actor_user_id, metadata, created_at
        ) VALUES (
          v_split.expense_id, v_split.split_id, 'settle_all_group',
          v_split.user_id, v_split.paid_by_user_id,
          v_remaining, v_split.currency, 'manual', v_user_id,
          jsonb_build_object(
            'previous_settled_amount', v_split.current_settled,
            'new_settled_amount', v_split.computed_amount,
            'computed_amount', v_split.computed_amount,
            'group_id', p_group_id,
            'bulk_operation', true
          ),
          NOW()
        );
      END IF;

      v_splits_count := v_splits_count + 1;
      v_total_amount := v_total_amount + v_remaining;
    END;
  END LOOP;

  -- Count affected expenses
  SELECT COUNT(DISTINCT e.id) INTO v_expenses_count
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id AND es.is_settled = true
    );

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id, table_name, operation, record_id, changed_fields
  ) VALUES (
    v_user_id, 'expenses', 'BULK_SETTLE', p_group_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'splits_settled', v_splits_count,
      'expenses_settled', v_expenses_count,
      'total_amount', v_total_amount,
      'settled_by_admin', v_is_system_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'splits_settled', v_splits_count,
    'expenses_settled', v_expenses_count,
    'total_amount', v_total_amount,
    'message', format('Settled %s debts totaling ₫%s', v_splits_count, v_total_amount)
  );
END;
$$;

COMMENT ON FUNCTION settle_all_group_debts(UUID) IS
  'Settles all outstanding debts in a group with payment event creation. Group admins or system admins only.';

GRANT EXECUTE ON FUNCTION settle_all_group_debts(UUID) TO authenticated;
