-- Migration: Fix admin_revert_audit_entry column mismatch
-- Purpose: audit_logs.action was renamed to operation (20260218120000), but this RPC
--          still referenced "action", causing HTTP 400: column "action" does not exist.

DROP FUNCTION IF EXISTS admin_revert_audit_entry(UUID);

CREATE OR REPLACE FUNCTION admin_revert_audit_entry(p_audit_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_entry RECORD;
  v_table TEXT;
  v_allowed_tables TEXT[] := ARRAY[
    'expenses', 'expense_splits', 'payments', 'groups',
    'group_members', 'friendships', 'profiles', 'user_settings',
    'user_roles', 'notifications'
  ];
  v_columns TEXT;
  v_values TEXT;
  v_set_clause TEXT;
  v_sql TEXT;
  v_record_id UUID;
  v_revert_audit_id UUID;
  v_operation TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  SELECT id, table_name, record_id, operation, old_data, new_data, user_id, created_at
  INTO v_entry
  FROM audit_logs
  WHERE id = p_audit_id;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Audit entry not found: %', p_audit_id;
  END IF;

  v_table := v_entry.table_name;
  v_operation := v_entry.operation;

  IF NOT (v_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'Revert not supported for table: %', v_table;
  END IF;

  v_record_id := v_entry.record_id;

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
END;
$fn$;

COMMENT ON FUNCTION admin_revert_audit_entry(UUID) IS
  'Reverts an audited operation by restoring old_data. Uses audit_logs.operation. Admin-only.';

GRANT EXECUTE ON FUNCTION admin_revert_audit_entry(UUID) TO authenticated;
