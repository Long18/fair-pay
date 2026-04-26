-- ========================================
-- User Groups RPC
--
-- Returns the groups a list of users belong to, joined with the groups
-- table so a single round-trip yields everything needed to render a
-- group-affiliation avatar stack beside any user in the UI.
--
-- Uses SECURITY DEFINER to bypass the current-user-scoped RLS on
-- group_members (which only exposes the caller's own memberships).
-- This intentionally makes group affiliation visible to any
-- authenticated viewer; flag in release notes if a "private group"
-- concept is ever introduced.
-- ========================================

CREATE OR REPLACE FUNCTION public.get_users_groups(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  group_id UUID,
  group_name TEXT,
  group_avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT
      gm.user_id,
      g.id AS group_id,
      g.name AS group_name,
      g.avatar_url AS group_avatar_url,
      gm.role,
      gm.joined_at
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.user_id = ANY(p_user_ids)
      AND COALESCE(g.is_archived, false) = false
    ORDER BY gm.user_id, gm.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_groups(UUID[]) TO authenticated;
