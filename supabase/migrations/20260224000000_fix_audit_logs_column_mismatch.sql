-- ========================================
-- Migration: Fix audit_logs column mismatch after schema rename
-- Purpose: After migration 20260218120000 renamed 'action' → 'operation',
--          the trigger function log_table_changes(), the admin_audit_unified view,
--          and bulk_delete_expenses() were NOT updated, breaking ALL CRUD operations.
--
-- Root Cause:
--   1. log_table_changes() trigger still INSERTs into column 'action' (no longer exists)
--   2. admin_audit_unified view references al.action (no longer exists)
--   3. bulk_delete_expenses() from migration 20260209 uses 'action' column
--
-- Fix:
--   1. Recreate log_table_changes() with correct column name 'operation'
--   2. Recreate admin_audit_unified view with al.operation
--   3. Recreate bulk_delete_expenses() with correct column names
--   4. Recreate read_admin_audit_logs() to reference correct view columns
--   5. Recreate get_audit_stats() and get_audit_filter_options()
-- ========================================

-- =============================================
-- 1. Fix trigger function: action → operation
-- =============================================
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_user_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_record_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  END IF;

  INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, user_id, created_at)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_user_id, NOW());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$fn$;

-- =============================================
-- 2. Fix admin_audit_unified view: al.action → al.operation
-- =============================================
DROP VIEW IF EXISTS admin_audit_unified;

CREATE VIEW admin_audit_unified AS
  SELECT
    al.id,
    'audit_logs'::TEXT AS source,
    al.table_name,
    NULL::TEXT AS entity_type,
    al.record_id AS entity_id,
    al.operation AS action_type,
    al.old_data,
    al.new_data,
    NULL::JSONB AS metadata,
    al.user_id AS actor_id,
    p.full_name AS actor_name,
    p.email AS actor_email,
    al.created_at AS timestamp
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id

  UNION ALL

  SELECT
    at2.id,
    'audit_trail'::TEXT AS source,
    NULL::TEXT AS table_name,
    at2.entity_type,
    at2.entity_id,
    at2.action_type,
    NULL::JSONB AS old_data,
    NULL::JSONB AS new_data,
    at2.metadata,
    at2.actor AS actor_id,
    p2.full_name AS actor_name,
    p2.email AS actor_email,
    at2.timestamp
  FROM audit_trail at2
  LEFT JOIN profiles p2 ON p2.id = at2.actor;

GRANT SELECT ON admin_audit_unified TO authenticated;

-- =============================================
-- 3. Fix bulk_delete_expenses: action → operation, old_data → old_data (keep)
--    This function was overwritten by migration 20260209110000 with wrong column names
-- =============================================
CREATE OR REPLACE FUNCTION bulk_delete_expenses(p_expense_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_expense RECORD;
  v_can_delete BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_is_system_admin := is_admin();

  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  IF NOT v_is_system_admin THEN
    FOR v_expense IN
      SELECT e.*, gm.role as user_role
      FROM expenses e
      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id
      WHERE e.id = ANY(p_expense_ids)
    LOOP
      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');

      IF NOT v_can_delete THEN
        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;
      END IF;
    END LOOP;
  END IF;

  -- Log each deletion to audit_logs (using correct column: operation)
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    old_data
  )
  SELECT
    v_user_id,
    'expenses',
    'BULK_DELETE',
    e.id,
    jsonb_build_object(
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'friendship_id', e.friendship_id,
      'deleted_by_admin', v_is_system_admin
    )
  FROM expenses e
  WHERE e.id = ANY(p_expense_ids);

  DELETE FROM expense_splits
  WHERE expense_id = ANY(p_expense_ids);

  DELETE FROM expenses
  WHERE id = ANY(p_expense_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Deleted %s expense(s)', v_deleted_count)
  );
END;
$$;

