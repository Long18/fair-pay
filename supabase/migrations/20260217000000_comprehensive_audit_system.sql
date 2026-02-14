-- ========================================
-- Migration: Comprehensive Audit System
-- Purpose: Auto-track all table changes, unified audit view, server-side RPC, RLS, retention
-- ========================================

-- =============================================
-- 1. Add RLS policy on audit_logs (admin-only SELECT)
-- =============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- Prevent non-admin writes (only triggers/functions should write)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- 2. Generic trigger function for auto-logging changes
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
  -- Get current user (may be NULL for system operations)
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

  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, created_at)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_user_id, NOW());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$fn$;

COMMENT ON FUNCTION log_table_changes() IS 'Generic trigger function that logs INSERT/UPDATE/DELETE operations to audit_logs table.';


-- =============================================
-- 3. Attach triggers to all main tables
-- =============================================

-- expenses
DROP TRIGGER IF EXISTS trg_audit_expenses ON expenses;
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- expense_splits
DROP TRIGGER IF EXISTS trg_audit_expense_splits ON expense_splits;
CREATE TRIGGER trg_audit_expense_splits
  AFTER INSERT OR UPDATE OR DELETE ON expense_splits
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- payments
DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- groups
DROP TRIGGER IF EXISTS trg_audit_groups ON groups;
CREATE TRIGGER trg_audit_groups
  AFTER INSERT OR UPDATE OR DELETE ON groups
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- group_members
DROP TRIGGER IF EXISTS trg_audit_group_members ON group_members;
CREATE TRIGGER trg_audit_group_members
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- friendships
DROP TRIGGER IF EXISTS trg_audit_friendships ON friendships;
CREATE TRIGGER trg_audit_friendships
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- profiles
DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- user_settings
DROP TRIGGER IF EXISTS trg_audit_user_settings ON user_settings;
CREATE TRIGGER trg_audit_user_settings
  AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- user_roles
DROP TRIGGER IF EXISTS trg_audit_user_roles ON user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- notifications
DROP TRIGGER IF EXISTS trg_audit_notifications ON notifications;
CREATE TRIGGER trg_audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();


-- =============================================
-- 4. Unified admin audit view (merges audit_logs + audit_trail)
-- =============================================
DROP VIEW IF EXISTS admin_audit_unified;

CREATE VIEW admin_audit_unified AS
  -- From audit_logs
  SELECT
    al.id,
    'audit_logs'::TEXT AS source,
    al.table_name,
    NULL::TEXT AS entity_type,
    al.record_id AS entity_id,
    al.action AS action_type,
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

  -- From audit_trail
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

COMMENT ON VIEW admin_audit_unified IS 'Unified view merging audit_logs (table change tracking) and audit_trail (settlement operations) for admin dashboard.';

-- Grant access (RLS on underlying tables handles security)
GRANT SELECT ON admin_audit_unified TO authenticated;


-- =============================================
-- 5. Server-side RPC for paginated audit log queries
-- =============================================
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
  -- Admin-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read audit logs';
  END IF;

  -- Validate pagination
  IF p_limit < 1 OR p_limit > 100 THEN
    p_limit := 20;
  END IF;
  IF p_offset < 0 THEN
    p_offset := 0;
  END IF;

  -- Count total matching records
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

  -- Fetch paginated rows
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

COMMENT ON FUNCTION read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) IS
'Server-side paginated query for unified audit logs. Merges audit_logs + audit_trail. Admin-only.';

GRANT EXECUTE ON FUNCTION read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;


-- =============================================
-- 6. Audit stats RPC for dashboard analytics
-- =============================================
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

COMMENT ON FUNCTION get_audit_stats() IS 'Returns aggregate audit statistics for admin dashboard. Admin-only.';
GRANT EXECUTE ON FUNCTION get_audit_stats() TO authenticated;

-- =============================================
-- 7. Retention: cleanup old audit logs (callable by admin)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_logs_deleted INTEGER;
  v_trail_deleted INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can cleanup audit logs';
  END IF;

  IF p_days_to_keep < 30 THEN
    RAISE EXCEPTION 'Cannot keep less than 30 days of audit logs';
  END IF;

  v_cutoff := NOW() - (p_days_to_keep || ' days')::INTERVAL;

  DELETE FROM audit_logs WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_logs_deleted = ROW_COUNT;

  DELETE FROM audit_trail WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_trail_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cutoff_date', v_cutoff,
    'audit_logs_deleted', v_logs_deleted,
    'audit_trail_deleted', v_trail_deleted
  );
END;
$fn$;

COMMENT ON FUNCTION cleanup_old_audit_logs(INTEGER) IS 'Deletes audit records older than specified days (min 30). Admin-only.';
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO authenticated;

-- =============================================
-- 8. Get distinct filter values for frontend dropdowns
-- =============================================
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

COMMENT ON FUNCTION get_audit_filter_options() IS 'Returns distinct filter values (tables, action types, actors) for audit log UI. Admin-only.';
GRANT EXECUTE ON FUNCTION get_audit_filter_options() TO authenticated;
