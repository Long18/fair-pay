-- ========================================
-- Migration: Admin Users RPC
-- Purpose: Create RPC function to fetch users with roles for admin dashboard
-- Avoids RLS infinite recursion when joining user_roles
-- ========================================

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can list users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(ur.role, 'user') AS role,
    p.created_at
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;

COMMENT ON FUNCTION get_admin_users() IS 'Returns all users with their roles for admin dashboard. Admin-only, SECURITY DEFINER to bypass RLS recursion on user_roles.';
