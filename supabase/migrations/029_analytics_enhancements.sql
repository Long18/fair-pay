-- Migration: Analytics Enhancements
-- Description: Add historical balance tracking and advanced analytics queries
--              Enables trend analysis, comparison views, and insights generation

BEGIN;

-- ============================================================================
-- 1. BALANCE HISTORY TABLE
-- ============================================================================
-- Stores daily snapshots of user balances for historical trend analysis
-- Populated on-demand or via scheduled job

CREATE TABLE IF NOT EXISTS balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Balance breakdown by context
  total_owed NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_lent NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_balance NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Currency tracking
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT balance_history_user_date_currency_unique UNIQUE (user_id, snapshot_date, currency)
);

-- Indexes for performance
CREATE INDEX idx_balance_history_user_date ON balance_history(user_id, snapshot_date DESC);
CREATE INDEX idx_balance_history_date ON balance_history(snapshot_date DESC);
CREATE INDEX idx_balance_history_user_currency ON balance_history(user_id, currency);

-- RLS Policies
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance history"
  ON balance_history FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. CALCULATE DAILY BALANCE FUNCTION
-- ============================================================================
-- Calculates and stores balance snapshot for a specific user and date
-- Can be called on-demand or scheduled via cron

CREATE OR REPLACE FUNCTION calculate_daily_balance(
  p_user_id UUID,
  p_snapshot_date DATE DEFAULT CURRENT_DATE,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_owed NUMERIC(10,2);
  v_total_lent NUMERIC(10,2);
  v_net_balance NUMERIC(10,2);
BEGIN
  -- Calculate total owed (what user owes to others)
  SELECT COALESCE(SUM(es.computed_amount - COALESCE(es.settled_amount, 0)), 0)
  INTO v_total_owed
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.paid_by_user_id != p_user_id
    AND e.expense_date <= p_snapshot_date
    AND e.currency = p_currency
    AND e.is_payment = false;

  -- Calculate total lent (what others owe to user)
  SELECT COALESCE(SUM(es.computed_amount - COALESCE(es.settled_amount, 0)), 0)
  INTO v_total_lent
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.paid_by_user_id = p_user_id
    AND es.user_id != p_user_id
    AND e.expense_date <= p_snapshot_date
    AND e.currency = p_currency
    AND e.is_payment = false;

  -- Calculate net balance
  v_net_balance := v_total_lent - v_total_owed;

  -- Insert or update balance history
  INSERT INTO balance_history (
    user_id,
    snapshot_date,
    total_owed,
    total_lent,
    net_balance,
    currency
  )
  VALUES (
    p_user_id,
    p_snapshot_date,
    v_total_owed,
    v_total_lent,
    v_net_balance,
    p_currency
  )
  ON CONFLICT (user_id, snapshot_date, currency)
  DO UPDATE SET
    total_owed = EXCLUDED.total_owed,
    total_lent = EXCLUDED.total_lent,
    net_balance = EXCLUDED.net_balance,
    created_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_daily_balance(UUID, DATE, TEXT) TO authenticated;

-- ============================================================================
-- 3. GET BALANCE HISTORY RPC FUNCTION
-- ============================================================================
-- Retrieves historical balance data for a user within a date range
-- Auto-calculates missing snapshots on-demand

CREATE OR REPLACE FUNCTION get_balance_history(
  p_user_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS TABLE (
  snapshot_date DATE,
  total_owed NUMERIC(10,2),
  total_lent NUMERIC(10,2),
  net_balance NUMERIC(10,2),
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  -- Use provided user_id or default to current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Ensure balance history exists for date range
  -- Calculate missing snapshots on-demand
  FOR v_date IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE
  LOOP
    -- Check if snapshot exists
    IF NOT EXISTS (
      SELECT 1 FROM balance_history
      WHERE user_id = v_user_id
        AND snapshot_date = v_date
        AND currency = p_currency
    ) THEN
      -- Calculate and store snapshot
      PERFORM calculate_daily_balance(v_user_id, v_date, p_currency);
    END IF;
  END LOOP;

  -- Return balance history
  RETURN QUERY
  SELECT
    bh.snapshot_date,
    bh.total_owed,
    bh.total_lent,
    bh.net_balance,
    bh.currency
  FROM balance_history bh
  WHERE bh.user_id = v_user_id
    AND bh.snapshot_date BETWEEN p_start_date AND p_end_date
    AND bh.currency = p_currency
  ORDER BY bh.snapshot_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) TO authenticated;

-- ============================================================================
-- 4. GET TOP CATEGORIES RPC FUNCTION
-- ============================================================================
-- Returns top spending categories with amounts and percentages

CREATE OR REPLACE FUNCTION get_top_categories(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_group_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  category TEXT,
  total_amount NUMERIC(10,2),
  expense_count BIGINT,
  percentage NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total NUMERIC(10,2);
BEGIN
  -- Calculate total spending for percentage calculation
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Return top categories
  RETURN QUERY
  SELECT
    e.category,
    SUM(e.amount) as total_amount,
    COUNT(*)::BIGINT as expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END as percentage
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    )
  GROUP BY e.category
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_categories(DATE, DATE, UUID, INT) TO authenticated;

-- ============================================================================
-- 5. GET TOP SPENDERS RPC FUNCTION
-- ============================================================================
-- Returns top spenders in a group with amounts and percentages

CREATE OR REPLACE FUNCTION get_top_spenders(
  p_group_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  total_spent NUMERIC(10,2),
  expense_count BIGINT,
  percentage NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total NUMERIC(10,2);
BEGIN
  -- Calculate total group spending for percentage
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false;

  -- Return top spenders
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    SUM(e.amount) as total_spent,
    COUNT(*)::BIGINT as expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END as percentage
  FROM expenses e
  JOIN profiles p ON p.id = e.paid_by_user_id
  WHERE e.group_id = p_group_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_spent DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_spenders(UUID, DATE, DATE, INT) TO authenticated;

-- ============================================================================
-- 6. GET SPENDING COMPARISON RPC FUNCTION
-- ============================================================================
-- Compares spending between two periods (current vs previous)

CREATE OR REPLACE FUNCTION get_spending_comparison(
  p_current_start DATE,
  p_current_end DATE,
  p_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
  current_total NUMERIC(10,2),
  previous_total NUMERIC(10,2),
  difference NUMERIC(10,2),
  percentage_change NUMERIC(5,2),
  trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_total NUMERIC(10,2);
  v_previous_total NUMERIC(10,2);
  v_difference NUMERIC(10,2);
  v_percentage_change NUMERIC(5,2);
  v_trend TEXT;
  v_period_days INT;
  v_previous_start DATE;
  v_previous_end DATE;
BEGIN
  -- Calculate period length
  v_period_days := p_current_end - p_current_start;

  -- Calculate previous period dates
  v_previous_end := p_current_start - INTERVAL '1 day';
  v_previous_start := v_previous_end - (v_period_days || ' days')::INTERVAL;

  -- Calculate current period total
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_current_total
  FROM expenses e
  WHERE e.expense_date BETWEEN p_current_start AND p_current_end
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Calculate previous period total
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_previous_total
  FROM expenses e
  WHERE e.expense_date BETWEEN v_previous_start AND v_previous_end
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Calculate difference and percentage change
  v_difference := v_current_total - v_previous_total;

  IF v_previous_total > 0 THEN
    v_percentage_change := ROUND((v_difference / v_previous_total * 100)::NUMERIC, 2);
  ELSE
    v_percentage_change := 0;
  END IF;

  -- Determine trend
  IF v_difference > 0 THEN
    v_trend := 'increasing';
  ELSIF v_difference < 0 THEN
    v_trend := 'decreasing';
  ELSE
    v_trend := 'stable';
  END IF;

  -- Return comparison
  RETURN QUERY SELECT
    v_current_total,
    v_previous_total,
    v_difference,
    v_percentage_change,
    v_trend;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spending_comparison(DATE, DATE, UUID) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE balance_history IS
'Stores daily snapshots of user balances for historical trend analysis and charts';

COMMENT ON FUNCTION calculate_daily_balance(UUID, DATE, TEXT) IS
'Calculates and stores balance snapshot for a specific user and date. Used for populating balance_history table.';

COMMENT ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) IS
'Retrieves historical balance data for trend charts. Auto-calculates missing snapshots on-demand.';

COMMENT ON FUNCTION get_top_categories(DATE, DATE, UUID, INT) IS
'Returns top spending categories with amounts and percentages for analytics dashboard.';

COMMENT ON FUNCTION get_top_spenders(UUID, DATE, DATE, INT) IS
'Returns top spenders in a group for leaderboard-style analytics.';

COMMENT ON FUNCTION get_spending_comparison(DATE, DATE, UUID) IS
'Compares current period spending vs previous period for trend analysis.';

COMMIT;

-- Verification queries (commented out for production)
-- SELECT * FROM get_balance_history(auth.uid(), CURRENT_DATE - 30, CURRENT_DATE);
-- SELECT * FROM get_top_categories(CURRENT_DATE - 30, CURRENT_DATE, NULL, 5);
-- SELECT * FROM get_spending_comparison(CURRENT_DATE - 7, CURRENT_DATE);
