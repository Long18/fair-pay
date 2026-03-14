-- ========================================
-- Migration: Admin User Journey Tracking
-- Purpose: Product analytics session/event storage for admin user journey debugging
-- ========================================

-- =============================================
-- 1. Session + event tables
-- =============================================
CREATE TABLE IF NOT EXISTS user_tracking_sessions (
  id UUID PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  landing_path TEXT NOT NULL,
  landing_referrer TEXT,
  landing_source TEXT NOT NULL DEFAULT 'direct',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  entry_link TEXT NOT NULL,
  device_type TEXT,
  locale TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_tracking_sessions_anonymous_id_not_blank CHECK (btrim(anonymous_id) <> ''),
  CONSTRAINT user_tracking_sessions_landing_path_not_blank CHECK (btrim(landing_path) <> ''),
  CONSTRAINT user_tracking_sessions_entry_link_not_blank CHECK (btrim(entry_link) <> '')
);

CREATE TABLE IF NOT EXISTS user_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_tracking_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  anonymous_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  page_path TEXT NOT NULL,
  target_type TEXT,
  target_key TEXT,
  flow_name TEXT,
  step_name TEXT,
  referrer_path TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_tracking_events_name_check CHECK (
    event_name IN (
      'page_view',
      'nav_click',
      'cta_click',
      'form_step_view',
      'form_submit',
      'form_success',
      'form_error',
      'auth_login',
      'auth_register'
    )
  ),
  CONSTRAINT user_tracking_events_anonymous_id_not_blank CHECK (btrim(anonymous_id) <> ''),
  CONSTRAINT user_tracking_events_page_path_not_blank CHECK (btrim(page_path) <> '')
);

COMMENT ON TABLE user_tracking_sessions IS 'Per-session product analytics context for admin journey debugging.';
COMMENT ON TABLE user_tracking_events IS 'Per-event product analytics timeline for admin journey debugging.';

CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_user_last_seen
  ON user_tracking_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_anonymous_last_seen
  ON user_tracking_sessions(anonymous_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_started_at
  ON user_tracking_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_landing_source
  ON user_tracking_sessions(landing_source, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tracking_events_user_occurred
  ON user_tracking_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_events_session_occurred
  ON user_tracking_events(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_events_name_occurred
  ON user_tracking_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_events_page_occurred
  ON user_tracking_events(page_path, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tracking_events_properties_gin
  ON user_tracking_events USING GIN(properties);

-- =============================================
-- 2. Update timestamp helper
-- =============================================
CREATE OR REPLACE FUNCTION set_user_tracking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_tracking_sessions_updated_at ON user_tracking_sessions;
CREATE TRIGGER trg_user_tracking_sessions_updated_at
  BEFORE UPDATE ON user_tracking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tracking_updated_at();

-- =============================================
-- 3. RLS: admin-only read
-- =============================================
ALTER TABLE user_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user tracking sessions" ON user_tracking_sessions;
CREATE POLICY "Admins can read user tracking sessions"
  ON user_tracking_sessions FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can read user tracking events" ON user_tracking_events;
CREATE POLICY "Admins can read user tracking events"
  ON user_tracking_events FOR SELECT
  TO authenticated
  USING (is_admin());

GRANT SELECT ON user_tracking_sessions TO authenticated;
GRANT SELECT ON user_tracking_events TO authenticated;

-- =============================================
-- 4. Admin RPCs
-- =============================================
DROP FUNCTION IF EXISTS admin_get_user_tracking_overview(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION admin_get_user_tracking_overview(
  p_user_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
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
    RAISE EXCEPTION 'Only administrators can read user tracking overview';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  WITH scoped_sessions AS (
    SELECT s.*
    FROM user_tracking_sessions s
    WHERE s.user_id = p_user_id
      AND (p_from IS NULL OR s.last_seen_at >= p_from)
      AND (p_to IS NULL OR s.started_at <= p_to)
  ),
  scoped_events AS (
    SELECT e.*
    FROM user_tracking_events e
    WHERE e.user_id = p_user_id
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
  )
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'total_sessions', (SELECT COUNT(*) FROM scoped_sessions),
    'total_events', (SELECT COUNT(*) FROM scoped_events),
    'unique_pages', (SELECT COUNT(DISTINCT page_path) FROM scoped_events),
    'first_seen_at', (SELECT MIN(started_at) FROM scoped_sessions),
    'last_seen_at', (SELECT MAX(last_seen_at) FROM scoped_sessions),
    'latest_entry_link', (
      SELECT entry_link
      FROM scoped_sessions
      ORDER BY last_seen_at DESC
      LIMIT 1
    ),
    'top_sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', src.landing_source, 'count', src.count))
      FROM (
        SELECT COALESCE(landing_source, 'direct') AS landing_source, COUNT(*)::INT AS count
        FROM scoped_sessions
        GROUP BY COALESCE(landing_source, 'direct')
        ORDER BY count DESC, landing_source ASC
        LIMIT 5
      ) src
    ), '[]'::JSONB),
    'top_pages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', pg.page_path, 'count', pg.count))
      FROM (
        SELECT page_path, COUNT(*)::INT AS count
        FROM scoped_events
        GROUP BY page_path
        ORDER BY count DESC, page_path ASC
        LIMIT 10
      ) pg
    ), '[]'::JSONB),
    'top_ctas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', cta.target_key, 'count', cta.count))
      FROM (
        SELECT target_key, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE target_key IS NOT NULL
          AND event_name IN ('nav_click', 'cta_click', 'form_submit', 'form_success', 'form_error')
        GROUP BY target_key
        ORDER BY count DESC, target_key ASC
        LIMIT 10
      ) cta
    ), '[]'::JSONB),
    'recent_flows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', fl.flow_name, 'count', fl.count))
      FROM (
        SELECT flow_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE flow_name IS NOT NULL
        GROUP BY flow_name
        ORDER BY count DESC, flow_name ASC
        LIMIT 10
      ) fl
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$fn$;

