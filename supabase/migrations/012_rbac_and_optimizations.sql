-- Migration: 012_rbac_and_optimizations.sql
-- Description: Add role-based access control and optimize balance calculations
-- Date: 2025-01-XX
-- Dependencies: All previous migrations

-- ========================================
-- Part 1: RBAC - User Roles
-- ========================================

-- Create user_roles table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 2: Optimized Balance Calculations
-- ========================================

-- Function to calculate user's global balance across all groups
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_owed_to_me NUMERIC,
  total_i_owe NUMERIC,
  net_balance NUMERIC
) AS $$
DECLARE
  v_owed_to_me NUMERIC := 0;
  v_i_owe NUMERIC := 0;
BEGIN
  -- Calculate what others owe me (I paid more than my share)
  SELECT COALESCE(SUM(
    CASE
      WHEN e.paid_by_user_id = p_user_id THEN
        e.amount - COALESCE((
          SELECT computed_amount
          FROM expense_splits
          WHERE expense_id = e.id AND user_id = p_user_id
        ), 0)
      ELSE
        0
    END
  ), 0) INTO v_owed_to_me
  FROM expenses e
  WHERE e.is_payment = false
    AND (
      e.paid_by_user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = p_user_id
      )
    );

  -- Calculate what I owe others (others paid and I owe my share)
  SELECT COALESCE(SUM(es.computed_amount), 0) INTO v_i_owe
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.paid_by_user_id != p_user_id
    AND e.is_payment = false;

  -- Adjust for payments made and received
  v_owed_to_me := v_owed_to_me - COALESCE((
    SELECT SUM(amount) FROM payments WHERE from_user = p_user_id
  ), 0);

  v_i_owe := v_i_owe - COALESCE((
    SELECT SUM(amount) FROM payments WHERE to_user = p_user_id
  ), 0);

  RETURN QUERY SELECT
    GREATEST(v_owed_to_me, 0),
    GREATEST(v_i_owe, 0),
    v_owed_to_me - v_i_owe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get aggregated debts for a user
CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  amount NUMERIC,
  i_owe_them BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH debt_calculations AS (
    SELECT
      CASE
        WHEN owes_user = p_user_id THEN owed_user
        WHEN owed_user = p_user_id THEN owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN owes_user = p_user_id THEN amount_owed
        WHEN owed_user = p_user_id THEN -amount_owed
        ELSE 0
      END as signed_amount
    FROM user_debts_summary
    WHERE owes_user = p_user_id OR owed_user = p_user_id
  )
  SELECT
    dc.other_user_id,
    p.full_name,
    ABS(dc.signed_amount),
    dc.signed_amount > 0 as i_owe_them
  FROM debt_calculations dc
  JOIN profiles p ON p.id = dc.other_user_id
  WHERE dc.other_user_id IS NOT NULL
    AND dc.signed_amount != 0
  ORDER BY ABS(dc.signed_amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 3: Admin-Only Operations
-- ========================================

-- Add RLS policy to restrict bulk operations to admins
-- (This will be applied to any future bulk import tables)

-- Create function for safe bulk insert (admin only)
CREATE OR REPLACE FUNCTION admin_bulk_insert_expenses(
  p_expenses JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required for bulk operations';
  END IF;

  -- Insert expenses from JSON array
  INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    expense_date, paid_by_user_id, created_by
  )
  SELECT
    (elem->>'context_type')::TEXT,
    (elem->>'group_id')::UUID,
    (elem->>'description')::TEXT,
    (elem->>'amount')::NUMERIC,
    COALESCE((elem->>'currency')::TEXT, 'VND'),
    COALESCE((elem->>'expense_date')::DATE, CURRENT_DATE),
    (elem->>'paid_by_user_id')::UUID,
    auth.uid()
  FROM jsonb_array_elements(p_expenses) elem;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_insert_expenses(JSONB) TO authenticated;

-- ========================================
-- Part 4: Performance Indexes
-- ========================================

-- Add indexes for balance calculation queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_involvement
  ON expenses(paid_by_user_id, is_payment)
  WHERE is_payment = false;

CREATE INDEX IF NOT EXISTS idx_expense_splits_user_expense
  ON expense_splits(user_id, expense_id);

CREATE INDEX IF NOT EXISTS idx_payments_users
  ON payments(from_user, to_user);

-- Analyze tables for query optimization
ANALYZE expenses;
ANALYZE expense_splits;
ANALYZE payments;
ANALYZE profiles;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_balance IS 'Calculates total owed to me, total I owe, and net balance for a user';
COMMENT ON FUNCTION get_user_debts_aggregated IS 'Returns list of people and amounts owed/owing in aggregated form';
COMMENT ON FUNCTION is_admin IS 'Returns true if current user has admin role';
COMMENT ON TABLE user_roles IS 'Stores user role assignments (admin or user)';
