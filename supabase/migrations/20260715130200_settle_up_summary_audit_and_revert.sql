-- Migration: Settle Up summary audit + atomic revert
-- Purpose:
--   1. settle_splits_batch (primary Settle Up path) writes one audit_trail summary
--      with prior split states linked by settlement_id (detail rows still come from triggers).
--   2. admin_revert_audit_entry can revert SETTLE_SUMMARY rows and settlement audit_trail
--      entries atomically (all linked splits), while keeping old detail-only rows usable.

-- =============================================
-- Helper: restore expense_splits from prior-state JSONB array
-- =============================================
CREATE OR REPLACE FUNCTION restore_settlement_splits(p_prior_splits JSONB)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_split JSONB;
  v_restored INTEGER := 0;
BEGIN
  IF p_prior_splits IS NULL OR jsonb_typeof(p_prior_splits) != 'array' THEN
    RETURN 0;
  END IF;

  EXECUTE 'ALTER TABLE expense_splits DISABLE TRIGGER trg_audit_expense_splits';

  BEGIN
    FOR v_split IN SELECT * FROM jsonb_array_elements(p_prior_splits)
    LOOP
      UPDATE expense_splits
      SET
        is_settled = COALESCE((v_split ->> 'is_settled')::BOOLEAN, false),
        settled_amount = COALESCE((v_split ->> 'settled_amount')::NUMERIC, 0),
        settled_at = CASE
          WHEN v_split ->> 'settled_at' IS NULL OR v_split ->> 'settled_at' = '' THEN NULL
          ELSE (v_split ->> 'settled_at')::TIMESTAMPTZ
        END
      WHERE id = (v_split ->> 'id')::UUID;
      v_restored := v_restored + 1;
    END LOOP;

    EXECUTE 'ALTER TABLE expense_splits ENABLE TRIGGER trg_audit_expense_splits';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE expense_splits ENABLE TRIGGER trg_audit_expense_splits';
    RAISE;
  END;

  RETURN v_restored;
END;
$fn$;

COMMENT ON FUNCTION restore_settlement_splits(JSONB) IS
  'Restores expense_splits from a JSONB array of prior states. Used by settlement audit revert.';

