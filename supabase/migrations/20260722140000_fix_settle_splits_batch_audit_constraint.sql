-- Migration: Fix settle_splits_batch 400 after SETTLE_SUMMARY audit
-- Root cause: audit_logs.operation CHECK only allowed INSERT/UPDATE/DELETE, but
-- settle_splits_batch (20260715130200) writes SETTLE_SUMMARY. Postgres logs showed:
--   audit_logs_action_check violation
-- Also restores payment_events inserts removed in that migration (Activity feed regression).

-- =============================================
-- 1. Widen audit_logs.operation CHECK for settlement summaries
-- =============================================
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_check
  CHECK (
    operation = ANY (
      ARRAY[
        'INSERT'::text,
        'UPDATE'::text,
        'DELETE'::text,
        'SETTLE_SUMMARY'::text,
        'BULK_SETTLE'::text,
        'BULK_DELETE'::text,
        'UNKNOWN'::text
      ]
    )
  );

COMMENT ON CONSTRAINT audit_logs_action_check ON public.audit_logs IS
  'CRUD operations from triggers plus settlement/bulk admin summary operations.';

-- =============================================
-- 2. settle_splits_batch: SETTLE_SUMMARY audit + payment_events
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
  v_settlement_id UUID := gen_random_uuid();
  v_prior_splits JSONB := '[]'::JSONB;
  v_total_amount NUMERIC := 0;
  v_currency TEXT;
  v_counterparty_ids UUID[] := ARRAY[]::UUID[];
  v_group_ids UUID[] := ARRAY[]::UUID[];
  v_summary_audit_id UUID;
  v_split RECORD;
  v_remaining DECIMAL;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'splits_updated', 0,
      'settlement_id', v_settlement_id
    );
  END IF;

  v_is_system_admin := is_admin();

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

  -- Capture prior states for summary + atomic revert
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', es.id,
        'expense_id', es.expense_id,
        'user_id', es.user_id,
        'is_settled', es.is_settled,
        'settled_amount', COALESCE(es.settled_amount, 0),
        'settled_at', es.settled_at,
        'computed_amount', es.computed_amount,
        'currency', e.currency,
        'group_id', e.group_id,
        'paid_by_user_id', e.paid_by_user_id,
        'remaining_amount', es.computed_amount - COALESCE(es.settled_amount, 0)
      )
    ), '[]'::JSONB),
    COALESCE(SUM(es.computed_amount - COALESCE(es.settled_amount, 0)), 0),
    (array_agg(DISTINCT e.currency) FILTER (WHERE e.currency IS NOT NULL))[1],
    COALESCE(array_agg(DISTINCT es.user_id) FILTER (WHERE es.user_id IS NOT NULL), ARRAY[]::UUID[]),
    COALESCE(array_agg(DISTINCT e.group_id) FILTER (WHERE e.group_id IS NOT NULL), ARRAY[]::UUID[])
  INTO
    v_prior_splits,
    v_total_amount,
    v_currency,
    v_counterparty_ids,
    v_group_ids
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.id = ANY(p_split_ids)
    AND (es.is_settled = false OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01);

  FOR v_split IN
    SELECT
      es.id AS split_id,
      es.expense_id,
      es.user_id,
      es.computed_amount,
      COALESCE(es.settled_amount, 0) AS current_settled,
      e.currency,
      e.paid_by_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.id = ANY(p_split_ids)
      AND (es.is_settled = false OR COALESCE(es.settled_amount, 0) < es.computed_amount - 0.01)
  LOOP
    v_remaining := v_split.computed_amount - v_split.current_settled;

    UPDATE expense_splits
    SET
      is_settled = true,
      settled_amount = computed_amount,
      settled_at = NOW()
    WHERE id = v_split.split_id;

    IF v_split.user_id IS NOT NULL AND v_split.user_id != v_split.paid_by_user_id THEN
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
        v_split.split_id,
        'settle_batch',
        v_split.user_id,
        v_split.paid_by_user_id,
        v_remaining,
        v_split.currency,
        'manual',
        v_current_user_id,
        jsonb_build_object(
          'previous_settled_amount', v_split.current_settled,
          'new_settled_amount', v_split.computed_amount,
          'computed_amount', v_split.computed_amount,
          'bulk_operation', true,
          'batch_size', array_length(p_split_ids, 1),
          'settlement_id', v_settlement_id
        ),
        NOW()
      );
    END IF;

    v_updated := v_updated + 1;
  END LOOP;

  IF v_updated > 0 THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      user_id,
      created_at
    ) VALUES (
      'expense_splits',
      v_settlement_id,
      'SETTLE_SUMMARY',
      jsonb_build_object('splits', v_prior_splits),
      jsonb_build_object(
        'settlement_id', v_settlement_id,
        'split_ids', to_jsonb(p_split_ids),
        'splits_updated', v_updated,
        'total_amount', v_total_amount,
        'currency', v_currency,
        'counterparty_ids', to_jsonb(v_counterparty_ids),
        'group_ids', to_jsonb(v_group_ids),
        'actor_id', v_current_user_id
      ),
      v_current_user_id,
      NOW()
    )
    RETURNING id INTO v_summary_audit_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'splits_updated', v_updated,
    'settlement_id', v_settlement_id,
    'total_amount', v_total_amount,
    'currency', v_currency,
    'audit_id', v_summary_audit_id,
    'split_ids', p_split_ids
  );
END;
$$;

COMMENT ON FUNCTION public.settle_splits_batch(UUID[]) IS
  'Batch settle splits by IDs. Writes SETTLE_SUMMARY audit_logs entry, payment_events, and trigger detail rows.';

GRANT EXECUTE ON FUNCTION public.settle_splits_batch(UUID[]) TO authenticated;
