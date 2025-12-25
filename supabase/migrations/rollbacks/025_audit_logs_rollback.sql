-- Rollback: 025_audit_logs.sql
-- Removes the complete audit logging system

BEGIN;

-- ========================================
-- Part 1: Drop All Audit Triggers
-- ========================================

DROP TRIGGER IF EXISTS trigger_audit_expenses ON expenses;
DROP TRIGGER IF EXISTS trigger_audit_payments ON payments;
DROP TRIGGER IF EXISTS trigger_audit_groups ON groups;
DROP TRIGGER IF EXISTS trigger_audit_user_settings ON user_settings;
DROP TRIGGER IF EXISTS trigger_audit_group_members ON group_members;
DROP TRIGGER IF EXISTS trigger_audit_friendships ON friendships;

-- ========================================
-- Part 2: Revoke Permissions
-- ========================================

REVOKE EXECUTE ON FUNCTION get_record_audit_history(TEXT, UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_user_audit_activity(UUID, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION search_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_audit_statistics(INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) FROM authenticated;

-- ========================================
-- Part 3: Drop All Audit Functions
-- ========================================

DROP FUNCTION IF EXISTS get_record_audit_history(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_audit_activity(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS get_audit_statistics(INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_audit_logs(INTEGER);
DROP FUNCTION IF EXISTS create_audit_log();

-- ========================================
-- Part 4: Drop RLS Policies
-- ========================================

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "No direct modifications to audit logs" ON audit_logs;

-- ========================================
-- Part 5: Drop Indexes
-- ========================================

DROP INDEX IF EXISTS idx_audit_logs_user_created;
DROP INDEX IF EXISTS idx_audit_logs_table_created;
DROP INDEX IF EXISTS idx_audit_logs_record;
DROP INDEX IF EXISTS idx_audit_logs_operation;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_old_data_gin;
DROP INDEX IF EXISTS idx_audit_logs_new_data_gin;

-- ========================================
-- Part 6: Drop Audit Logs Table
-- ========================================

-- WARNING: This will permanently delete ALL audit history!
DROP TABLE IF EXISTS audit_logs;

COMMIT;

-- CRITICAL WARNING:
-- This rollback will PERMANENTLY DELETE all audit history
--
-- Before rolling back, consider exporting audit logs:
-- COPY audit_logs TO '/path/to/backup/audit_logs_backup.csv' CSV HEADER;
--
-- Or create a backup table:
-- CREATE TABLE audit_logs_backup AS SELECT * FROM audit_logs;
--
-- After rollback, you will lose:
-- - All change history for expenses, payments, groups
-- - User activity tracking
-- - Compliance and forensic audit trails
-- - Ability to trace who changed what and when
