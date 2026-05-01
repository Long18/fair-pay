-- ========================================
-- Migration: UTM Attribution Pipeline
-- Purpose: Persist first/last-touch attribution and expose admin campaign metrics
-- ========================================

CREATE TABLE IF NOT EXISTS user_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  session_id UUID REFERENCES user_tracking_sessions(id) ON DELETE SET NULL,

  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_content TEXT,
  first_utm_term TEXT,
  first_referrer TEXT,
  first_landing_url TEXT,
  first_landing_path TEXT,
  first_seen_at TIMESTAMPTZ,

  last_utm_source TEXT,
  last_utm_medium TEXT,
  last_utm_campaign TEXT,
  last_utm_content TEXT,
  last_utm_term TEXT,
  last_referrer TEXT,
  last_landing_url TEXT,
  last_landing_path TEXT,
  last_seen_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_attributions_identity_check CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
  CONSTRAINT user_attributions_anonymous_not_blank CHECK (anonymous_id IS NULL OR btrim(anonymous_id) <> '')
);

ALTER TABLE user_attributions
  ADD CONSTRAINT user_attributions_user_id_key UNIQUE (user_id);

ALTER TABLE user_attributions
  ADD CONSTRAINT user_attributions_anonymous_id_key UNIQUE (anonymous_id);

COMMENT ON TABLE user_attributions IS
  'First-touch and last-touch UTM attribution linked by anonymous ID before auth and user ID after auth.';

