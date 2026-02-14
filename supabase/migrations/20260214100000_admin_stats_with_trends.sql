-- ========================================
-- Migration: Extend get_admin_stats() with previous-period counts for trend %
-- Comparison logic:
--   total_users / total_groups: compare to count 30 days ago (created_at < now - 30d)
--   total_expenses / total_payments: last 30d vs previous 30d
--   active_users_7d: last 7d vs previous 7d
-- ========================================

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $
DECLARE
  v_total_users       BIGINT;
  v_total_groups      BIGINT;
  v_total_expenses    BIGINT;
  v_total_payments    BIGINT;
  v_active_7d         BIGINT;
  v_prev_users        BIGINT;
  v_prev_groups       BIGINT;
  v_prev_expenses     BIGINT;
  v_prev_payments     BIGINT;
  v_prev_active_7d    BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view admin stats';
  END IF;

  -- Current totals
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_total_groups FROM groups;
  SELECT COUNT(*) INTO v_total_expenses FROM expenses;
  SELECT COUNT(*) INTO v_total_payments FROM payments;
  SELECT COUNT(DISTINCT paid_by_user_id) INTO v_active_7d
    FROM expenses WHERE created_at >= NOW() - INTERVAL '7 days';

  -- Previous period: users/groups that existed 30 days ago
  SELECT COUNT(*) INTO v_prev_users
    FROM profiles WHERE created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_prev_groups
    FROM groups WHERE created_at < NOW() - INTERVAL '30 days';

  -- Previous period: expenses/payments created 30-60 days ago vs last 30 days
  SELECT COUNT(*) INTO v_prev_expenses
    FROM expenses
    WHERE created_at >= NOW() - INTERVAL '60 days'
      AND created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_prev_payments
    FROM payments
    WHERE created_at >= NOW() - INTERVAL '60 days'
      AND created_at < NOW() - INTERVAL '30 days';

  -- Previous 7-day window (7-14 days ago)
  SELECT COUNT(DISTINCT paid_by_user_id) INTO v_prev_active_7d
    FROM expenses
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days';

  RETURN jsonb_build_object(
    'total_users',      v_total_users,
    'total_groups',     v_total_groups,
    'total_expenses',   v_total_expenses,
    'total_payments',   v_total_payments,
    'active_users_7d',  v_active_7d,
    'prev_total_users', v_prev_users,
    'prev_total_groups', v_prev_groups,
    'prev_expenses_30d', v_prev_expenses,
    'prev_payments_30d', v_prev_payments,
    'prev_active_7d',   v_prev_active_7d,
    'curr_expenses_30d', (SELECT COUNT(*) FROM expenses WHERE created_at >= NOW() - INTERVAL '30 days'),
    'curr_payments_30d', (SELECT COUNT(*) FROM payments WHERE created_at >= NOW() - INTERVAL '30 days')
  );
END;
$;
