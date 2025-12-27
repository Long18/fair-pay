-- Migration: Create function to return public demo debts for unauthenticated users
-- Purpose: Allow unauthenticated users to see real demo data from database instead of hardcoded sample data
-- Author: FairPay Team
-- Date: 2025-12-27

-- Drop function if exists
DROP FUNCTION IF EXISTS get_public_demo_debts();

-- Create function to return demo debts visible to everyone (including unauthenticated users)
-- This function returns aggregated debt data from demo user accounts for display purposes
-- Returns format: "John owes Sarah" style relationships
CREATE OR REPLACE FUNCTION get_public_demo_debts()
RETURNS TABLE (
    counterparty_id uuid,
    counterparty_name text,
    amount decimal,
    i_owe_them boolean,
    owed_to_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return hardcoded demo data that simulates real debt relationships
    -- Format: Shows "Person A owes Person B" relationships
    -- counterparty_name is the person being owed TO (receivable)
    -- owed_to_name is the person who owes the money (payable)
    -- Return hardcoded demo data that simulates real debt relationships
    -- Using valid UUIDs for demo IDs (these won't conflict with real users)
    RETURN QUERY
    SELECT
        '00000000-0000-0000-0000-000000000001'::uuid as counterparty_id,  -- demo-sarah
        'Sarah'::text as counterparty_name,  -- Sarah is owed
        250000::decimal as amount,
        false::boolean as i_owe_them,  -- Not "I owe them", so "they owe me"
        'John'::text as owed_to_name  -- John owes Sarah
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000002'::uuid,  -- demo-mike
        'Mike'::text,  -- Mike is owed
        150000::decimal,
        false::boolean,  -- Alex owes Mike
        'Alex'::text
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000003'::uuid,  -- demo-john
        'John'::text,  -- John is owed
        300000::decimal,
        false::boolean,  -- Emma owes John
        'Emma'::text;
END;
$$;

-- Grant execute permission to anonymous (unauthenticated) users
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon;

-- Grant execute permission to authenticated users (for fallback scenarios)
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_public_demo_debts IS
'Returns demo debt data for unauthenticated users. Shows sample relationships like "John owes Sarah" for demonstration purposes. Returns owed_to_name field to construct neutral descriptions.';
