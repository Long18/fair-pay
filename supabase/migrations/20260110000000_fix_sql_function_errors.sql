-- Migration: Fix SQL Function Errors - Comprehensive Solution
-- Created: 2026-01-10
-- Purpose: Fix ambiguous column references and type mismatches in SQL functions
--
-- Root Causes:
-- 1. get_balance_history: Ambiguous column reference "snapshot_date" - PostgreSQL confuses
--    between RETURN TABLE column names and query column names
-- 2. get_top_categories: Type mismatch - expense_category ENUM returned as TEXT without cast
--
-- Solution Pattern:
-- - All RETURN TABLE functions must use explicit column aliases in SELECT
-- - All functions must set explicit search_path to prevent schema conflicts
-- - ENUM types must be explicitly cast to TEXT when returning as TEXT

-- =============================================
-- 1. Fix get_balance_history function
-- =============================================
-- Issue: Ambiguous column reference "snapshot_date"
-- Fix: Add explicit column aliases and SET search_path

CREATE OR REPLACE FUNCTION get_balance_history(
    p_user_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT (CURRENT_DATE - '30 days'::interval),
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_currency TEXT DEFAULT 'VND'
)
RETURNS TABLE(
    snapshot_date DATE,
    total_owed NUMERIC,
    total_lent NUMERIC,
    net_balance NUMERIC,
    currency TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
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
    -- Check if snapshot exists (use explicit table alias to avoid ambiguity)
    IF NOT EXISTS (
      SELECT 1 FROM balance_history bh_check
      WHERE bh_check.user_id = v_user_id
        AND bh_check.snapshot_date = v_date
        AND bh_check.currency = p_currency
    ) THEN
      -- Calculate and store snapshot
      PERFORM calculate_daily_balance(v_user_id, v_date, p_currency);
    END IF;
  END LOOP;

  -- Return balance history with explicit column aliases matching RETURN TABLE
  RETURN QUERY
  SELECT
    bh.snapshot_date AS snapshot_date,
    bh.total_owed AS total_owed,
    bh.total_lent AS total_lent,
    bh.net_balance AS net_balance,
    bh.currency AS currency
  FROM balance_history bh
  WHERE bh.user_id = v_user_id
    AND bh.snapshot_date BETWEEN p_start_date AND p_end_date
    AND bh.currency = p_currency
  ORDER BY bh.snapshot_date ASC;
END;
$$;

COMMENT ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) IS
'Retrieves historical balance data for trend charts. Auto-calculates missing snapshots on-demand. Fixed ambiguous column reference with explicit aliases and search_path.';

-- =============================================
-- 2. Fix get_top_categories function
-- =============================================
-- Issue: Type mismatch - expense_category ENUM returned as TEXT
-- Fix: Explicit cast to TEXT and SET search_path

CREATE OR REPLACE FUNCTION get_top_categories(
    p_start_date DATE DEFAULT (CURRENT_DATE - '30 days'::interval),
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_group_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    category TEXT,
    total_amount NUMERIC,
    expense_count BIGINT,
    percentage NUMERIC
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
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

  -- Return top categories with explicit TEXT cast for ENUM type
  RETURN QUERY
  SELECT
    e.category::TEXT AS category,
    SUM(e.amount) AS total_amount,
    COUNT(*)::BIGINT AS expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END AS percentage
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

COMMENT ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) IS
'Returns top spending categories with amounts and percentages for analytics dashboard. Fixed type mismatch by explicitly casting expense_category ENUM to TEXT.';

-- =============================================
-- 3. Grant permissions (idempotent)
-- =============================================
GRANT EXECUTE ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_history(UUID, DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_categories(DATE, DATE, UUID, INTEGER) TO anon;
