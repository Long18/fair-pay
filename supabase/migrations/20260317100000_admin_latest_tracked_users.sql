-- ========================================
-- Migration: Admin Latest Tracked Users
-- Purpose: RPC to list the most recently active tracked users for admin dashboard
-- ========================================

-- =============================================
-- 1. Admin RPCs
-- =============================================
DROP FUNCTION IF EXISTS admin_get_latest_tracked_users(INT);
CREATE OR REPLACE FUNCTION admin_get_latest_tracked_users(
  p_limit INT DEFAULT 10
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read latest tracked users';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id',        latest.user_id,
      'full_name',      latest.full_name,
      'email',          latest.email,
      'avatar_url',     latest.avatar_url,
      'last_seen_at',   latest.last_seen_at,
      'last_page',      latest.last_page,
      'entry_link',     latest.entry_link,
      'landing_source', latest.landing_source,
      'device_type',    latest.device_type,
      'session_count',  latest.session_count
    ) AS row_data
    FROM (
      SELECT DISTINCT ON (s.user_id)
        s.user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        s.last_seen_at,
        last_evt.page_path  AS last_page,
        s.entry_link,
        s.landing_source,
        s.device_type,
        sc.session_count
      FROM user_tracking_sessions s
      INNER JOIN profiles p ON p.id = s.user_id
      LEFT JOIN LATERAL (
        SELECT e.page_path
        FROM user_tracking_events e
        WHERE e.session_id = s.id
        ORDER BY e.occurred_at DESC
        LIMIT 1
      ) last_evt ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::INT AS session_count
        FROM user_tracking_sessions sc_inner
        WHERE sc_inner.user_id = s.user_id
      ) sc ON TRUE
      WHERE s.user_id IS NOT NULL
      ORDER BY s.user_id, s.last_seen_at DESC
    ) latest
    ORDER BY latest.last_seen_at DESC
    LIMIT p_limit
  ) rows;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_latest_tracked_users(INT) TO authenticated;

COMMENT ON FUNCTION admin_get_latest_tracked_users(INT) IS
  'Admin-only: Returns the most recently active tracked users with their latest session info.';
