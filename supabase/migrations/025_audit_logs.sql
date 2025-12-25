-- Migration: Audit Logging System
-- Description: Create comprehensive audit trail for tracking changes to critical data
-- Date: 2025-12-26
-- Dependencies: 024_reporting_functions.sql

BEGIN;

-- ========================================
-- Part 1: Create Audit Logs Table
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- Part 2: Create Indexes for Audit Logs
-- ========================================

-- Index for user's audit history
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

-- Index for table-specific audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_created
  ON audit_logs(table_name, created_at DESC);

-- Index for record-specific audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON audit_logs(table_name, record_id, created_at DESC);

-- Index for operation type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation
  ON audit_logs(operation, created_at DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_data_gin
  ON audit_logs USING GIN (old_data);

CREATE INDEX IF NOT EXISTS idx_audit_logs_new_data_gin
  ON audit_logs USING GIN (new_data);

-- ========================================
-- Part 3: Generic Audit Trigger Function
-- ========================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
  v_record_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Get IP address and user agent from request context if available
  BEGIN
    v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  -- Handle different operations
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_record_id := OLD.id;
    v_changed_fields := NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;

    -- Identify changed fields
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(v_old_data) old_fields
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_each(v_new_data) new_fields
        WHERE new_fields.key = old_fields.key
          AND new_fields.value = old_fields.value
      )
      AND key NOT IN ('updated_at', 'created_at') -- Exclude timestamp fields
    ) changed;

  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_changed_fields := NULL;

  END IF;

  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    changed_fields,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_ip_address,
    v_user_agent
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 4: Apply Audit Triggers to Critical Tables
-- ========================================

-- Audit expenses table
DROP TRIGGER IF EXISTS trigger_audit_expenses ON expenses;
CREATE TRIGGER trigger_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Audit payments table
DROP TRIGGER IF EXISTS trigger_audit_payments ON payments;
CREATE TRIGGER trigger_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Audit groups table
DROP TRIGGER IF EXISTS trigger_audit_groups ON groups;
CREATE TRIGGER trigger_audit_groups
  AFTER INSERT OR UPDATE OR DELETE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Audit user_settings table
DROP TRIGGER IF EXISTS trigger_audit_user_settings ON user_settings;
CREATE TRIGGER trigger_audit_user_settings
  AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Audit group_members table (to track membership changes)
DROP TRIGGER IF EXISTS trigger_audit_group_members ON group_members;
CREATE TRIGGER trigger_audit_group_members
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Audit friendships table
DROP TRIGGER IF EXISTS trigger_audit_friendships ON friendships;
CREATE TRIGGER trigger_audit_friendships
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- ========================================
-- Part 5: RLS Policies for Audit Logs
-- ========================================

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- No one can insert/update/delete audit logs directly (only triggers)
CREATE POLICY "No direct modifications to audit logs"
  ON audit_logs
  FOR ALL
  TO authenticated
  USING (false);

-- ========================================
-- Part 6: Audit Query Functions
-- ========================================

