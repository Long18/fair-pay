-- ========================================
-- Migration: Fix get_admin_stats() - remove deleted_at reference
-- The expenses table does not have a deleted_at column
-- ========================================

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
