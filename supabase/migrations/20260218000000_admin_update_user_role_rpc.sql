-- Admin RPC to update user roles, bypassing RLS recursion on user_roles table.
-- The old "Only admins can manage roles" policy queries user_roles from within
-- a policy on user_roles, causing infinite recursion (HTTP 500).
-- This SECURITY DEFINER function bypasses RLS entirely.

-- 1. Drop the old recursive policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  -- Prevent self-role-change
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  -- Validate role value
  IF p_new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or user';
  END IF;

  -- Upsert the role
  INSERT INTO user_roles (user_id, role, created_at, updated_at)
  VALUES (p_user_id, p_new_role, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET role = p_new_role, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_update_user_role(UUID, TEXT) IS
  'Admin-only: Update a user role (admin/user). SECURITY DEFINER to bypass RLS recursion on user_roles.';
