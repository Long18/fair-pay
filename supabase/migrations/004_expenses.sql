-- Migration: 003_expenses.sql
-- Description: Create expenses and expense_splits tables with RLS policies
-- Date: 2025-12-25
-- Dependencies: 001_profiles.sql, 002_groups.sql

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('group', 'friend')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  category TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_payment BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT context_required CHECK (
    (context_type = 'group' AND group_id IS NOT NULL AND friendship_id IS NULL) OR
    (context_type = 'friend' AND friendship_id IS NOT NULL AND group_id IS NULL)
  )
);

-- Add trigger for updated_at on expenses
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create expense_splits table
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'exact', 'percentage')),
  split_value DECIMAL(12, 2),
  computed_amount DECIMAL(12, 2) NOT NULL CHECK (computed_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_friendship_id ON expenses(friendship_id);
CREATE INDEX idx_expenses_paid_by_user_id ON expenses(paid_by_user_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for expenses
-- ========================================

-- SELECT: Group members or friends can view expenses
CREATE POLICY "Participants can view expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    -- Group expenses: user is member of the group
    (context_type = 'group' AND group_id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Friend expenses: user is part of the friendship
    (context_type = 'friend' AND friendship_id IN (
      SELECT id
      FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

-- INSERT: Group members or friends can create expenses
CREATE POLICY "Group members or friends can create expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Creator must be the one creating
    created_by = auth.uid()
    AND
    (
      -- Group expenses: user is member of the group
      (context_type = 'group' AND group_id IN (
        SELECT group_id
        FROM group_members
        WHERE user_id = auth.uid()
      ))
      OR
      -- Friend expenses: user is part of the friendship
      (context_type = 'friend' AND friendship_id IN (
        SELECT id
        FROM friendships
        WHERE (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
      ))
    )
  );

-- UPDATE: Expense creator can update
CREATE POLICY "Expense creator can update"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Expense creator can delete
CREATE POLICY "Expense creator can delete"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- RLS Policies for expense_splits
-- ========================================

-- SELECT: Can view splits for expenses you can view
CREATE POLICY "Can view splits for accessible expenses"
  ON expense_splits
  FOR SELECT
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE
        (context_type = 'group' AND group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ))
        OR
        (context_type = 'friend' AND friendship_id IN (
          SELECT id FROM friendships
          WHERE (user_a = auth.uid() OR user_b = auth.uid())
            AND status = 'accepted'
        ))
    )
  );

-- INSERT: Expense creator can add splits
CREATE POLICY "Expense creator can add splits"
  ON expense_splits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

-- UPDATE: Expense creator can update splits
CREATE POLICY "Expense creator can update splits"
  ON expense_splits
  FOR UPDATE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

-- DELETE: Expense creator can delete splits
CREATE POLICY "Expense creator can delete splits"
  ON expense_splits
  FOR DELETE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

-- ========================================
-- Helper function: Validate split totals
-- ========================================

CREATE OR REPLACE FUNCTION validate_expense_splits()
RETURNS TRIGGER AS $$
DECLARE
  expense_amount DECIMAL(12, 2);
  total_splits DECIMAL(12, 2);
BEGIN
  -- Get the expense amount
  SELECT amount INTO expense_amount
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Calculate total of all splits for this expense
  SELECT COALESCE(SUM(computed_amount), 0) INTO total_splits
  FROM expense_splits
  WHERE expense_id = NEW.expense_id;

  -- Check if total matches expense amount (with small tolerance for rounding)
  IF ABS(total_splits - expense_amount) > 0.01 THEN
    RAISE EXCEPTION 'Sum of splits (%) does not match expense amount (%)',
      total_splits, expense_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger commented out for now - validation will be done in application
-- Can be enabled later for extra safety
-- CREATE TRIGGER validate_splits_on_insert
--   AFTER INSERT ON expense_splits
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_expense_splits();

-- Comments for documentation
COMMENT ON TABLE expenses IS 'Expenses shared among group members or friends';
COMMENT ON COLUMN expenses.context_type IS 'Whether expense is for a group or between friends';
COMMENT ON COLUMN expenses.amount IS 'Total expense amount';
COMMENT ON COLUMN expenses.currency IS 'Currency code (default VND)';
COMMENT ON COLUMN expenses.category IS 'Expense category (food, transport, etc)';
COMMENT ON COLUMN expenses.paid_by_user_id IS 'User who paid for the expense';
COMMENT ON COLUMN expenses.is_payment IS 'True if this is a settlement payment';

COMMENT ON TABLE expense_splits IS 'How an expense is split among participants';
COMMENT ON COLUMN expense_splits.split_method IS 'How to split: equal, exact amount, or percentage';
COMMENT ON COLUMN expense_splits.split_value IS 'Value for exact or percentage splits';
COMMENT ON COLUMN expense_splits.computed_amount IS 'Final calculated amount for this user';
