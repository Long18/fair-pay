-- Migration: Add avatar_url to activity functions
-- Purpose: Display user avatars in Recent Activity section

-- Update get_user_activities to include created_by_avatar_url
CREATE OR REPLACE FUNCTION get_user_activities(
    p_user_id uuid,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    type text,
    description text,
    total_amount decimal,
    currency text,
    date timestamptz,
    group_id uuid,
    group_name text,
    created_by_id uuid,
    created_by_name text,
    created_by_avatar_url text,
    paid_by_id uuid,
    paid_by_name text,
    user_share decimal,
    is_lender boolean,
    is_borrower boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Get expenses where user participated
    SELECT
        e.id,
        'expense'::text as type,
        e.description,
        e.amount as total_amount,
        e.currency,
        e.created_at as date,
        e.group_id,
        g.name as group_name,
        e.created_by as created_by_id,
        p_creator.full_name as created_by_name,
        p_creator.avatar_url as created_by_avatar_url,
        e.paid_by_user_id as paid_by_id,
        p_payer.full_name as paid_by_name,
        COALESCE(es.computed_amount, 0) as user_share,
        (e.paid_by_user_id = p_user_id) as is_lender,
        (e.paid_by_user_id != p_user_id AND COALESCE(es.computed_amount, 0) > 0) as is_borrower
    FROM expenses e
    LEFT JOIN groups g ON e.group_id = g.id
    LEFT JOIN profiles p_creator ON e.created_by = p_creator.id
    LEFT JOIN profiles p_payer ON e.paid_by_user_id = p_payer.id
    LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.user_id = p_user_id
    WHERE
        e.is_payment = false
        AND (
            e.paid_by_user_id = p_user_id
            OR EXISTS (
                SELECT 1 FROM expense_splits es2
                WHERE es2.expense_id = e.id AND es2.user_id = p_user_id
            )
        )
    ORDER BY e.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Update get_public_recent_activities to include created_by_avatar_url
CREATE OR REPLACE FUNCTION get_public_recent_activities(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    type text,
    description text,
    amount decimal,
    currency text,
    date timestamptz,
    group_id uuid,
    group_name text,
    created_by_id uuid,
    created_by_name text,
    created_by_avatar_url text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return recent expenses from most active user's group
    -- Only show expenses, not payments (for privacy)
    RETURN QUERY
    SELECT
        e.id,
        'expense'::text as type,
        e.description,
        e.amount,
        e.currency,
        e.created_at as date,
        e.group_id,
        g.name as group_name,
        e.created_by as created_by_id,
        p.full_name as created_by_name,
        p.avatar_url as created_by_avatar_url
    FROM expenses e
    LEFT JOIN groups g ON g.id = e.group_id
    LEFT JOIN profiles p ON p.id = e.created_by
    WHERE e.is_payment = false
      AND e.group_id IS NOT NULL -- Only group expenses (public)
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION get_user_activities(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_user_activities(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_recent_activities(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_public_recent_activities(integer, integer) TO authenticated;