-- =============================================
-- 4. Recreate read_admin_audit_logs (depends on fixed view)
-- =============================================
DROP FUNCTION IF EXISTS read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION read_admin_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_table_name TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_total INTEGER;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read audit logs';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN p_limit := 20; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  SELECT COUNT(*) INTO v_total
  FROM admin_audit_unified v
  WHERE
    (p_action_type IS NULL OR v.action_type = p_action_type)
    AND (p_table_name IS NULL OR v.table_name = p_table_name OR v.entity_type = p_table_name)
    AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
    AND (p_date_from IS NULL OR v.timestamp >= p_date_from)
    AND (p_date_to IS NULL OR v.timestamp <= p_date_to)
    AND (p_search IS NULL OR p_search = '' OR
      v.actor_name ILIKE '%' || p_search || '%' OR
      v.actor_email ILIKE '%' || p_search || '%' OR
      v.action_type ILIKE '%' || p_search || '%' OR
      COALESCE(v.table_name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(v.entity_type, '') ILIKE '%' || p_search || '%' OR
      v.entity_id::TEXT ILIKE '%' || p_search || '%'
    );

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', v.id,
      'source', v.source,
      'table_name', v.table_name,
      'entity_type', v.entity_type,
      'entity_id', v.entity_id,
      'action_type', v.action_type,
      'old_data', v.old_data,
      'new_data', v.new_data,
      'metadata', v.metadata,
      'actor_id', v.actor_id,
      'actor_name', v.actor_name,
      'actor_email', v.actor_email,
      'timestamp', v.timestamp
    ) AS row_data
    FROM admin_audit_unified v
    WHERE
      (p_action_type IS NULL OR v.action_type = p_action_type)
      AND (p_table_name IS NULL OR v.table_name = p_table_name OR v.entity_type = p_table_name)
      AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
      AND (p_date_from IS NULL OR v.timestamp >= p_date_from)
      AND (p_date_to IS NULL OR v.timestamp <= p_date_to)
      AND (p_search IS NULL OR p_search = '' OR
        v.actor_name ILIKE '%' || p_search || '%' OR
        v.actor_email ILIKE '%' || p_search || '%' OR
        v.action_type ILIKE '%' || p_search || '%' OR
        COALESCE(v.table_name, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.entity_type, '') ILIKE '%' || p_search || '%' OR
        v.entity_id::TEXT ILIKE '%' || p_search || '%'
      )
    ORDER BY v.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'data', v_rows,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- 5. Recreate get_audit_stats (depends on fixed view)
-- =============================================
DROP FUNCTION IF EXISTS get_audit_stats();
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view audit stats';
  END IF;

  RETURN jsonb_build_object(
    'total', (SELECT COUNT(*) FROM admin_audit_unified),
    'inserts', (SELECT COUNT(*) FROM admin_audit_unified WHERE action_type = 'INSERT'),
    'updates', (SELECT COUNT(*) FROM admin_audit_unified WHERE action_type = 'UPDATE'),
    'deletes', (SELECT COUNT(*) FROM admin_audit_unified WHERE action_type = 'DELETE'),
    'today', (SELECT COUNT(*) FROM admin_audit_unified WHERE timestamp >= CURRENT_DATE),
    'this_week', (SELECT COUNT(*) FROM admin_audit_unified WHERE timestamp >= date_trunc('week', CURRENT_DATE)),
    'by_table', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', tbl, 'count', cnt)), '[]'::JSONB)
      FROM (
        SELECT COALESCE(table_name, entity_type) AS tbl, COUNT(*) AS cnt
        FROM admin_audit_unified
        GROUP BY COALESCE(table_name, entity_type)
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    ),
    'by_actor', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(actor_name, actor_email, 'System'), 'count', cnt)), '[]'::JSONB)
      FROM (
        SELECT actor_name, actor_email, COUNT(*) AS cnt
        FROM admin_audit_unified
        GROUP BY actor_name, actor_email
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    )
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_audit_stats() TO authenticated;

-- =============================================
-- 6. Recreate get_audit_filter_options (depends on fixed view)
-- =============================================
DROP FUNCTION IF EXISTS get_audit_filter_options();
CREATE OR REPLACE FUNCTION get_audit_filter_options()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read audit filter options';
  END IF;

  RETURN jsonb_build_object(
    'tables', (
      SELECT COALESCE(jsonb_agg(DISTINCT tbl ORDER BY tbl), '[]'::JSONB)
      FROM (
        SELECT COALESCE(table_name, entity_type) AS tbl
        FROM admin_audit_unified
        WHERE COALESCE(table_name, entity_type) IS NOT NULL
      ) sub
    ),
    'action_types', (
      SELECT COALESCE(jsonb_agg(DISTINCT action_type ORDER BY action_type), '[]'::JSONB)
      FROM admin_audit_unified
    ),
    'actors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', actor_id, 'name', COALESCE(actor_name, actor_email, 'System'))), '[]'::JSONB)
      FROM (
        SELECT DISTINCT ON (actor_id) actor_id, actor_name, actor_email
        FROM admin_audit_unified
        WHERE actor_id IS NOT NULL
        ORDER BY actor_id
      ) sub
    )
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_audit_filter_options() TO authenticated;