CREATE INDEX IF NOT EXISTS idx_user_attributions_user_updated
  ON user_attributions(user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_attributions_anonymous_updated
  ON user_attributions(anonymous_id, updated_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_attributions_first_source_seen
  ON user_attributions(first_utm_source, first_seen_at DESC)
  WHERE first_utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_attributions_last_source_seen
  ON user_attributions(last_utm_source, last_seen_at DESC)
  WHERE last_utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_attributions_last_campaign_seen
  ON user_attributions(last_utm_campaign, last_seen_at DESC)
  WHERE last_utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_utm_source_seen
  ON user_tracking_sessions(utm_source, started_at DESC)
  WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_utm_campaign_seen
  ON user_tracking_sessions(utm_campaign, started_at DESC)
  WHERE utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_tracking_sessions_utm_medium_seen
  ON user_tracking_sessions(utm_medium, started_at DESC)
  WHERE utm_medium IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_tracking_events_entity_type_occurred
  ON user_tracking_events((properties->>'entity_type'), occurred_at DESC)
  WHERE properties ? 'entity_type';

DROP TRIGGER IF EXISTS trg_user_attributions_updated_at ON user_attributions;
CREATE TRIGGER trg_user_attributions_updated_at
  BEFORE UPDATE ON user_attributions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tracking_updated_at();

ALTER TABLE user_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user attributions" ON user_attributions;
CREATE POLICY "Admins can read user attributions"
  ON user_attributions FOR SELECT
  TO authenticated
  USING (is_admin());

GRANT SELECT ON user_attributions TO authenticated;

ALTER TABLE user_tracking_events
  DROP CONSTRAINT IF EXISTS user_tracking_events_name_check;

ALTER TABLE user_tracking_events
  ADD CONSTRAINT user_tracking_events_name_check CHECK (
    event_name IN (
      'page_view',
      'nav_click',
      'cta_click',
      'form_step_view',
      'form_submit',
      'form_success',
      'form_error',
      'auth_login',
      'auth_register',
      'expense_created',
      'payment_created',
      'group_created',
      'invite_sent',
      'invite_accepted',
      'settlement_completed',
      'profile_viewed_from_shared_link',
      'share_link_generated',
      'share_button_clicked',
      'share_copy_link_clicked',
      'share_native_sheet_opened',
      'share_completed',
      'share_failed'
    )
  );

CREATE OR REPLACE FUNCTION jsonb_text_or_null(p_payload JSONB, p_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(btrim(p_payload ->> p_key), '')
$$;

CREATE OR REPLACE FUNCTION jsonb_timestamptz_or_null(p_payload JSONB, p_key TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value TEXT;
BEGIN
  v_value := jsonb_text_or_null(p_payload, p_key);
  IF v_value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_value::TIMESTAMPTZ;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_user_attribution(
  p_user_id UUID,
  p_anonymous_id TEXT,
  p_session_id UUID,
  p_first JSONB,
  p_last JSONB
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_user_row_id UUID;
BEGIN
  p_anonymous_id := NULLIF(btrim(p_anonymous_id), '');
  p_first := COALESCE(p_first, '{}'::JSONB);
  p_last := COALESCE(p_last, '{}'::JSONB);

  IF p_user_id IS NULL AND p_anonymous_id IS NULL THEN
    RETURN;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_user_row_id
    FROM user_attributions
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_user_row_id IS NOT NULL THEN
      UPDATE user_attributions
      SET
        anonymous_id = COALESCE(user_attributions.anonymous_id, p_anonymous_id),
        session_id = COALESCE(p_session_id, user_attributions.session_id),
        first_utm_source = COALESCE(user_attributions.first_utm_source, jsonb_text_or_null(p_first, 'utm_source')),
        first_utm_medium = COALESCE(user_attributions.first_utm_medium, jsonb_text_or_null(p_first, 'utm_medium')),
        first_utm_campaign = COALESCE(user_attributions.first_utm_campaign, jsonb_text_or_null(p_first, 'utm_campaign')),
        first_utm_content = COALESCE(user_attributions.first_utm_content, jsonb_text_or_null(p_first, 'utm_content')),
        first_utm_term = COALESCE(user_attributions.first_utm_term, jsonb_text_or_null(p_first, 'utm_term')),
        first_referrer = COALESCE(user_attributions.first_referrer, jsonb_text_or_null(p_first, 'referrer')),
        first_landing_url = COALESCE(user_attributions.first_landing_url, jsonb_text_or_null(p_first, 'landing_url')),
        first_landing_path = COALESCE(user_attributions.first_landing_path, jsonb_text_or_null(p_first, 'landing_path')),
        first_seen_at = COALESCE(user_attributions.first_seen_at, jsonb_timestamptz_or_null(p_first, 'first_seen_at')),
        last_utm_source = COALESCE(jsonb_text_or_null(p_last, 'utm_source'), user_attributions.last_utm_source),
        last_utm_medium = COALESCE(jsonb_text_or_null(p_last, 'utm_medium'), user_attributions.last_utm_medium),
        last_utm_campaign = COALESCE(jsonb_text_or_null(p_last, 'utm_campaign'), user_attributions.last_utm_campaign),
        last_utm_content = COALESCE(jsonb_text_or_null(p_last, 'utm_content'), user_attributions.last_utm_content),
        last_utm_term = COALESCE(jsonb_text_or_null(p_last, 'utm_term'), user_attributions.last_utm_term),
        last_referrer = COALESCE(jsonb_text_or_null(p_last, 'referrer'), user_attributions.last_referrer),
        last_landing_url = COALESCE(jsonb_text_or_null(p_last, 'landing_url'), user_attributions.last_landing_url),
        last_landing_path = COALESCE(jsonb_text_or_null(p_last, 'landing_path'), user_attributions.last_landing_path),
        last_seen_at = COALESCE(jsonb_timestamptz_or_null(p_last, 'last_seen_at'), user_attributions.last_seen_at),
        updated_at = NOW()
      WHERE id = v_user_row_id;

      IF p_anonymous_id IS NOT NULL THEN
        DELETE FROM user_attributions
        WHERE anonymous_id = p_anonymous_id
          AND user_id IS NULL
          AND id <> v_user_row_id;
      END IF;

      RETURN;
    END IF;

    IF p_anonymous_id IS NOT NULL THEN
      UPDATE user_attributions
      SET
        user_id = p_user_id,
        session_id = COALESCE(p_session_id, user_attributions.session_id),
        first_utm_source = COALESCE(user_attributions.first_utm_source, jsonb_text_or_null(p_first, 'utm_source')),
        first_utm_medium = COALESCE(user_attributions.first_utm_medium, jsonb_text_or_null(p_first, 'utm_medium')),
        first_utm_campaign = COALESCE(user_attributions.first_utm_campaign, jsonb_text_or_null(p_first, 'utm_campaign')),
        first_utm_content = COALESCE(user_attributions.first_utm_content, jsonb_text_or_null(p_first, 'utm_content')),
        first_utm_term = COALESCE(user_attributions.first_utm_term, jsonb_text_or_null(p_first, 'utm_term')),
        first_referrer = COALESCE(user_attributions.first_referrer, jsonb_text_or_null(p_first, 'referrer')),
        first_landing_url = COALESCE(user_attributions.first_landing_url, jsonb_text_or_null(p_first, 'landing_url')),
        first_landing_path = COALESCE(user_attributions.first_landing_path, jsonb_text_or_null(p_first, 'landing_path')),
        first_seen_at = COALESCE(user_attributions.first_seen_at, jsonb_timestamptz_or_null(p_first, 'first_seen_at')),
        last_utm_source = COALESCE(jsonb_text_or_null(p_last, 'utm_source'), user_attributions.last_utm_source),
        last_utm_medium = COALESCE(jsonb_text_or_null(p_last, 'utm_medium'), user_attributions.last_utm_medium),
        last_utm_campaign = COALESCE(jsonb_text_or_null(p_last, 'utm_campaign'), user_attributions.last_utm_campaign),
        last_utm_content = COALESCE(jsonb_text_or_null(p_last, 'utm_content'), user_attributions.last_utm_content),
        last_utm_term = COALESCE(jsonb_text_or_null(p_last, 'utm_term'), user_attributions.last_utm_term),
        last_referrer = COALESCE(jsonb_text_or_null(p_last, 'referrer'), user_attributions.last_referrer),
        last_landing_url = COALESCE(jsonb_text_or_null(p_last, 'landing_url'), user_attributions.last_landing_url),
        last_landing_path = COALESCE(jsonb_text_or_null(p_last, 'landing_path'), user_attributions.last_landing_path),
        last_seen_at = COALESCE(jsonb_timestamptz_or_null(p_last, 'last_seen_at'), user_attributions.last_seen_at),
        updated_at = NOW()
      WHERE anonymous_id = p_anonymous_id
      RETURNING id INTO v_user_row_id;

      IF v_user_row_id IS NOT NULL THEN
        RETURN;
      END IF;
    END IF;
  END IF;

  INSERT INTO user_attributions (
    user_id,
    anonymous_id,
    session_id,
    first_utm_source,
    first_utm_medium,
    first_utm_campaign,
    first_utm_content,
    first_utm_term,
    first_referrer,
    first_landing_url,
    first_landing_path,
    first_seen_at,
    last_utm_source,
    last_utm_medium,
    last_utm_campaign,
    last_utm_content,
    last_utm_term,
    last_referrer,
    last_landing_url,
    last_landing_path,
    last_seen_at
  )
  VALUES (
    p_user_id,
    p_anonymous_id,
    p_session_id,
    jsonb_text_or_null(p_first, 'utm_source'),
    jsonb_text_or_null(p_first, 'utm_medium'),
    jsonb_text_or_null(p_first, 'utm_campaign'),
    jsonb_text_or_null(p_first, 'utm_content'),
    jsonb_text_or_null(p_first, 'utm_term'),
    jsonb_text_or_null(p_first, 'referrer'),
    jsonb_text_or_null(p_first, 'landing_url'),
    jsonb_text_or_null(p_first, 'landing_path'),
    jsonb_timestamptz_or_null(p_first, 'first_seen_at'),
    jsonb_text_or_null(p_last, 'utm_source'),
    jsonb_text_or_null(p_last, 'utm_medium'),
    jsonb_text_or_null(p_last, 'utm_campaign'),
    jsonb_text_or_null(p_last, 'utm_content'),
    jsonb_text_or_null(p_last, 'utm_term'),
    jsonb_text_or_null(p_last, 'referrer'),
    jsonb_text_or_null(p_last, 'landing_url'),
    jsonb_text_or_null(p_last, 'landing_path'),
    jsonb_timestamptz_or_null(p_last, 'last_seen_at')
  )
  ON CONFLICT (anonymous_id)
  DO UPDATE SET
    session_id = COALESCE(EXCLUDED.session_id, user_attributions.session_id),
    first_utm_source = COALESCE(user_attributions.first_utm_source, EXCLUDED.first_utm_source),
    first_utm_medium = COALESCE(user_attributions.first_utm_medium, EXCLUDED.first_utm_medium),
    first_utm_campaign = COALESCE(user_attributions.first_utm_campaign, EXCLUDED.first_utm_campaign),
    first_utm_content = COALESCE(user_attributions.first_utm_content, EXCLUDED.first_utm_content),
    first_utm_term = COALESCE(user_attributions.first_utm_term, EXCLUDED.first_utm_term),
    first_referrer = COALESCE(user_attributions.first_referrer, EXCLUDED.first_referrer),
    first_landing_url = COALESCE(user_attributions.first_landing_url, EXCLUDED.first_landing_url),
    first_landing_path = COALESCE(user_attributions.first_landing_path, EXCLUDED.first_landing_path),
    first_seen_at = COALESCE(user_attributions.first_seen_at, EXCLUDED.first_seen_at),
    last_utm_source = COALESCE(EXCLUDED.last_utm_source, user_attributions.last_utm_source),
    last_utm_medium = COALESCE(EXCLUDED.last_utm_medium, user_attributions.last_utm_medium),
    last_utm_campaign = COALESCE(EXCLUDED.last_utm_campaign, user_attributions.last_utm_campaign),
    last_utm_content = COALESCE(EXCLUDED.last_utm_content, user_attributions.last_utm_content),
    last_utm_term = COALESCE(EXCLUDED.last_utm_term, user_attributions.last_utm_term),
    last_referrer = COALESCE(EXCLUDED.last_referrer, user_attributions.last_referrer),
    last_landing_url = COALESCE(EXCLUDED.last_landing_url, user_attributions.last_landing_url),
    last_landing_path = COALESCE(EXCLUDED.last_landing_path, user_attributions.last_landing_path),
    last_seen_at = COALESCE(EXCLUDED.last_seen_at, user_attributions.last_seen_at),
    updated_at = NOW();
END;
$fn$;

REVOKE ALL ON FUNCTION upsert_user_attribution(UUID, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_user_attribution(UUID, TEXT, UUID, JSONB, JSONB) TO service_role;

DROP FUNCTION IF EXISTS admin_get_utm_performance(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION admin_get_utm_performance(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_campaign TEXT DEFAULT NULL,
  p_medium TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_from TIMESTAMPTZ := COALESCE(p_from, NOW() - INTERVAL '30 days');
  v_to TIMESTAMPTZ := COALESCE(p_to, NOW());
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read UTM performance';
  END IF;

  WITH scoped_sessions AS (
    SELECT
      s.*,
      COALESCE(s.utm_source, s.landing_source, 'direct') AS source_name,
      COALESCE(s.utm_medium, CASE WHEN s.landing_referrer IS NOT NULL THEN 'referral' ELSE 'none' END) AS medium_name
    FROM user_tracking_sessions s
    WHERE s.started_at >= v_from
      AND s.started_at <= v_to
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
      AND (p_source IS NULL OR COALESCE(s.utm_source, s.landing_source, 'direct') = p_source)
      AND (p_campaign IS NULL OR s.utm_campaign = p_campaign)
      AND (p_medium IS NULL OR COALESCE(s.utm_medium, CASE WHEN s.landing_referrer IS NOT NULL THEN 'referral' ELSE 'none' END) = p_medium)
  ),
  scoped_events AS (
    SELECT
      e.*,
      s.source_name,
      s.medium_name,
      s.utm_campaign AS session_campaign,
      s.utm_content AS session_content
    FROM user_tracking_events e
    LEFT JOIN scoped_sessions s ON s.id = e.session_id
    WHERE e.occurred_at >= v_from
      AND e.occurred_at <= v_to
      AND (p_user_id IS NULL OR e.user_id = p_user_id)
      AND (p_entity_type IS NULL OR e.properties->>'entity_type' = p_entity_type)
      AND (p_source IS NULL OR COALESCE(e.properties->>'utm_source', s.source_name, 'direct') = p_source)
      AND (p_campaign IS NULL OR COALESCE(e.properties->>'utm_campaign', s.utm_campaign) = p_campaign)
      AND (p_medium IS NULL OR COALESCE(e.properties->>'utm_medium', s.medium_name) = p_medium)
  ),
  scoped_attributions AS (
    SELECT ua.*
    FROM user_attributions ua
    WHERE COALESCE(ua.last_seen_at, ua.updated_at) >= v_from
      AND COALESCE(ua.last_seen_at, ua.updated_at) <= v_to
      AND (p_user_id IS NULL OR ua.user_id = p_user_id)
      AND (p_source IS NULL OR ua.first_utm_source = p_source OR ua.last_utm_source = p_source)
      AND (p_campaign IS NULL OR ua.first_utm_campaign = p_campaign OR ua.last_utm_campaign = p_campaign)
      AND (p_medium IS NULL OR ua.first_utm_medium = p_medium OR ua.last_utm_medium = p_medium)
  )
  SELECT jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'total_sessions', (SELECT COUNT(*) FROM scoped_sessions),
    'total_events', (SELECT COUNT(*) FROM scoped_events),
    'total_shares', (SELECT COUNT(*) FROM scoped_events WHERE event_name LIKE 'share_%'),
    'traffic_by_source', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', source_name, 'count', count) ORDER BY count DESC, source_name ASC)
      FROM (
        SELECT source_name, COUNT(*)::INT AS count
        FROM scoped_sessions
        GROUP BY source_name
        ORDER BY count DESC, source_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'traffic_by_campaign', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', campaign_name, 'count', count) ORDER BY count DESC, campaign_name ASC)
      FROM (
        SELECT COALESCE(utm_campaign, 'none') AS campaign_name, COUNT(*)::INT AS count
        FROM scoped_sessions
        GROUP BY COALESCE(utm_campaign, 'none')
        ORDER BY count DESC, campaign_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'signup_by_source', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', source_name, 'count', count) ORDER BY count DESC, source_name ASC)
      FROM (
        SELECT COALESCE(properties->>'utm_source', source_name, 'direct') AS source_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name = 'auth_register'
        GROUP BY COALESCE(properties->>'utm_source', source_name, 'direct')
        ORDER BY count DESC, source_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'invite_accepted_by_campaign', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', campaign_name, 'count', count) ORDER BY count DESC, campaign_name ASC)
      FROM (
        SELECT COALESCE(properties->>'utm_campaign', session_campaign, 'none') AS campaign_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name = 'invite_accepted'
        GROUP BY COALESCE(properties->>'utm_campaign', session_campaign, 'none')
        ORDER BY count DESC, campaign_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'share_count_by_content', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', content_name, 'count', count) ORDER BY count DESC, content_name ASC)
      FROM (
        SELECT COALESCE(properties->>'utm_content', session_content, 'unknown') AS content_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name LIKE 'share_%'
        GROUP BY COALESCE(properties->>'utm_content', session_content, 'unknown')
        ORDER BY count DESC, content_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'conversion_by_first_touch_source', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', source_name, 'count', count) ORDER BY count DESC, source_name ASC)
      FROM (
        SELECT COALESCE(first_utm_source, 'direct') AS source_name, COUNT(*)::INT AS count
        FROM scoped_attributions
        WHERE user_id IS NOT NULL
        GROUP BY COALESCE(first_utm_source, 'direct')
        ORDER BY count DESC, source_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'conversion_by_last_touch_source', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', source_name, 'count', count) ORDER BY count DESC, source_name ASC)
      FROM (
        SELECT COALESCE(last_utm_source, 'direct') AS source_name, COUNT(*)::INT AS count
        FROM scoped_attributions
        WHERE user_id IS NOT NULL
        GROUP BY COALESCE(last_utm_source, 'direct')
        ORDER BY count DESC, source_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_utm_performance(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION admin_get_utm_performance(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID) IS
  'Admin-only: Returns aggregate UTM traffic, share, signup, invite, and conversion metrics.';
