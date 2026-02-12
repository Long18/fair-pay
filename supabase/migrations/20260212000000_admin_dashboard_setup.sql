-- ========================================
-- Migration: Admin Dashboard Setup
-- Purpose: Create admin stats RPC function and add RLS policies for admin dashboard
-- Requirements: 13.1, 13.2, 13.3, 13.4, 3.1
-- ========================================

-- =============================================
-- 1. Create get_admin_stats() RPC function
-- =============================================
-- Returns aggregate stats for admin overview page
-- SECURITY DEFINER: runs with function owner's privileges
-- Checks is_admin() before returning data

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view admin stats';
  END IF;

  RETURN jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'total_expenses', (SELECT COUNT(*) FROM expenses),
    'total_payments', (SELECT COUNT(*) FROM payments),
    'active_users_7d', (
      SELECT COUNT(DISTINCT paid_by_user_id)
      FROM expenses
      WHERE created_at >= NOW() - INTERVAL '7 days'
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

COMMENT ON FUNCTION get_admin_stats() IS 'Returns aggregate statistics (total users, groups, expenses, payments, active users) for admin dashboard overview. Admin-only access enforced via is_admin() check.';

-- =============================================
-- 2. RLS Policy: Admin can view all notifications
-- =============================================
-- Replace existing SELECT policy to include admin access
-- Existing policy: "Users can view own notifications" (user_id = auth.uid())
-- New policy: user_id = auth.uid() OR is_admin()

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- =============================================
-- 3. RLS Policies: Admin can manage user_roles
-- =============================================
-- Existing policies:
--   "Users can view their own role" (SELECT, user_id = auth.uid())
--   "Only admins can manage roles" (FOR ALL, is_admin via EXISTS)
-- Adding explicit UPDATE and INSERT policies with WITH CHECK for clarity

DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;

CREATE POLICY "Admins can update user roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;

CREATE POLICY "Admins can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
