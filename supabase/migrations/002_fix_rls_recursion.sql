-- Migration: 002_fix_rls_recursion.sql
-- Description: Fix infinite recursion in group_members RLS policies
-- Date: 2025-12-26
-- Issue: The "Group members can view other members" policy causes infinite recursion
--        by querying group_members while being evaluated on group_members

BEGIN;

-- ========================================
-- FIX: Remove Recursive RLS Policy
-- ========================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Group members can view other members" ON group_members;

-- ========================================
-- SOLUTION 1: Fix the helper function to bypass RLS
-- ========================================

-- The existing user_is_group_member() function is SECURITY DEFINER
-- but it doesn't bypass RLS, so it still causes recursion
-- We need to add "SET LOCAL row_security = off" to bypass RLS

CREATE OR REPLACE FUNCTION user_is_group_member(group_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS to prevent recursion
  SET LOCAL row_security = off;

  RETURN EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = group_uuid
      AND user_id = auth.uid()
  );
END;
$$;

-- ========================================
-- SOLUTION 2: Use the fixed helper function in policy
-- ========================================

-- Now we can safely use the function in the policy
CREATE POLICY "Group members can view other members"
  ON group_members FOR SELECT
  TO authenticated
  USING (user_is_group_member(group_id));

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
BEGIN
  -- Verify the policy was recreated
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Group members can view other members'
  ) THEN
    RAISE NOTICE '✓ RLS policy "Group members can view other members" fixed successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to recreate RLS policy';
  END IF;
END $$;

COMMIT;

-- ========================================
-- EXPLANATION
-- ========================================

-- BEFORE (Recursive):
-- USING (
--   group_id IN (
--     SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()
--   )
-- )
-- This queries group_members WHILE evaluating group_members RLS → infinite recursion

-- AFTER (Non-Recursive):
-- USING (user_is_group_member(group_id))
-- The function is SECURITY DEFINER with "SET LOCAL row_security = off"
-- It bypasses RLS internally, breaking the recursion cycle
