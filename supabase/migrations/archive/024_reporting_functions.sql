-- Migration: Reporting and Analytics RPC Functions
-- Description: Create optimized database functions for reporting and analytics
-- Date: 2025-12-26
-- Dependencies: 023_data_validations.sql

BEGIN;

-- ========================================
-- Part 1: Expense Summary by Category
-- ========================================

-- Function to get expense breakdown by category for a user
CREATE OR REPLACE FUNCTION get_expense_summary_by_category(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  category TEXT,
  total_amount DECIMAL(12, 2),
  expense_count INTEGER,
  avg_amount DECIMAL(12, 2),
  percentage DECIMAL(5, 2)
) AS $$
DECLARE
  v_total_spent DECIMAL(12, 2);
BEGIN
  -- Set default dates if not provided
  p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  p_end_date := COALESCE(p_end_date, CURRENT_DATE);

  -- Calculate total spent for percentage calculation
  SELECT COALESCE(SUM(es.computed_amount), 0)
  INTO v_total_spent
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.deleted_at IS NULL
    AND e.is_payment = false;

  -- Return category breakdown
  RETURN QUERY
  SELECT
    COALESCE(e.category, 'Uncategorized') as category,
    SUM(es.computed_amount)::DECIMAL(12, 2) as total_amount,
    COUNT(DISTINCT e.id)::INTEGER as expense_count,
    AVG(es.computed_amount)::DECIMAL(12, 2) as avg_amount,
    CASE
      WHEN v_total_spent > 0 THEN (SUM(es.computed_amount) / v_total_spent * 100)::DECIMAL(5, 2)
      ELSE 0::DECIMAL(5, 2)
    END as percentage
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.deleted_at IS NULL
    AND e.is_payment = false
  GROUP BY e.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 2: Spending Trend (Weekly)
-- ========================================

