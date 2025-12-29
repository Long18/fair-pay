-- Migration: Individual Split Settlement
-- Description: Add fields to track individual split settlements and create functions for settling splits
-- Date: 2025-12-29

BEGIN;

-- Add settlement tracking fields to expense_splits
ALTER TABLE expense_splits
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS settled_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Create index for settled splits
CREATE INDEX IF NOT EXISTS idx_expense_splits_settled ON expense_splits(is_settled, expense_id) WHERE is_settled = true;

-- Function to settle an individual split
CREATE OR REPLACE FUNCTION settle_split(
  p_split_id UUID,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
  v_settled_amount DECIMAL;
BEGIN
  -- Get split details
  SELECT * INTO v_split
  FROM expense_splits
  WHERE id = p_split_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found';
  END IF;

  -- Get expense details
  SELECT * INTO v_expense
  FROM expenses
  WHERE id = v_split.expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Check if user is the payer
  IF v_expense.paid_by_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the payer can settle splits';
  END IF;

  -- Check if split is already settled
  IF v_split.is_settled THEN
    RAISE EXCEPTION 'Split is already settled';
  END IF;

  -- Determine settlement amount (default to full computed_amount)
  v_settled_amount := COALESCE(p_amount, v_split.computed_amount);

  -- Validate settlement amount
  IF v_settled_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0';
  END IF;

  IF v_settled_amount > v_split.computed_amount THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount';
  END IF;

  -- Update split as settled
  UPDATE expense_splits
  SET
    is_settled = true,
    settled_amount = v_settled_amount,
    settled_at = NOW()
  WHERE id = p_split_id;

  -- Return success with split details
  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'settled_amount', v_settled_amount,
    'computed_amount', v_split.computed_amount,
    'is_partial', v_settled_amount < v_split.computed_amount
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION settle_split(UUID, DECIMAL) TO authenticated;

-- Function to unsettle a split (for corrections)
CREATE OR REPLACE FUNCTION unsettle_split(p_split_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
BEGIN
  -- Get split details
  SELECT * INTO v_split
  FROM expense_splits
  WHERE id = p_split_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found';
  END IF;

  -- Get expense details
  SELECT * INTO v_expense
  FROM expenses
  WHERE id = v_split.expense_id;

  -- Check if user is the payer
  IF v_expense.paid_by_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the payer can unsettle splits';
  END IF;

  -- Update split as unsettled
  UPDATE expense_splits
  SET
    is_settled = false,
    settled_amount = 0,
    settled_at = NULL
  WHERE id = p_split_id;

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION unsettle_split(UUID) TO authenticated;

-- Drop existing settle_expense function if it exists (to handle return type change)
DROP FUNCTION IF EXISTS settle_expense(UUID);

-- Update settle_expense function to mark individual splits as settled
CREATE OR REPLACE FUNCTION settle_expense(p_expense_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense RECORD;
  v_splits_count INTEGER;
BEGIN
  -- Get expense details
  SELECT * INTO v_expense
  FROM expenses
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Check if user is the payer
  IF v_expense.paid_by_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the payer can settle the expense';
  END IF;

  -- Check if already settled
  IF v_expense.is_payment THEN
    RAISE EXCEPTION 'Expense is already settled';
  END IF;

  -- Mark all splits as settled
  UPDATE expense_splits
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  WHERE expense_id = p_expense_id
    AND is_settled = false;

  GET DIAGNOSTICS v_splits_count = ROW_COUNT;

  -- Mark expense as paid
  UPDATE expenses
  SET is_payment = true
  WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'splits_settled', v_splits_count
  );
END;
$$;

-- Drop existing get_expense_splits_public function if it exists (to handle return type change)
DROP FUNCTION IF EXISTS get_expense_splits_public(UUID);

-- Update get_expense_splits_public to include settlement fields
CREATE OR REPLACE FUNCTION get_expense_splits_public(p_expense_id UUID)
RETURNS TABLE (
  id UUID,
  expense_id UUID,
  user_id UUID,
  split_method TEXT,
  split_value DECIMAL,
  computed_amount DECIMAL,
  is_settled BOOLEAN,
  settled_amount DECIMAL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_full_name TEXT,
  user_avatar_url TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.id,
    es.expense_id,
    es.user_id,
    es.split_method,
    es.split_value,
    es.computed_amount,
    es.is_settled,
    es.settled_amount,
    es.settled_at,
    es.created_at,
    p.full_name as user_full_name,
    p.avatar_url as user_avatar_url
  FROM expense_splits es
  JOIN profiles p ON p.id = es.user_id
  WHERE es.expense_id = p_expense_id
  ORDER BY p.full_name;
END;
$$;

COMMIT;

-- Comments
COMMENT ON COLUMN expense_splits.is_settled IS 'Whether this split has been settled by the payer';
COMMENT ON COLUMN expense_splits.settled_amount IS 'Amount that was settled (may be partial)';
COMMENT ON COLUMN expense_splits.settled_at IS 'Timestamp when the split was settled';
COMMENT ON FUNCTION settle_split(UUID, DECIMAL) IS 'Settle an individual split with optional custom amount';
COMMENT ON FUNCTION unsettle_split(UUID) IS 'Unsettle a split (for corrections)';
