-- Migration: Leaderboard Optimization
-- Description: Create efficient server-side leaderboard aggregation function
-- Date: 2025-12-26

BEGIN;

-- Create efficient leaderboard aggregation function
-- Note: Debtors are people who owe money (expense splits where they are not the payer)
-- Creditors are people who are owed money (expenses they paid but others split)
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_limit INTEGER DEFAULT 5,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  top_debtors JSONB,
  top_creditors JSONB,
  stats JSONB
) AS $$
DECLARE
  v_top_debtors JSONB;
  v_top_creditors JSONB;
  v_stats JSONB;
BEGIN
  -- Get top debtors (people who owe the most)
  -- Debtors are users who have expense splits where they are NOT the payer
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.full_name,
      'avatar_url', p.avatar_url,
      'balance', COALESCE(balance_agg.total_debt, 0)
    ) ORDER BY balance_agg.total_debt DESC
  ), '[]'::jsonb)
  INTO v_top_debtors
  FROM profiles p
  INNER JOIN (
    SELECT es.user_id, SUM(es.computed_amount) as total_debt
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id != e.paid_by_user_id
    GROUP BY es.user_id
    HAVING SUM(es.computed_amount) > 0
  ) balance_agg ON p.id = balance_agg.user_id
  ORDER BY balance_agg.total_debt DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Get top creditors (people owed the most)
  -- Creditors are users who paid expenses that others split
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.full_name,
      'avatar_url', p.avatar_url,
      'balance', COALESCE(balance_agg.total_credit, 0)
    ) ORDER BY balance_agg.total_credit DESC
  ), '[]'::jsonb)
  INTO v_top_creditors
  FROM profiles p
  INNER JOIN (
    SELECT e.paid_by_user_id as user_id,
           SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) as total_credit
    FROM expenses e
    LEFT JOIN expense_splits es ON e.id = es.expense_id
    GROUP BY e.paid_by_user_id
    HAVING SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) > 0
  ) balance_agg ON p.id = balance_agg.user_id
  ORDER BY balance_agg.total_credit DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'total_transactions', (SELECT COUNT(*) FROM expenses) + (SELECT COUNT(*) FROM payments),
    'total_amount_tracked', COALESCE((SELECT SUM(amount) FROM expenses), 0),
    'generated_at', NOW()
  ) INTO v_stats;

  RETURN QUERY SELECT v_top_debtors, v_top_creditors, v_stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add performance indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_expense
ON expense_splits(user_id, expense_id);

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_amount
ON expenses(paid_by_user_id, amount);

-- Grant execute permission to authenticated and anonymous users (for public leaderboard)
GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO anon;

COMMIT;
