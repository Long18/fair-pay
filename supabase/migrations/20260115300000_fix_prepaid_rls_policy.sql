-- Migration: Fix RLS policies for recurring_prepaid_payments
-- Description: Allow group members to record prepaid payments, not just expense creators
-- Issue: SECURITY DEFINER functions couldn't insert due to restrictive RLS policies

-- ========================================
-- SECTION 1: Grant service_role full access
-- Required for SECURITY DEFINER functions to work properly
-- ========================================

GRANT ALL ON recurring_prepaid_payments TO service_role;

-- ========================================
-- SECTION 2: Add service_role RLS policy
-- Allows SECURITY DEFINER functions to bypass RLS
-- ========================================

DROP POLICY IF EXISTS "Service role can manage prepaid payments" ON recurring_prepaid_payments;
CREATE POLICY "Service role can manage prepaid payments"
  ON recurring_prepaid_payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- SECTION 3: Update INSERT policy for group members
-- Allow any authenticated group member to record prepaid payments
-- ========================================

-- Drop the restrictive old policy
DROP POLICY IF EXISTS "Users can create prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments;

-- Create new policy that allows group members to insert
CREATE POLICY "Users can create prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE
        -- Creator can always insert
        e.created_by = auth.uid()
        -- Group members can insert
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        -- Friendship members can insert
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_a = auth.uid() OR user_b = auth.uid()
        )
    )
  );

-- ========================================
-- SECTION 4: Update SELECT policy for group members
-- Ensure group members can view prepaid payments
-- ========================================

-- Drop the restrictive old policy
DROP POLICY IF EXISTS "Users can view prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments;

-- Create new policy that allows group members to view
CREATE POLICY "Users can view prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE
        -- Creator can always view
        e.created_by = auth.uid()
        -- Group members can view
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        -- Friendship members can view
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_a = auth.uid() OR user_b = auth.uid()
        )
    )
  );

-- ========================================
-- SECTION 5: Update DELETE policy for group members
-- ========================================

-- Drop the old policy
DROP POLICY IF EXISTS "Users can delete their own prepaid payments"
  ON recurring_prepaid_payments;

-- Create new policy that allows group members to delete
CREATE POLICY "Users can delete their own prepaid payments"
  ON recurring_prepaid_payments FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE
        e.created_by = auth.uid()
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_a = auth.uid() OR user_b = auth.uid()
        )
    )
  );
