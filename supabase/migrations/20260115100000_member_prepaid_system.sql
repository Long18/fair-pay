-- Migration: Per-Member Prepaid System
-- Description: Redesign prepaid system to track balances per member instead of per expense
-- Requirements: Enable individual members to prepay their shares independently
-- Test Case: iCloud subscription 200k/month, 4 members, Member A prepays 5 months = 250k

-- ========================================
-- SECTION 1: member_prepaid_balances TABLE
-- Track prepaid balance for each member of a recurring expense
-- ========================================

CREATE TABLE IF NOT EXISTS member_prepaid_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  monthly_share_amount DECIMAL(12, 2) NOT NULL CHECK (monthly_share_amount > 0),
  months_remaining INTEGER GENERATED ALWAYS AS (
    FLOOR(balance_amount / NULLIF(monthly_share_amount, 0))
  ) STORED,
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_member_recurring UNIQUE(recurring_expense_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_member_prepaid_balances_recurring
  ON member_prepaid_balances(recurring_expense_id);

CREATE INDEX idx_member_prepaid_balances_user
  ON member_prepaid_balances(user_id);

CREATE INDEX idx_member_prepaid_balances_balance
  ON member_prepaid_balances(balance_amount)
  WHERE balance_amount > 0;

-- Add table comments
COMMENT ON TABLE member_prepaid_balances IS
'Per-member prepaid balances for recurring expenses. Tracks how much each member has prepaid and calculates months remaining.';

COMMENT ON COLUMN member_prepaid_balances.balance_amount IS
'Current prepaid balance in currency units. Cannot be negative.';

COMMENT ON COLUMN member_prepaid_balances.monthly_share_amount IS
'Member monthly share from template expense splits. Cached for performance.';

COMMENT ON COLUMN member_prepaid_balances.months_remaining IS
'Computed column: floor(balance / monthly_share). Auto-calculated.';

-- ========================================
-- SECTION 2: MODIFY recurring_prepaid_payments TABLE
-- Add user_id and paid_by_user_id for per-member tracking
-- ========================================

-- Add user_id column (which member this prepaid is for)
ALTER TABLE recurring_prepaid_payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add paid_by_user_id column (who made the payment)
ALTER TABLE recurring_prepaid_payments
  ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_user
  ON recurring_prepaid_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_paid_by
  ON recurring_prepaid_payments(paid_by_user_id);

-- Add column comments
COMMENT ON COLUMN recurring_prepaid_payments.user_id IS
'Member who this prepaid is for. NULL for legacy expense-level prepaid.';

COMMENT ON COLUMN recurring_prepaid_payments.paid_by_user_id IS
'Member who made the payment. Can differ from user_id (someone else paying for them).';

-- ========================================
-- SECTION 3: prepaid_consumption_log TABLE
-- Audit trail of prepaid consumption when instances generated
-- ========================================

CREATE TABLE IF NOT EXISTS prepaid_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  expense_instance_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_consumed DECIMAL(12, 2) NOT NULL CHECK (amount_consumed > 0),
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_balance_deduction CHECK (balance_after = balance_before - amount_consumed)
);

-- Create indexes for efficient queries
CREATE INDEX idx_prepaid_consumption_recurring
  ON prepaid_consumption_log(recurring_expense_id);

CREATE INDEX idx_prepaid_consumption_instance
  ON prepaid_consumption_log(expense_instance_id);

CREATE INDEX idx_prepaid_consumption_user
  ON prepaid_consumption_log(user_id);

CREATE INDEX idx_prepaid_consumption_date
  ON prepaid_consumption_log(consumed_at DESC);

-- Add table comments
COMMENT ON TABLE prepaid_consumption_log IS
'Audit trail of prepaid consumption when recurring instances are generated. Tracks which member had prepaid consumed and amounts.';

COMMENT ON COLUMN prepaid_consumption_log.expense_instance_id IS
'The recurring expense instance where prepaid was consumed.';

COMMENT ON COLUMN prepaid_consumption_log.amount_consumed IS
'Amount deducted from member prepaid balance for this instance.';

-- ========================================
-- SECTION 4: RLS POLICIES for member_prepaid_balances
-- ========================================

ALTER TABLE member_prepaid_balances ENABLE ROW LEVEL SECURITY;

-- Users can view prepaid balances for recurring expenses they have access to
CREATE POLICY "Users can view prepaid balances for their recurring expenses"
  ON member_prepaid_balances FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_id = auth.uid() OR friend_id = auth.uid()
        )
    )
  );

-- Service role can manage all prepaid balances
CREATE POLICY "Service role can manage prepaid balances"
  ON member_prepaid_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- SECTION 5: RLS POLICIES for prepaid_consumption_log
-- ========================================

ALTER TABLE prepaid_consumption_log ENABLE ROW LEVEL SECURITY;

-- Users can view consumption log for recurring expenses they have access to
CREATE POLICY "Users can view consumption log for their recurring expenses"
  ON prepaid_consumption_log FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_id = auth.uid() OR friend_id = auth.uid()
        )
    )
  );

-- Service role can manage all consumption logs
CREATE POLICY "Service role can manage consumption logs"
  ON prepaid_consumption_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- SECTION 6: GRANTS
-- ========================================

-- Grant permissions for authenticated users
GRANT SELECT ON member_prepaid_balances TO authenticated;
GRANT SELECT ON prepaid_consumption_log TO authenticated;

-- Service role needs full access for RPC functions
GRANT ALL ON member_prepaid_balances TO service_role;
GRANT ALL ON prepaid_consumption_log TO service_role;
