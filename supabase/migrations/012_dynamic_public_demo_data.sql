-- Migration: Dynamic public demo data - automatically shows top debtor
-- Purpose: Show real production data without hardcoding user ID
-- Date: 2025-12-27

-- Drop existing function
DROP FUNCTION IF EXISTS get_public_demo_debts();

-- Create function to return debts from user with most debts (dynamic)
CREATE OR REPLACE FUNCTION get_public_demo_debts()
RETURNS TABLE (
    counterparty_id uuid,
    counterparty_name text,
    amount decimal,
    i_owe_them boolean,
    owed_to_name text,
    owed_to_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    demo_user_id uuid;
    demo_user_name text;
BEGIN
    -- Automatically find user with most debts (most active user)
    SELECT owed_user, p.full_name INTO demo_user_id, demo_user_name
    FROM user_debts_summary
    JOIN profiles p ON p.id = owed_user
    GROUP BY owed_user, p.full_name
    ORDER BY SUM(amount_owed) DESC
    LIMIT 1;

    -- If no data, return empty
    IF demo_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Return real debts from most active user
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
        demo_user_name as owed_to_name,
        demo_user_id as owed_to_id
    FROM debt_calculations dc
    JOIN profiles p ON p.id = dc.other_user_id
    WHERE dc.other_user_id IS NOT NULL
      AND dc.signed_amount != 0
    ORDER BY ABS(dc.signed_amount) DESC;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon;
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_public_demo_debts IS
'Returns REAL production debt data from user with most debts. Automatically updates when data changes. No hardcoded user ID required.';
