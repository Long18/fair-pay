-- Migration: Enable Public Access to Recent Activity
-- Purpose: Allow unauthenticated users to view recent expenses and payments for public dashboard
-- Date: 2025-12-26

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Participants can view expenses" ON expenses;
DROP POLICY IF EXISTS "Involved parties can view payments" ON payments;

-- Recreate expenses SELECT policy with public access
CREATE POLICY "Public can view all expenses"
  ON expenses FOR SELECT
  USING (true);  -- Allow everyone to view all expenses

-- Recreate payments SELECT policy with public access
CREATE POLICY "Public can view all payments"
  ON payments FOR SELECT
  USING (true);  -- Allow everyone to view all payments

-- Note: INSERT, UPDATE, DELETE policies remain authenticated-only for security
-- This only opens up READ access for the public dashboard