-- Function to get audit history for a specific record
CREATE OR REPLACE FUNCTION get_record_audit_history(
  p_table_name TEXT,
  p_record_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  operation TEXT,
  changed_fields TEXT[],
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user has access to this record
  -- (Simplified check - enhance based on specific table rules)
  IF NOT is_admin() THEN
    -- For non-admins, verify they have access to the record
    IF p_table_name = 'expenses' THEN
      IF NOT EXISTS (
        SELECT 1 FROM expenses e
        JOIN expense_splits es ON es.expense_id = e.id
        WHERE e.id = p_record_id
          AND (e.paid_by_user_id = auth.uid() OR es.user_id = auth.uid())
      ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to view this audit history';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    p.display_name as user_name,
    al.operation,
    al.changed_fields,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's recent activity from audit logs
CREATE OR REPLACE FUNCTION get_user_audit_activity(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  table_name TEXT,
  operation TEXT,
  record_id UUID,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_target_user UUID;
BEGIN
  -- Default to current user if not specified
  v_target_user := COALESCE(p_user_id, auth.uid());

  -- Only allow viewing own activity unless admin
  IF v_target_user != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own audit activity';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.table_name,
    al.operation,
    al.record_id,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  WHERE al.user_id = v_target_user
    AND al.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search audit logs (admin only)
CREATE OR REPLACE FUNCTION search_audit_logs(
  p_table_name TEXT DEFAULT NULL,
  p_operation TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  table_name TEXT,
  operation TEXT,
  record_id UUID,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Only admins can search all audit logs
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can search audit logs';
  END IF;

  -- Set default dates
  p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
  p_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    p.display_name as user_name,
    al.table_name,
    al.operation,
    al.record_id,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_operation IS NULL OR al.operation = p_operation)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND al.created_at BETWEEN p_start_date AND p_end_date
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit statistics (admin only)
CREATE OR REPLACE FUNCTION get_audit_statistics(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_events INTEGER,
  insert_count INTEGER,
  update_count INTEGER,
  delete_count INTEGER,
  unique_users INTEGER,
  events_by_table JSONB,
  daily_activity JSONB
) AS $$
BEGIN
  -- Only admins can view audit statistics
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can view audit statistics';
  END IF;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      SUM(CASE WHEN operation = 'INSERT' THEN 1 ELSE 0 END)::INTEGER as inserts,
      SUM(CASE WHEN operation = 'UPDATE' THEN 1 ELSE 0 END)::INTEGER as updates,
      SUM(CASE WHEN operation = 'DELETE' THEN 1 ELSE 0 END)::INTEGER as deletes,
      COUNT(DISTINCT user_id)::INTEGER as users
    FROM audit_logs
    WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ),
  by_table AS (
    SELECT jsonb_object_agg(table_name, count) as tables
    FROM (
      SELECT table_name, COUNT(*)::INTEGER as count
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY table_name
      ORDER BY count DESC
    ) t
  ),
  by_day AS (
    SELECT jsonb_object_agg(activity_date::TEXT, count) as daily
    FROM (
      SELECT
        DATE(created_at) as activity_date,
        COUNT(*)::INTEGER as count
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY activity_date DESC
    ) d
  )
  SELECT
    s.total,
    s.inserts,
    s.updates,
    s.deletes,
    s.users,
    bt.tables,
    bd.daily
  FROM stats s
  CROSS JOIN by_table bt
  CROSS JOIN by_day bd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 7: Audit Log Retention Policy Function
-- ========================================

-- Function to clean up old audit logs (admin only)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_days_to_keep INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Only admins can clean up audit logs
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can clean up audit logs';
  END IF;

  -- Delete audit logs older than specified days
  DELETE FROM audit_logs
  WHERE created_at < CURRENT_DATE - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 8: Grant Permissions
-- ========================================

GRANT EXECUTE ON FUNCTION get_record_audit_history(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_audit_activity(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO authenticated;

-- ========================================
-- Part 9: Comments for Documentation
-- ========================================

COMMENT ON TABLE audit_logs IS
  'Comprehensive audit trail for all changes to critical tables. Tracks who changed what, when, and from where.';

COMMENT ON COLUMN audit_logs.user_id IS
  'User who performed the action (NULL if system action)';

COMMENT ON COLUMN audit_logs.table_name IS
  'Name of the table that was modified';

COMMENT ON COLUMN audit_logs.operation IS
  'Type of operation: INSERT, UPDATE, or DELETE';

COMMENT ON COLUMN audit_logs.record_id IS
  'ID of the record that was modified';

COMMENT ON COLUMN audit_logs.old_data IS
  'Complete snapshot of record before change (NULL for INSERT)';

COMMENT ON COLUMN audit_logs.new_data IS
  'Complete snapshot of record after change (NULL for DELETE)';

COMMENT ON COLUMN audit_logs.changed_fields IS
  'Array of field names that were changed (UPDATE only)';

COMMENT ON COLUMN audit_logs.ip_address IS
  'IP address of the client that made the change';

COMMENT ON COLUMN audit_logs.user_agent IS
  'User agent string of the client';

COMMENT ON FUNCTION create_audit_log IS
  'Generic trigger function that creates audit log entries for INSERT, UPDATE, DELETE operations';

COMMENT ON FUNCTION get_record_audit_history IS
  'Get complete audit history for a specific record';

COMMENT ON FUNCTION get_user_audit_activity IS
  'Get recent audit activity for a user';

COMMENT ON FUNCTION search_audit_logs IS
  'Search audit logs with filters (admin only)';

COMMENT ON FUNCTION get_audit_statistics IS
  'Get audit statistics summary (admin only)';

COMMENT ON FUNCTION cleanup_old_audit_logs IS
  'Clean up audit logs older than specified days (admin only)';

COMMIT;

-- ========================================
-- Usage Examples
-- ========================================

-- Get audit history for an expense:
-- SELECT * FROM get_record_audit_history('expenses', 'expense-uuid-here', 20);

-- Get your recent activity:
-- SELECT * FROM get_user_audit_activity(auth.uid(), 7, 50);

-- Search audit logs (admin):
-- SELECT * FROM search_audit_logs('expenses', 'UPDATE', NULL, NOW() - INTERVAL '7 days', NOW(), 100);

-- Get audit statistics (admin):
-- SELECT * FROM get_audit_statistics(30);

-- Clean up old logs (admin, keeps last 365 days):
-- SELECT cleanup_old_audit_logs(365);

-- Query changed fields:
-- SELECT * FROM audit_logs WHERE 'amount' = ANY(changed_fields) ORDER BY created_at DESC LIMIT 10;
