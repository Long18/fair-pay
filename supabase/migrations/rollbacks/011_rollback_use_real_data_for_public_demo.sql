-- Rollback: Restore original demo data function
-- This reverts to showing hardcoded demo data instead of real production data

-- Drop current function
DROP FUNCTION IF EXISTS get_public_demo_debts();

-- Restore original function with hardcoded demo data
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
    RETURN QUERY
    SELECT
        '00000000-0000-0000-0000-000000000001'::uuid as counterparty_id,
        'Sarah'::text as counterparty_name,
        250000::decimal as amount,
        false::boolean as i_owe_them,
        'John'::text as owed_to_name
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000002'::uuid,
        'Mike'::text,
        150000::decimal,
        false::boolean,
        'Alex'::text
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000003'::uuid,
        'John'::text,
        300000::decimal,
        false::boolean,
        'Emma'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon;
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO authenticated;

COMMENT ON FUNCTION get_public_demo_debts IS
'Returns demo debt data for unauthenticated users. Shows sample relationships like "John owes Sarah" for demonstration purposes.';