-- Function to get weekly spending trend
CREATE OR REPLACE FUNCTION get_spending_trend(
  p_user_id UUID,
  p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  week_number INTEGER,
  total_spent DECIMAL(12, 2),
  expense_count INTEGER,
  avg_per_expense DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH week_series AS (
    SELECT
      generate_series(
        date_trunc('week', CURRENT_DATE - (p_weeks || ' weeks')::INTERVAL),
        date_trunc('week', CURRENT_DATE),
        '1 week'::INTERVAL
      )::DATE as week_start
  ),
  weekly_expenses AS (
    SELECT
      date_trunc('week', e.expense_date)::DATE as week_start,
      SUM(es.computed_amount) as total,
      COUNT(DISTINCT e.id) as count
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date >= CURRENT_DATE - (p_weeks || ' weeks')::INTERVAL
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY date_trunc('week', e.expense_date)::DATE
  )
  SELECT
    ws.week_start,
    (ws.week_start + INTERVAL '6 days')::DATE as week_end,
    (p_weeks - EXTRACT(WEEK FROM CURRENT_DATE - ws.week_start)::INTEGER) as week_number,
    COALESCE(we.total, 0)::DECIMAL(12, 2) as total_spent,
    COALESCE(we.count, 0)::INTEGER as expense_count,
    CASE
      WHEN COALESCE(we.count, 0) > 0 THEN (COALESCE(we.total, 0) / we.count)::DECIMAL(12, 2)
      ELSE 0::DECIMAL(12, 2)
    END as avg_per_expense
  FROM week_series ws
  LEFT JOIN weekly_expenses we ON ws.week_start = we.week_start
  ORDER BY ws.week_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 3: Group Statistics
-- ========================================

-- Function to get comprehensive group statistics
CREATE OR REPLACE FUNCTION get_group_stats(p_group_id UUID)
RETURNS TABLE (
  total_expenses DECIMAL(12, 2),
  total_payments DECIMAL(12, 2),
  expense_count INTEGER,
  payment_count INTEGER,
  member_count INTEGER,
  most_active_user_id UUID,
  most_active_user_name TEXT,
  most_active_user_count INTEGER,
  total_outstanding DECIMAL(12, 2),
  created_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user has access to this group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this group';
  END IF;

  RETURN QUERY
  WITH group_data AS (
    SELECT
      g.created_at as grp_created_at,
      COALESCE(
        (SELECT MAX(greatest_date) FROM (
          SELECT MAX(e.created_at) as greatest_date FROM expenses e WHERE e.group_id = p_group_id
          UNION ALL
          SELECT MAX(p.created_at) FROM payments p WHERE p.group_id = p_group_id
        ) dates),
        g.created_at
      ) as last_activity_date
    FROM groups g
    WHERE g.id = p_group_id
  ),
  expense_data AS (
    SELECT
      SUM(amount)::DECIMAL(12, 2) as total_exp,
      COUNT(*)::INTEGER as count_exp
    FROM expenses
    WHERE group_id = p_group_id
      AND deleted_at IS NULL
      AND is_payment = false
  ),
  payment_data AS (
    SELECT
      SUM(amount)::DECIMAL(12, 2) as total_pay,
      COUNT(*)::INTEGER as count_pay
    FROM payments
    WHERE group_id = p_group_id
      AND deleted_at IS NULL
  ),
  member_data AS (
    SELECT COUNT(DISTINCT user_id)::INTEGER as member_cnt
    FROM group_members
    WHERE group_id = p_group_id
  ),
  active_user AS (
    SELECT
      e.paid_by_user_id as user_id,
      COUNT(*)::INTEGER as activity_count
    FROM expenses e
    WHERE e.group_id = p_group_id
      AND e.deleted_at IS NULL
    GROUP BY e.paid_by_user_id
    ORDER BY activity_count DESC
    LIMIT 1
  ),
  outstanding_data AS (
    SELECT
      SUM(es.computed_amount)::DECIMAL(12, 2) as outstanding
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  )
  SELECT
    COALESCE(ed.total_exp, 0)::DECIMAL(12, 2),
    COALESCE(pd.total_pay, 0)::DECIMAL(12, 2),
    COALESCE(ed.count_exp, 0)::INTEGER,
    COALESCE(pd.count_pay, 0)::INTEGER,
    COALESCE(md.member_cnt, 0)::INTEGER,
    au.user_id,
    p.display_name,
    COALESCE(au.activity_count, 0)::INTEGER,
    COALESCE(od.outstanding, 0)::DECIMAL(12, 2),
    gd.grp_created_at,
    gd.last_activity_date
  FROM group_data gd
  CROSS JOIN expense_data ed
  CROSS JOIN payment_data pd
  CROSS JOIN member_data md
  CROSS JOIN outstanding_data od
  LEFT JOIN active_user au ON true
  LEFT JOIN profiles p ON p.id = au.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 4: User Monthly Report
-- ========================================

-- Function to get comprehensive monthly report for a user
CREATE OR REPLACE FUNCTION get_user_monthly_report(
  p_user_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  total_spent DECIMAL(12, 2),
  total_owed_to_me DECIMAL(12, 2),
  total_i_owe DECIMAL(12, 2),
  net_balance DECIMAL(12, 2),
  expense_count INTEGER,
  payment_count INTEGER,
  top_category TEXT,
  top_category_amount DECIMAL(12, 2),
  most_expensive_date DATE,
  most_expensive_amount DECIMAL(12, 2),
  avg_expense DECIMAL(12, 2),
  group_count INTEGER,
  friend_count INTEGER
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  WITH user_expenses AS (
    SELECT
      SUM(es.computed_amount) as total_spent_amt,
      COUNT(DISTINCT e.id) as exp_count,
      AVG(es.computed_amount) as avg_exp_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_owes AS (
    SELECT
      SUM(es.computed_amount) as owed_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.paid_by_user_id != p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_owed AS (
    SELECT
      SUM(es.computed_amount) as owed_to_me_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id != p_user_id
      AND e.paid_by_user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_payments AS (
    SELECT COUNT(*) as pay_count
    FROM payments
    WHERE (from_user = p_user_id OR to_user = p_user_id)
      AND payment_date BETWEEN v_start_date AND v_end_date
      AND deleted_at IS NULL
  ),
  top_cat AS (
    SELECT
      e.category,
      SUM(es.computed_amount) as cat_total
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.category
    ORDER BY cat_total DESC
    LIMIT 1
  ),
  most_exp AS (
    SELECT
      e.expense_date,
      SUM(es.computed_amount) as daily_total
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.expense_date
    ORDER BY daily_total DESC
    LIMIT 1
  ),
  activity_counts AS (
    SELECT
      COUNT(DISTINCT e.group_id) as grp_count,
      COUNT(DISTINCT e.friendship_id) as friend_count
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
  )
  SELECT
    COALESCE(ue.total_spent_amt, 0)::DECIMAL(12, 2),
    COALESCE(uow.owed_to_me_amt, 0)::DECIMAL(12, 2),
    COALESCE(uo.owed_amt, 0)::DECIMAL(12, 2),
    (COALESCE(uow.owed_to_me_amt, 0) - COALESCE(uo.owed_amt, 0))::DECIMAL(12, 2) as net_bal,
    COALESCE(ue.exp_count, 0)::INTEGER,
    COALESCE(up.pay_count, 0)::INTEGER,
    tc.category,
    COALESCE(tc.cat_total, 0)::DECIMAL(12, 2),
    me.expense_date,
    COALESCE(me.daily_total, 0)::DECIMAL(12, 2),
    COALESCE(ue.avg_exp_amt, 0)::DECIMAL(12, 2),
    COALESCE(ac.grp_count, 0)::INTEGER,
    COALESCE(ac.friend_count, 0)::INTEGER
  FROM user_expenses ue
  CROSS JOIN user_owes uo
  CROSS JOIN user_owed uow
  CROSS JOIN user_payments up
  CROSS JOIN activity_counts ac
  LEFT JOIN top_cat tc ON true
  LEFT JOIN most_exp me ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 5: Friendship Activity Summary
-- ========================================

-- Function to get activity summary for a friendship
CREATE OR REPLACE FUNCTION get_friendship_activity(
  p_friendship_id UUID
)
RETURNS TABLE (
  total_expenses DECIMAL(12, 2),
  total_payments DECIMAL(12, 2),
  expense_count INTEGER,
  payment_count INTEGER,
  user_a_owes DECIMAL(12, 2),
  user_b_owes DECIMAL(12, 2),
  net_balance DECIMAL(12, 2),
  last_expense_date DATE,
  last_payment_date DATE,
  most_common_category TEXT
) AS $$
BEGIN
  -- Check if user has access to this friendship
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE id = p_friendship_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not part of this friendship';
  END IF;

  RETURN QUERY
  WITH expense_data AS (
    SELECT
      SUM(amount)::DECIMAL(12, 2) as total_exp,
      COUNT(*)::INTEGER as count_exp,
      MAX(expense_date) as last_exp_date
    FROM expenses
    WHERE friendship_id = p_friendship_id
      AND deleted_at IS NULL
      AND is_payment = false
  ),
  payment_data AS (
    SELECT
      SUM(amount)::DECIMAL(12, 2) as total_pay,
      COUNT(*)::INTEGER as count_pay,
      MAX(payment_date) as last_pay_date
    FROM payments
    WHERE friendship_id = p_friendship_id
      AND deleted_at IS NULL
  ),
  balance_data AS (
    SELECT
      f.user_a,
      f.user_b,
      COALESCE(SUM(CASE WHEN es.user_id = f.user_a THEN es.computed_amount ELSE 0 END), 0) as a_owes,
      COALESCE(SUM(CASE WHEN es.user_id = f.user_b THEN es.computed_amount ELSE 0 END), 0) as b_owes
    FROM friendships f
    LEFT JOIN expenses e ON e.friendship_id = f.id AND e.deleted_at IS NULL
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE f.id = p_friendship_id
    GROUP BY f.user_a, f.user_b
  ),
  category_data AS (
    SELECT
      e.category,
      COUNT(*) as cat_count
    FROM expenses e
    WHERE e.friendship_id = p_friendship_id
      AND e.deleted_at IS NULL
      AND e.category IS NOT NULL
    GROUP BY e.category
    ORDER BY cat_count DESC
    LIMIT 1
  )
  SELECT
    COALESCE(ed.total_exp, 0)::DECIMAL(12, 2),
    COALESCE(pd.total_pay, 0)::DECIMAL(12, 2),
    COALESCE(ed.count_exp, 0)::INTEGER,
    COALESCE(pd.count_pay, 0)::INTEGER,
    COALESCE(bd.a_owes, 0)::DECIMAL(12, 2),
    COALESCE(bd.b_owes, 0)::DECIMAL(12, 2),
    (COALESCE(bd.b_owes, 0) - COALESCE(bd.a_owes, 0))::DECIMAL(12, 2) as net_bal,
    ed.last_exp_date,
    pd.last_pay_date,
    cd.category
  FROM expense_data ed
  CROSS JOIN payment_data pd
  CROSS JOIN balance_data bd
  LEFT JOIN category_data cd ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 6: User Activity Heatmap Data
-- ========================================

-- Function to get daily activity for heatmap visualization
CREATE OR REPLACE FUNCTION get_user_activity_heatmap(
  p_user_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  activity_date DATE,
  expense_count INTEGER,
  payment_count INTEGER,
  total_amount DECIMAL(12, 2),
  day_of_week INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as activity_date
  ),
  daily_expenses AS (
    SELECT
      e.expense_date as activity_date,
      COUNT(DISTINCT e.id) as exp_count,
      SUM(es.computed_amount) as exp_amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.expense_date
  ),
  daily_payments AS (
    SELECT
      payment_date as activity_date,
      COUNT(*) as pay_count
    FROM payments
    WHERE (from_user = p_user_id OR to_user = p_user_id)
      AND payment_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      AND deleted_at IS NULL
    GROUP BY payment_date
  )
  SELECT
    ds.activity_date,
    COALESCE(de.exp_count, 0)::INTEGER as expense_count,
    COALESCE(dp.pay_count, 0)::INTEGER as payment_count,
    COALESCE(de.exp_amount, 0)::DECIMAL(12, 2) as total_amount,
    EXTRACT(DOW FROM ds.activity_date)::INTEGER as day_of_week
  FROM date_series ds
  LEFT JOIN daily_expenses de ON ds.activity_date = de.activity_date
  LEFT JOIN daily_payments dp ON ds.activity_date = dp.activity_date
  ORDER BY ds.activity_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 7: Grant Permissions
-- ========================================

GRANT EXECUTE ON FUNCTION get_expense_summary_by_category(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_spending_trend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_monthly_report(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friendship_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_heatmap(UUID, INTEGER) TO authenticated;

-- ========================================
-- Part 8: Comments for Documentation
-- ========================================

COMMENT ON FUNCTION get_expense_summary_by_category IS
  'Get expense breakdown by category for a user within date range. Returns category totals, counts, averages, and percentages.';

COMMENT ON FUNCTION get_spending_trend IS
  'Get weekly spending trend for specified number of weeks. Returns week-by-week spending with counts and averages.';

COMMENT ON FUNCTION get_group_stats IS
  'Get comprehensive statistics for a group including totals, counts, most active user, and outstanding balances. Enforces group membership.';

COMMENT ON FUNCTION get_user_monthly_report IS
  'Get comprehensive monthly financial report for a user including spending, balances, top categories, and activity counts.';

COMMENT ON FUNCTION get_friendship_activity IS
  'Get activity summary for a friendship including expenses, payments, balances. Enforces friendship access.';

COMMENT ON FUNCTION get_user_activity_heatmap IS
  'Get daily activity data for heatmap visualization. Returns expense/payment counts and amounts per day.';

COMMIT;

-- ========================================
-- Usage Examples
-- ========================================

-- Get category breakdown for last 30 days:
-- SELECT * FROM get_expense_summary_by_category(auth.uid(), CURRENT_DATE - 30, CURRENT_DATE);

-- Get 12-week spending trend:
-- SELECT * FROM get_spending_trend(auth.uid(), 12);

-- Get group statistics:
-- SELECT * FROM get_group_stats('group-uuid-here');

-- Get monthly report for December 2025:
-- SELECT * FROM get_user_monthly_report(auth.uid(), 12, 2025);

-- Get friendship activity:
-- SELECT * FROM get_friendship_activity('friendship-uuid-here');

-- Get 90-day activity heatmap:
-- SELECT * FROM get_user_activity_heatmap(auth.uid(), 90);
