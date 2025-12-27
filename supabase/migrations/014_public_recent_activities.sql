-- Migration: Public recent activities function
-- Purpose: Allow unauthenticated users to see recent activities
-- Date: 2025-12-27

-- Create function to return recent activities (expenses only, no payments for privacy)
-- Updated to support pagination with offset
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
    created_by_name text
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
        p.full_name as created_by_name
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_public_recent_activities(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_public_recent_activities(integer, integer) TO authenticated;

COMMENT ON FUNCTION get_public_recent_activities IS
'Returns recent expense activities from public groups. Accessible to everyone including unauthenticated users. Does not include payments for privacy.';