-- =============================================
-- Helper: unsettle by split IDs (backward-compatible trail entries without priorStates)
-- =============================================
CREATE OR REPLACE FUNCTION unsettle_splits_by_ids(p_split_ids UUID[])
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  EXECUTE 'ALTER TABLE expense_splits DISABLE TRIGGER trg_audit_expense_splits';

  BEGIN
    UPDATE expense_splits
    SET
      is_settled = false,
      settled_amount = 0,
      settled_at = NULL
    WHERE id = ANY(p_split_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    EXECUTE 'ALTER TABLE expense_splits ENABLE TRIGGER trg_audit_expense_splits';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE expense_splits ENABLE TRIGGER trg_audit_expense_splits';
    RAISE;
  END;

  RETURN v_updated;
END;
$fn$;

-- =============================================
-- settle_splits_batch: summary audit + prior states
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

  UPDATE expense_splits
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  WHERE id = ANY(p_split_ids)
    AND (is_settled = false OR COALESCE(settled_amount, 0) < computed_amount - 0.01);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    -- Exactly one summary entry (detail rows still come from expense_splits triggers)
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
  'Batch settle splits by IDs. Writes one SETTLE_SUMMARY audit_logs entry plus trail metadata for atomic revert. Detail rows still logged by expense_splits triggers.';

GRANT EXECUTE ON FUNCTION public.settle_splits_batch(UUID[]) TO authenticated;

-- =============================================
-- admin_revert_audit_entry: operation + settlement summary / trail
-- =============================================
DROP FUNCTION IF EXISTS admin_revert_audit_entry(UUID);

CREATE OR REPLACE FUNCTION admin_revert_audit_entry(p_audit_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_entry RECORD;
  v_trail RECORD;
  v_table TEXT;
  v_allowed_tables TEXT[] := ARRAY[
    'expenses', 'expense_splits', 'payments', 'groups',
    'group_members', 'friendships', 'profiles', 'user_settings',
    'user_roles', 'notifications'
  ];
  v_settlement_actions TEXT[] := ARRAY[
    'settle_batch',
    'settle_all_with_person',
    'manual_settle_all',
    'settle_all_user_splits',
    'settle_all'
  ];
  v_columns TEXT;
  v_values TEXT;
  v_set_clause TEXT;
  v_sql TEXT;
  v_record_id UUID;
  v_revert_audit_id UUID;
  v_operation TEXT;
  v_prior_splits JSONB;
  v_split_ids UUID[];
  v_restored INTEGER := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- 1) Prefer audit_logs (includes SETTLE_SUMMARY)
  SELECT id, table_name, record_id, operation, old_data, new_data, user_id, created_at
  INTO v_entry
  FROM audit_logs
  WHERE id = p_audit_id;

  IF v_entry IS NOT NULL THEN
    v_table := v_entry.table_name;
    v_operation := v_entry.operation;
    v_record_id := v_entry.record_id;

    -- Atomic Settle Up summary revert
    IF v_operation = 'SETTLE_SUMMARY' THEN
      v_prior_splits := v_entry.old_data -> 'splits';
      IF v_prior_splits IS NULL OR jsonb_typeof(v_prior_splits) != 'array' THEN
        RAISE EXCEPTION 'Cannot revert SETTLE_SUMMARY: missing prior split states';
      END IF;

      v_restored := restore_settlement_splits(v_prior_splits);

      INSERT INTO audit_trail (actor, action_type, entity_id, entity_type, metadata, timestamp)
      VALUES (
        auth.uid(),
        'admin_revert',
        v_record_id,
        'settlement',
        jsonb_build_object(
          'reverted_audit_id', p_audit_id,
          'original_action', v_operation,
          'original_actor', v_entry.user_id,
          'original_timestamp', v_entry.created_at,
          'splits_restored', v_restored,
          'settlement_id', v_record_id
        ),
        NOW()
      )
      RETURNING id INTO v_revert_audit_id;

      RETURN jsonb_build_object(
        'success', true,
        'reverted_audit_id', p_audit_id,
        'revert_audit_id', v_revert_audit_id,
        'action', v_operation,
        'table_name', v_table,
        'record_id', v_record_id,
        'splits_restored', v_restored
      );
    END IF;

    IF NOT (v_table = ANY(v_allowed_tables)) THEN
      RAISE EXCEPTION 'Revert not supported for table: %', v_table;
    END IF;

    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER trg_audit_%s', v_table, v_table);

    BEGIN
      IF v_operation = 'DELETE' THEN
        IF v_entry.old_data IS NULL THEN
          RAISE EXCEPTION 'Cannot revert DELETE: no old_data stored';
        END IF;

        SELECT
          string_agg(quote_ident(k), ', '),
          string_agg(
            CASE
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'null' THEN 'NULL'
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'number' THEN (v_entry.old_data ->> k)
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'boolean' THEN (v_entry.old_data ->> k)
              ELSE quote_literal(v_entry.old_data ->> k)
            END,
            ', '
          )
        INTO v_columns, v_values
        FROM jsonb_object_keys(v_entry.old_data) AS k;

        v_sql := format(
          'INSERT INTO %I (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s',
          v_table, v_columns, v_values,
          (
            SELECT string_agg(
              format('%I = EXCLUDED.%I', k, k), ', '
            )
            FROM jsonb_object_keys(v_entry.old_data) AS k
            WHERE k != 'id'
          )
        );
        EXECUTE v_sql;

      ELSIF v_operation = 'UPDATE' THEN
        IF v_entry.old_data IS NULL THEN
          RAISE EXCEPTION 'Cannot revert UPDATE: no old_data stored';
        END IF;

        SELECT string_agg(
          format(
            '%I = %s',
            k,
            CASE
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'null' THEN 'NULL'
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'number' THEN (v_entry.old_data ->> k)
              WHEN jsonb_typeof(v_entry.old_data -> k) = 'boolean' THEN (v_entry.old_data ->> k)
              ELSE quote_literal(v_entry.old_data ->> k)
            END
          ),
          ', '
        )
        INTO v_set_clause
        FROM jsonb_object_keys(v_entry.old_data) AS k
        WHERE k != 'id';

        v_sql := format(
          'UPDATE %I SET %s WHERE id = %L',
          v_table, v_set_clause, v_record_id
        );
        EXECUTE v_sql;

      ELSIF v_operation = 'INSERT' THEN
        v_sql := format('DELETE FROM %I WHERE id = %L', v_table, v_record_id);
        EXECUTE v_sql;

      ELSE
        RAISE EXCEPTION 'Unknown operation type: %', v_operation;
      END IF;

      EXECUTE format('ALTER TABLE %I ENABLE TRIGGER trg_audit_%s', v_table, v_table);

    EXCEPTION WHEN OTHERS THEN
      EXECUTE format('ALTER TABLE %I ENABLE TRIGGER trg_audit_%s', v_table, v_table);
      RAISE;
    END;

    INSERT INTO audit_trail (actor, action_type, entity_id, entity_type, metadata, timestamp)
    VALUES (
      auth.uid(),
      'admin_revert',
      v_record_id,
      v_table,
      jsonb_build_object(
        'reverted_audit_id', p_audit_id,
        'original_action', v_operation,
        'original_actor', v_entry.user_id,
        'original_timestamp', v_entry.created_at
      ),
      NOW()
    )
    RETURNING id INTO v_revert_audit_id;

    RETURN jsonb_build_object(
      'success', true,
      'reverted_audit_id', p_audit_id,
      'revert_audit_id', v_revert_audit_id,
      'action', v_operation,
      'table_name', v_table,
      'record_id', v_record_id
    );
  END IF;

  -- 2) Fallback: audit_trail settlement summaries (incl. pre-change settle_all_*)
  SELECT id, actor, action_type, entity_id, entity_type, metadata, timestamp
  INTO v_trail
  FROM audit_trail
  WHERE id = p_audit_id;

  IF v_trail IS NULL THEN
    RAISE EXCEPTION 'Audit entry not found: %', p_audit_id;
  END IF;

  IF NOT (v_trail.action_type = ANY(v_settlement_actions)) THEN
    RAISE EXCEPTION 'Revert not supported for audit trail action: %', v_trail.action_type;
  END IF;

  v_prior_splits := v_trail.metadata -> 'priorStates';
  IF v_prior_splits IS NOT NULL AND jsonb_typeof(v_prior_splits) = 'array' THEN
    v_restored := restore_settlement_splits(v_prior_splits);
  ELSE
    SELECT COALESCE(array_agg((value)::UUID), ARRAY[]::UUID[])
    INTO v_split_ids
    FROM jsonb_array_elements_text(COALESCE(v_trail.metadata -> 'splitIds', '[]'::JSONB)) AS value;

    IF array_length(v_split_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Cannot revert settlement: no priorStates or splitIds in metadata';
    END IF;

    v_restored := unsettle_splits_by_ids(v_split_ids);
  END IF;

  INSERT INTO audit_trail (actor, action_type, entity_id, entity_type, metadata, timestamp)
  VALUES (
    auth.uid(),
    'admin_revert',
    v_trail.entity_id,
    v_trail.entity_type,
    jsonb_build_object(
      'reverted_audit_id', p_audit_id,
      'original_action', v_trail.action_type,
      'original_actor', v_trail.actor,
      'original_timestamp', v_trail.timestamp,
      'splits_restored', v_restored,
      'source', 'audit_trail'
    ),
    NOW()
  )
  RETURNING id INTO v_revert_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'reverted_audit_id', p_audit_id,
    'revert_audit_id', v_revert_audit_id,
    'action', v_trail.action_type,
    'table_name', v_trail.entity_type,
    'record_id', v_trail.entity_id,
    'splits_restored', v_restored
  );
END;
$fn$;

COMMENT ON FUNCTION admin_revert_audit_entry(UUID) IS
  'Reverts audit_logs (incl. SETTLE_SUMMARY) or settlement audit_trail entries. Admin-only.';

GRANT EXECUTE ON FUNCTION admin_revert_audit_entry(UUID) TO authenticated;
