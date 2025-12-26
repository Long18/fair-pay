-- Migration: 004_payments.sql
-- Description: Create payments table with RLS policies for settlement tracking
-- Date: 2025-12-25
-- Dependencies: 001_profiles.sql, 002_groups.sql

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('group', 'friend')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT context_required CHECK (
    (context_type = 'group' AND group_id IS NOT NULL AND friendship_id IS NULL) OR
    (context_type = 'friend' AND friendship_id IS NOT NULL AND group_id IS NULL)
  ),
  CONSTRAINT different_users CHECK (from_user != to_user)
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_group_id ON payments(group_id);
CREATE INDEX idx_payments_friendship_id ON payments(friendship_id);
CREATE INDEX idx_payments_from_user ON payments(from_user);
CREATE INDEX idx_payments_to_user ON payments(to_user);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for payments
-- ========================================

-- SELECT: Involved parties can view payments
CREATE POLICY "Involved parties can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    -- User is sender or receiver
    (from_user = auth.uid() OR to_user = auth.uid())
    OR
    -- Or user is in the group (for group context)
    (context_type = 'group' AND group_id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Or user is part of the friendship (for friend context)
    (context_type = 'friend' AND friendship_id IN (
      SELECT id
      FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

-- INSERT: Users can record payments they make
CREATE POLICY "Users can record payments they make"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- from_user must be the authenticated user
    from_user = auth.uid()
    AND
    -- created_by must be the authenticated user
    created_by = auth.uid()
    AND
    (
      -- Group payments: user is member of the group
      (context_type = 'group' AND group_id IN (
        SELECT group_id
        FROM group_members
        WHERE user_id = auth.uid()
      ))
      OR
      -- Friend payments: user is part of the friendship
      (context_type = 'friend' AND friendship_id IN (
        SELECT id
        FROM friendships
        WHERE (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
      ))
    )
  );

-- DELETE: Payment creator can delete
CREATE POLICY "Payment creator can delete"
  ON payments
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Note: Payments are immutable - no UPDATE policy
-- If a payment was incorrect, delete and create a new one

-- Comments for documentation
COMMENT ON TABLE payments IS 'Settlement payments between users to clear debts';
COMMENT ON COLUMN payments.context_type IS 'Whether payment is within a group or between friends';
COMMENT ON COLUMN payments.from_user IS 'User who made the payment';
COMMENT ON COLUMN payments.to_user IS 'User who received the payment';
COMMENT ON COLUMN payments.amount IS 'Payment amount';
COMMENT ON COLUMN payments.currency IS 'Currency code (default VND)';
COMMENT ON COLUMN payments.payment_date IS 'Date when payment was made';
COMMENT ON COLUMN payments.note IS 'Optional note about the payment';