DROP FUNCTION IF EXISTS admin_get_user_tracking_sessions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION admin_get_user_tracking_sessions(
  p_user_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_total INTEGER;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read user tracking sessions';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    p_limit := 20;
  END IF;
  IF p_offset < 0 THEN
    p_offset := 0;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM user_tracking_sessions s
  WHERE s.user_id = p_user_id
    AND (p_from IS NULL OR s.last_seen_at >= p_from)
    AND (p_to IS NULL OR s.started_at <= p_to);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'anonymous_id', s.anonymous_id,
      'user_id', s.user_id,
      'started_at', s.started_at,
      'last_seen_at', s.last_seen_at,
      'landing_path', s.landing_path,
      'landing_referrer', s.landing_referrer,
      'landing_source', s.landing_source,
      'utm_source', s.utm_source,
      'utm_medium', s.utm_medium,
      'utm_campaign', s.utm_campaign,
      'utm_content', s.utm_content,
      'utm_term', s.utm_term,
      'entry_link', s.entry_link,
      'device_type', s.device_type,
      'locale', s.locale,
      'event_count', COALESCE(e.event_count, 0)
    ) AS row_data
    FROM user_tracking_sessions s
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS event_count
      FROM user_tracking_events e
      WHERE e.session_id = s.id
    ) e ON TRUE
    WHERE s.user_id = p_user_id
      AND (p_from IS NULL OR s.last_seen_at >= p_from)
      AND (p_to IS NULL OR s.started_at <= p_to)
    ORDER BY s.last_seen_at DESC, s.started_at DESC
    LIMIT p_limit OFFSET p_offset
  ) rows;

  RETURN jsonb_build_object(
    'data', COALESCE(v_rows, '[]'::JSONB),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$fn$;

DROP FUNCTION IF EXISTS admin_get_user_tracking_events(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION admin_get_user_tracking_events(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_event_names TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_total INTEGER;
  v_rows JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read user tracking events';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_limit < 1 OR p_limit > 200 THEN
    p_limit := 50;
  END IF;
  IF p_offset < 0 THEN
    p_offset := 0;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM user_tracking_events e
  WHERE e.user_id = p_user_id
    AND (p_session_id IS NULL OR e.session_id = p_session_id)
    AND (p_from IS NULL OR e.occurred_at >= p_from)
    AND (p_to IS NULL OR e.occurred_at <= p_to)
    AND (p_event_names IS NULL OR e.event_name = ANY(p_event_names));

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', e.id,
      'session_id', e.session_id,
      'user_id', e.user_id,
      'anonymous_id', e.anonymous_id,
      'event_name', e.event_name,
      'event_category', e.event_category,
      'page_path', e.page_path,
      'target_type', e.target_type,
      'target_key', e.target_key,
      'flow_name', e.flow_name,
      'step_name', e.step_name,
      'referrer_path', e.referrer_path,
      'properties', e.properties,
      'occurred_at', e.occurred_at
    ) AS row_data
    FROM user_tracking_events e
    WHERE e.user_id = p_user_id
      AND (p_session_id IS NULL OR e.session_id = p_session_id)
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_event_names IS NULL OR e.event_name = ANY(p_event_names))
    ORDER BY e.occurred_at DESC, e.id DESC
    LIMIT p_limit OFFSET p_offset
  ) rows;

  RETURN jsonb_build_object(
    'data', COALESCE(v_rows, '[]'::JSONB),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$fn$;

DROP FUNCTION IF EXISTS cleanup_old_tracking_data(INTEGER);
CREATE OR REPLACE FUNCTION cleanup_old_tracking_data(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_deleted_sessions INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can cleanup tracking data';
  END IF;

  IF p_days_to_keep IS NULL OR p_days_to_keep < 30 THEN
    p_days_to_keep := 90;
  END IF;

  DELETE FROM user_tracking_sessions
  WHERE last_seen_at < NOW() - make_interval(days => p_days_to_keep);

  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'days_to_keep', p_days_to_keep,
    'deleted_sessions', v_deleted_sessions
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_user_tracking_overview(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_tracking_sessions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_tracking_events(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_tracking_data(INTEGER) TO authenticated;

COMMENT ON FUNCTION admin_get_user_tracking_overview(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Admin-only: Returns high-level journey analytics for a single user.';
COMMENT ON FUNCTION admin_get_user_tracking_sessions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) IS
  'Admin-only: Returns paginated journey sessions for a single user.';
COMMENT ON FUNCTION admin_get_user_tracking_events(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, INTEGER) IS
  'Admin-only: Returns paginated journey events for a single user, optionally scoped to a session.';
COMMENT ON FUNCTION cleanup_old_tracking_data(INTEGER) IS
  'Admin-only: Deletes user journey tracking data older than the retention window. Minimum 30 days.';
