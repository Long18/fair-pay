-- Migration: Enable public viewing of expense splits for transparency
-- This allows unauthenticated users to view expense split details

CREATE OR REPLACE FUNCTION get_expense_splits_public(p_expense_id uuid)
RETURNS TABLE (
    id uuid,
    expense_id uuid,
    user_id uuid,
    split_method text,
    split_value numeric,
    computed_amount numeric,
    created_at timestamptz,
    user_full_name text,
    user_avatar_url text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        es.id,
        es.expense_id,
        es.user_id,
        es.split_method,
        es.split_value,
        es.computed_amount,
        es.created_at,
        p.full_name as user_full_name,
        p.avatar_url as user_avatar_url
    FROM expense_splits es
    JOIN profiles p ON es.user_id = p.id
    WHERE es.expense_id = p_expense_id
    ORDER BY es.created_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_expense_splits_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_expense_splits_public(uuid) TO authenticated;

COMMENT ON FUNCTION get_expense_splits_public IS
'Returns expense split details for public viewing. Bypasses RLS to allow unauthenticated users to view expense breakdowns.';
