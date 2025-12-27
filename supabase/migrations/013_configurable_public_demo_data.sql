-- Migration: Configurable public demo data via settings table
-- Purpose: Control which user's data to show via config table (no SQL needed)
-- Date: 2025-12-27

-- Create settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Public can read settings"
    ON app_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Authenticated can update settings"
    ON app_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert default demo user (can be changed via UI later)
INSERT INTO app_settings (key, value, description)
VALUES (
    'demo_user_id',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'User ID to show debts for unauthenticated visitors'
)
ON CONFLICT (key) DO NOTHING;

-- Drop existing function
DROP FUNCTION IF EXISTS get_public_demo_debts();

-- Create function that reads from settings
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
    demo_user_id uuid;
BEGIN
    -- Read demo user ID from settings table
    SELECT value::uuid INTO demo_user_id
    FROM app_settings
    WHERE key = 'demo_user_id';

    -- If not configured, return empty
    IF demo_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Return debts from configured user
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

GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon;
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO authenticated;

COMMENT ON FUNCTION get_public_demo_debts IS
'Returns debts from user configured in app_settings.demo_user_id. Can be changed via UI or SQL without migration.';

-- Helper function to update demo user (can be called from UI)
CREATE OR REPLACE FUNCTION set_demo_user(new_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE app_settings
    SET value = new_user_id::text,
        updated_at = NOW()
    WHERE key = 'demo_user_id';
END;
$$;

GRANT EXECUTE ON FUNCTION set_demo_user(uuid) TO authenticated;

COMMENT ON FUNCTION set_demo_user IS
'Update demo user ID. Usage: SELECT set_demo_user(''user-id-here'');';
