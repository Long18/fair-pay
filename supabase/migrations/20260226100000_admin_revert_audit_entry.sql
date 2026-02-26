-- Migration: Admin Revert Audit Entry
-- Allows admins to undo any audited operation by restoring old_data from audit_logs.
-- Supports: revert DELETE (re-insert), revert UPDATE (restore old values), revert INSERT (delete record).
-- Writes its own audit trail entry for the revert action.

-- Allowed tables for revert (must match audit trigger tables)
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
  v_key TEXT;
  v_val TEXT;
  v_sql TEXT;
  v_record_id UUID;
  v_revert_audit_id UUID;
BEGIN
  -- Admin check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Fetch the audit entry
  SELECT id, table_name, record_id, action, old_data, new_data, user_id, created_at
  INTO v_entry
  FROM audit_logs
  WHERE id = p_audit_id;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Audit entry not found: %', p_audit_id;
  END IF;

  v_table := v_entry.table_name;

  -- Validate table is in allowed list
  IF NOT (v_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'Revert not supported for table: %', v_table;
  END IF;

  v_record_id := v_entry.record_id;

  -- Temporarily disable audit trigger to avoid double-logging the revert
  EXECUTE format('ALTER TABLE %I DISABLE TRIGGER trg_audit_%s', v_table, v_table);

  BEGIN
    IF v_entry.action = 'DELETE' THEN
      -- Revert DELETE: re-insert the old_data
      IF v_entry.old_data IS NULL THEN
        RAISE EXCEPTION 'Cannot revert DELETE: no old_data stored';
      END IF;

      -- Build INSERT from old_data JSONB
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

    ELSIF v_entry.action = 'UPDATE' THEN
      -- Revert UPDATE: restore old_data values
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

    ELSIF v_entry.action = 'INSERT' THEN
      -- Revert INSERT: delete the record
      v_sql := format('DELETE FROM %I WHERE id = %L', v_table, v_record_id);
      EXECUTE v_sql;

    ELSE
      RAISE EXCEPTION 'Unknown action type: %', v_entry.action;
    END IF;

    -- Re-enable audit trigger
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER trg_audit_%s', v_table, v_table);

  EXCEPTION WHEN OTHERS THEN
    -- Re-enable trigger even on error
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER trg_audit_%s', v_table, v_table);
    RAISE;
  END;

  -- Write audit trail for the revert action
  INSERT INTO audit_trail (actor, action_type, entity_id, entity_type, metadata, timestamp)
  VALUES (
    auth.uid(),
    'admin_revert',
    v_record_id,
    v_table,
    jsonb_build_object(
      'reverted_audit_id', p_audit_id,
      'original_action', v_entry.action,
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
    'action', v_entry.action,
    'table_name', v_table,
    'record_id', v_record_id
  );
END;
$fn$;

COMMENT ON FUNCTION admin_revert_audit_entry(UUID) IS
  'Reverts an audited operation by restoring old_data. Admin-only. Unlimited undo for audit entries.';

GRANT EXECUTE ON FUNCTION admin_revert_audit_entry(UUID) TO authenticated;
