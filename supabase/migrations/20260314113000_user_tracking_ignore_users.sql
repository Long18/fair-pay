-- ========================================
-- Migration: User Tracking Ignore List
-- Purpose: Allow admins to exclude specific authenticated users from journey tracking
-- ========================================

CREATE TABLE IF NOT EXISTS user_tracking_ignored_users (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_tracking_ignored_users IS
  'Admin-managed list of authenticated users whose journey tracking events should be ignored.';

CREATE OR REPLACE FUNCTION set_user_tracking_ignored_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_tracking_ignored_users_updated_at ON user_tracking_ignored_users;
CREATE TRIGGER trg_user_tracking_ignored_users_updated_at
  BEFORE UPDATE ON user_tracking_ignored_users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tracking_ignored_users_updated_at();

ALTER TABLE user_tracking_ignored_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user tracking ignored users" ON user_tracking_ignored_users;
CREATE POLICY "Admins can read user tracking ignored users"
  ON user_tracking_ignored_users FOR SELECT
  TO authenticated
  USING (is_admin());

GRANT SELECT ON user_tracking_ignored_users TO authenticated;

DROP FUNCTION IF EXISTS get_admin_users();

CREATE FUNCTION get_admin_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  journey_tracking_ignored BOOLEAN
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
    p.created_at,
    (utiu.user_id IS NOT NULL) AS journey_tracking_ignored
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN user_tracking_ignored_users utiu ON utiu.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_user_tracking_ignore(
  p_user_id UUID,
  p_ignore BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can manage ignored journey tracking users';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_ignore IS NULL THEN
    RAISE EXCEPTION 'p_ignore is required';
  END IF;

  IF p_ignore THEN
    INSERT INTO user_tracking_ignored_users (user_id, reason, created_by)
    VALUES (p_user_id, NULLIF(btrim(p_reason), ''), auth.uid())
    ON CONFLICT (user_id)
    DO UPDATE SET
      reason = EXCLUDED.reason,
      created_by = EXCLUDED.created_by,
      updated_at = NOW();
  ELSE
    DELETE FROM user_tracking_ignored_users
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'journey_tracking_ignored', p_ignore
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_user_tracking_ignore(UUID, BOOLEAN, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_set_user_tracking_ignore(UUID, BOOLEAN, TEXT) IS
  'Admin-only: add or remove a user from the authenticated journey tracking ignore list.';
