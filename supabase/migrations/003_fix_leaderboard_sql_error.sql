-- Migration: 003_fix_leaderboard_sql_error.sql
-- Description: Fix SQL error in get_leaderboard_data function
-- Date: 2025-12-26
-- Issue: ORDER BY inside jsonb_agg is invalid - need to order rows before aggregating

BEGIN;

-- Fix the get_leaderboard_data function
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_limit INTEGER DEFAULT 5,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  top_debtors JSONB,
  top_creditors JSONB,
  stats JSONB
)
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_top_debtors JSONB;
  v_top_creditors JSONB;
  v_stats JSONB;
BEGIN
  -- Get top debtors (people who owe the most)
  -- Fixed: Order rows before aggregating into JSONB
  WITH debtors AS (
    SELECT p.id, p.full_name, p.avatar_url, balance_agg.total_debt
    FROM profiles p
    INNER JOIN (
      SELECT es.user_id, SUM(es.computed_amount) as total_debt
      FROM expense_splits es
      INNER JOIN expenses e ON es.expense_id = e.id
      WHERE es.user_id != e.paid_by_user_id
        AND e.is_payment = false
      GROUP BY es.user_id
      HAVING SUM(es.computed_amount) > 0
    ) balance_agg ON p.id = balance_agg.user_id
    ORDER BY balance_agg.total_debt DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', full_name,
      'avatar_url', avatar_url,
      'balance', COALESCE(total_debt, 0)
    )
  ), '[]'::jsonb)
  INTO v_top_debtors
  FROM debtors;

  -- Get top creditors (people owed the most)
  -- Fixed: Order rows before aggregating into JSONB
  WITH creditors AS (
    SELECT p.id, p.full_name, p.avatar_url, balance_agg.total_credit
    FROM profiles p
    INNER JOIN (
      SELECT e.paid_by_user_id as user_id,
             SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) as total_credit
      FROM expenses e
      LEFT JOIN expense_splits es ON e.id = es.expense_id
      WHERE e.is_payment = false
      GROUP BY e.paid_by_user_id
      HAVING SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) > 0
    ) balance_agg ON p.id = balance_agg.user_id
    ORDER BY balance_agg.total_credit DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', full_name,
      'avatar_url', avatar_url,
      'balance', COALESCE(total_credit, 0)
    )
  ), '[]'::jsonb)
  INTO v_top_creditors
  FROM creditors;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'total_transactions', (SELECT COUNT(*) FROM expenses WHERE is_payment = false) + (SELECT COUNT(*) FROM payments),
    'total_amount_tracked', COALESCE((SELECT SUM(amount) FROM expenses WHERE is_payment = false), 0),
    'generated_at', NOW()
  ) INTO v_stats;

  RETURN QUERY SELECT v_top_debtors, v_top_creditors, v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO anon;

COMMIT;
