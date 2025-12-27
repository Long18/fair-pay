-- Rollback: Remove public demo data function
-- Purpose: Rollback migration 009_public_demo_data_function.sql
-- Author: FairPay Team
-- Date: 2025-12-27

-- Revoke permissions
REVOKE EXECUTE ON FUNCTION get_public_demo_debts() FROM anon;
REVOKE EXECUTE ON FUNCTION get_public_demo_debts() FROM authenticated;

-- Drop function
DROP FUNCTION IF EXISTS get_public_demo_debts();
