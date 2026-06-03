BEGIN;

DROP FUNCTION IF EXISTS get_admin_users();

CREATE FUNCTION get_admin_users()
RETURNS TABLE (
  id                      UUID,
  full_name               TEXT,
  email                   TEXT,
  emails                  JSONB,
  avatar_url              TEXT,
  role                    TEXT,
  created_at              TIMESTAMPTZ,
  journey_tracking_ignored BOOLEAN,
  has_auth_account        BOOLEAN
)
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                    ue.id,
            'email',                 ue.email,
            'is_primary',            ue.is_primary,
            'receives_notifications', ue.receives_notifications,
            'is_verified',           ue.is_verified,
            'source',                ue.source
          )
          ORDER BY ue.is_primary DESC, ue.created_at ASC
        )
        FROM public.user_emails ue
        WHERE ue.user_id = p.id
      ),
      '[]'::JSONB
    ) AS emails,
    p.avatar_url,
    COALESCE(ur.role, 'user') AS role,
    p.created_at,
    (utiu.user_id IS NOT NULL)   AS journey_tracking_ignored,
    (u.id IS NOT NULL)           AS has_auth_account
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.user_tracking_ignored_users utiu ON utiu.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;

COMMENT ON FUNCTION get_admin_users() IS
  'Returns all profiles with their user_emails array and has_auth_account flag for the admin dashboard.';

COMMIT;
