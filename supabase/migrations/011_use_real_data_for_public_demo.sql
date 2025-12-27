-- Migration: Update public demo debts to return real production data
-- Purpose: Allow unauthenticated users to see real production data from a specific user
-- Date: 2025-12-27

-- Drop existing function
DROP FUNCTION IF EXISTS get_public_demo_debts();

-- Create function to return REAL debts from a specific user (for demo purposes)
-- This shows actual production data to unauthenticated users
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
DECLARE
    -- Hardcoded demo user ID (Long's account)
    demo_user_id uuid := '9ac73f98-d6ff-54dd-8337-e96816e855c1';
BEGIN
    -- Return real debts from demo user by querying directly from user_debts_summary
    -- This bypasses authentication requirements and shows actual production data
    RETURN QUERY
    WITH debt_calculations AS (
        SELECT
            CASE
                WHEN owes_user = demo_user_id THEN owed_user
                WHEN owed_user = demo_user_id THEN owes_user
                ELSE NULL
            END as other_user_id,
            CASE
                WHEN owes_user = demo_user_id THEN amount_owed
                WHEN owed_user = demo_user_id THEN -amount_owed
                ELSE 0
            END as signed_amount
        FROM user_debts_summary
        WHERE owes_user = demo_user_id OR owed_user = demo_user_id
    )
    SELECT
        dc.other_user_id as counterparty_id,
        p.full_name as counterparty_name,
        ABS(dc.signed_amount) as amount,
        dc.signed_amount > 0 as i_owe_them,
        NULL::text as owed_to_name
    FROM debt_calculations dc
    JOIN profiles p ON p.id = dc.other_user_id
    WHERE dc.other_user_id IS NOT NULL
      AND dc.signed_amount != 0
    ORDER BY ABS(dc.signed_amount) DESC;
END;
$$;

-- Grant execute permission to anonymous (unauthenticated) users
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon;

-- Grant execute permission to authenticated users (for fallback scenarios)
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_public_demo_debts IS
'Returns REAL production debt data from demo user account. Shows actual debts for demonstration purposes to unauthenticated users. Uses user Long account as demo data source.';

