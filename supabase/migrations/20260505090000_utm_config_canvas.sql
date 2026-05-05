-- ========================================
-- Migration: UTM Config, Platform Methods, and Canvas Metrics
-- Purpose: Move UTM setup into admin-managed config and expose destination-first analytics.
-- ========================================

CREATE TABLE IF NOT EXISTS utm_platforms (
  platform_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('platform', 'copy_link', 'native_share')),
  intent_url_template TEXT,
  icon_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT utm_platforms_key_not_blank CHECK (btrim(platform_key) <> ''),
  CONSTRAINT utm_platforms_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT utm_platforms_source_not_blank CHECK (btrim(source) <> ''),
  CONSTRAINT utm_platforms_medium_not_blank CHECK (btrim(medium) <> '')
);

CREATE TABLE IF NOT EXISTS utm_share_templates (
  template_key TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entry_point TEXT NOT NULL,
  campaign TEXT NOT NULL,
  content TEXT NOT NULL,
  allowed_platforms TEXT[] NOT NULL DEFAULT '{}',
  default_platform TEXT REFERENCES utm_platforms(platform_key) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT utm_templates_key_not_blank CHECK (btrim(template_key) <> ''),
  CONSTRAINT utm_templates_entity_not_blank CHECK (btrim(entity_type) <> ''),
  CONSTRAINT utm_templates_entry_not_blank CHECK (btrim(entry_point) <> ''),
  CONSTRAINT utm_templates_campaign_not_blank CHECK (btrim(campaign) <> ''),
  CONSTRAINT utm_templates_content_not_blank CHECK (btrim(content) <> '')
);

CREATE INDEX IF NOT EXISTS idx_utm_platforms_enabled_order
  ON utm_platforms(enabled, display_order, platform_key);

CREATE INDEX IF NOT EXISTS idx_utm_templates_enabled_entity
  ON utm_share_templates(enabled, entity_type, entry_point);

DROP TRIGGER IF EXISTS trg_utm_platforms_updated_at ON utm_platforms;
CREATE TRIGGER trg_utm_platforms_updated_at
  BEFORE UPDATE ON utm_platforms
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tracking_updated_at();

DROP TRIGGER IF EXISTS trg_utm_templates_updated_at ON utm_share_templates;
CREATE TRIGGER trg_utm_templates_updated_at
  BEFORE UPDATE ON utm_share_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tracking_updated_at();

ALTER TABLE utm_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_share_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read UTM platforms" ON utm_platforms;
CREATE POLICY "Admins can read UTM platforms"
  ON utm_platforms FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage UTM platforms" ON utm_platforms;
CREATE POLICY "Admins can manage UTM platforms"
  ON utm_platforms FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can read UTM templates" ON utm_share_templates;
CREATE POLICY "Admins can read UTM templates"
  ON utm_share_templates FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage UTM templates" ON utm_share_templates;
CREATE POLICY "Admins can manage UTM templates"
  ON utm_share_templates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON utm_platforms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON utm_share_templates TO authenticated;

INSERT INTO utm_platforms (
  platform_key,
  label,
  source,
  medium,
  method,
  intent_url_template,
  icon_key,
  enabled,
  display_order
) VALUES
  ('facebook', 'Facebook', 'facebook', 'social_share', 'platform', 'https://www.facebook.com/sharer/sharer.php?u={url}', 'facebook', TRUE, 10),
  ('whatsapp', 'WhatsApp', 'whatsapp', 'social_share', 'platform', 'https://wa.me/?text={text}%20{url}', 'whatsapp', TRUE, 20),
  ('telegram', 'Telegram', 'telegram', 'social_share', 'platform', 'https://t.me/share/url?url={url}&text={text}', 'telegram', TRUE, 30),
  ('x', 'X', 'x', 'social_share', 'platform', 'https://twitter.com/intent/tweet?url={url}&text={text}', 'x', TRUE, 40),
  ('email', 'Email', 'email', 'direct_share', 'platform', 'mailto:?subject={title}&body={text}%0A{url}', 'email', TRUE, 50),
  ('sms', 'SMS', 'sms', 'direct_share', 'platform', 'sms:?&body={text}%20{url}', 'sms', TRUE, 60),
  ('messenger', 'Messenger', 'messenger', 'social_share', 'platform', NULL, 'messenger', FALSE, 70),
  ('zalo', 'Zalo', 'zalo', 'social_share', 'platform', NULL, 'zalo', FALSE, 80),
  ('copy_link', 'Copy link', 'unknown', 'copy_link', 'copy_link', NULL, 'copy', TRUE, 900),
  ('native_share', 'Native share', 'unknown', 'social_share', 'native_share', NULL, 'share', TRUE, 910)
ON CONFLICT (platform_key) DO UPDATE SET
  label = EXCLUDED.label,
  source = EXCLUDED.source,
  medium = EXCLUDED.medium,
  method = EXCLUDED.method,
  intent_url_template = EXCLUDED.intent_url_template,
  icon_key = EXCLUDED.icon_key,
  enabled = EXCLUDED.enabled,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO utm_share_templates (
  template_key,
  entity_type,
  entry_point,
  campaign,
  content,
  allowed_platforms,
  default_platform,
  enabled
) VALUES
  ('expense_detail_share_button', 'expense', 'expense_detail_share_button', 'expense_share', 'expense_detail_share_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE),
  ('expense_summary_share_button', 'expense', 'expense_summary_share_button', 'expense_share', 'expense_summary_share_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE),
  ('debt_detail_share_button', 'debt', 'debt_detail_share_button', 'debt_share', 'debt_detail_share_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE),
  ('friend_detail_share_button', 'friend', 'friend_detail_share_button', 'friend_invite', 'friend_detail_share_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE),
  ('group_detail_invite_button', 'group', 'group_detail_invite_button', 'group_invite', 'group_detail_invite_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE),
  ('profile_header_share_button', 'profile', 'profile_header_share_button', 'profile_share', 'profile_header_share_button', ARRAY['facebook','whatsapp','telegram','x','email','sms','copy_link','native_share'], 'facebook', TRUE)
ON CONFLICT (template_key) DO UPDATE SET
  entity_type = EXCLUDED.entity_type,
  entry_point = EXCLUDED.entry_point,
  campaign = EXCLUDED.campaign,
  content = EXCLUDED.content,
  allowed_platforms = EXCLUDED.allowed_platforms,
  default_platform = EXCLUDED.default_platform,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION normalize_utm_config_key(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(regexp_replace(lower(btrim(COALESCE(p_value, ''))), '[^a-z0-9_]+', '_', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION get_utm_share_config()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'platforms', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY row.display_order, row.platform_key)
      FROM (
        SELECT
          platform_key,
          label,
          source,
          medium,
          method,
          intent_url_template,
          icon_key,
          enabled,
          display_order
        FROM utm_platforms
        WHERE enabled = TRUE
      ) row
    ), '[]'::JSONB),
    'templates', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY row.entity_type, row.entry_point)
      FROM (
        SELECT
          template_key,
          entity_type,
          entry_point,
          campaign,
          content,
          allowed_platforms,
          default_platform,
          enabled
        FROM utm_share_templates
        WHERE enabled = TRUE
      ) row
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_utm_share_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_get_utm_config()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read UTM config';
  END IF;

  SELECT jsonb_build_object(
    'platforms', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY row.display_order, row.platform_key)
      FROM (
        SELECT
          platform_key,
          label,
          source,
          medium,
          method,
          intent_url_template,
          icon_key,
          enabled,
          display_order
        FROM utm_platforms
      ) row
    ), '[]'::JSONB),
    'templates', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY row.entity_type, row.entry_point)
      FROM (
        SELECT
          template_key,
          entity_type,
          entry_point,
          campaign,
          content,
          allowed_platforms,
          default_platform,
          enabled
        FROM utm_share_templates
      ) row
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_utm_config() TO authenticated;

CREATE OR REPLACE FUNCTION admin_upsert_utm_platform(p_platform JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_key TEXT := normalize_utm_config_key(p_platform ->> 'platform_key');
  v_method TEXT := normalize_utm_config_key(COALESCE(p_platform ->> 'method', 'platform'));
  v_row utm_platforms%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can write UTM platforms';
  END IF;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'platform_key is required';
  END IF;

  IF v_method NOT IN ('platform', 'copy_link', 'native_share') THEN
    v_method := 'platform';
  END IF;

  INSERT INTO utm_platforms (
    platform_key,
    label,
    source,
    medium,
    method,
    intent_url_template,
    icon_key,
    enabled,
    display_order
  )
  VALUES (
    v_key,
    COALESCE(NULLIF(btrim(p_platform ->> 'label'), ''), v_key),
    COALESCE(normalize_utm_config_key(p_platform ->> 'source'), CASE WHEN v_method = 'platform' THEN v_key ELSE 'unknown' END),
    COALESCE(normalize_utm_config_key(p_platform ->> 'medium'), CASE WHEN v_method = 'copy_link' THEN 'copy_link' ELSE 'social_share' END),
    v_method,
    NULLIF(btrim(p_platform ->> 'intent_url_template'), ''),
    NULLIF(btrim(p_platform ->> 'icon_key'), ''),
    COALESCE((p_platform ->> 'enabled')::BOOLEAN, TRUE),
    COALESCE((p_platform ->> 'display_order')::INTEGER, 100)
  )
  ON CONFLICT (platform_key) DO UPDATE SET
    label = EXCLUDED.label,
    source = EXCLUDED.source,
    medium = EXCLUDED.medium,
    method = EXCLUDED.method,
    intent_url_template = EXCLUDED.intent_url_template,
    icon_key = EXCLUDED.icon_key,
    enabled = EXCLUDED.enabled,
    display_order = EXCLUDED.display_order,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'created_at' - 'updated_at';
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_upsert_utm_platform(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION admin_upsert_utm_template(p_template JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_key TEXT := normalize_utm_config_key(p_template ->> 'template_key');
  v_allowed TEXT[];
  v_default TEXT := normalize_utm_config_key(p_template ->> 'default_platform');
  v_row utm_share_templates%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can write UTM templates';
  END IF;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'template_key is required';
  END IF;

  SELECT COALESCE(array_agg(value ORDER BY value), '{}')
  INTO v_allowed
  FROM (
    SELECT DISTINCT normalize_utm_config_key(item.value) AS value
    FROM jsonb_array_elements_text(COALESCE(p_template -> 'allowed_platforms', '[]'::JSONB)) AS item(value)
  ) rows
  WHERE value IS NOT NULL;

  INSERT INTO utm_share_templates (
    template_key,
    entity_type,
    entry_point,
    campaign,
    content,
    allowed_platforms,
    default_platform,
    enabled
  )
  VALUES (
    v_key,
    COALESCE(normalize_utm_config_key(p_template ->> 'entity_type'), split_part(v_key, '_', 1)),
    COALESCE(normalize_utm_config_key(p_template ->> 'entry_point'), v_key),
    COALESCE(normalize_utm_config_key(p_template ->> 'campaign'), 'share'),
    COALESCE(normalize_utm_config_key(p_template ->> 'content'), v_key),
    COALESCE(v_allowed, '{}'),
    v_default,
    COALESCE((p_template ->> 'enabled')::BOOLEAN, TRUE)
  )
  ON CONFLICT (template_key) DO UPDATE SET
    entity_type = EXCLUDED.entity_type,
    entry_point = EXCLUDED.entry_point,
    campaign = EXCLUDED.campaign,
    content = EXCLUDED.content,
    allowed_platforms = EXCLUDED.allowed_platforms,
    default_platform = EXCLUDED.default_platform,
    enabled = EXCLUDED.enabled,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'created_at' - 'updated_at';
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_upsert_utm_template(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION admin_get_utm_canvas(
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
STABLE
AS $fn$
DECLARE
  v_from TIMESTAMPTZ := COALESCE(p_from, NOW() - INTERVAL '30 days');
  v_to TIMESTAMPTZ := COALESCE(p_to, NOW());
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read UTM canvas';
  END IF;

  WITH scoped_events AS (
    SELECT
      e.id,
      e.event_name,
      e.session_id,
      e.user_id,
      COALESCE(NULLIF(e.properties->>'share_platform', ''), NULLIF(e.properties->>'utm_source', ''), s.utm_source, s.landing_source, 'direct') AS source_name,
      COALESCE(NULLIF(e.properties->>'share_method', ''), CASE WHEN e.event_name LIKE 'share_%' THEN COALESCE(NULLIF(e.properties->>'share_type', ''), 'unknown') ELSE 'session' END) AS method_name,
      COALESCE(NULLIF(e.properties->>'utm_campaign', ''), s.utm_campaign, 'none') AS campaign_name,
      COALESCE(NULLIF(e.properties->>'utm_content', ''), s.utm_content, e.event_name, 'unknown') AS content_name,
      COALESCE(NULLIF(e.properties->>'destination_path', ''), e.page_path, '/') AS destination_path,
      COALESCE(NULLIF(e.properties->>'entity_type', ''), 'unknown') AS entity_type,
      COALESCE(NULLIF(e.properties->>'utm_medium', ''), s.utm_medium, CASE WHEN s.landing_referrer IS NOT NULL THEN 'referral' ELSE 'none' END) AS medium_name
    FROM user_tracking_events e
    LEFT JOIN user_tracking_sessions s ON s.id = e.session_id
    WHERE e.occurred_at >= v_from
      AND e.occurred_at <= v_to
      AND (p_user_id IS NULL OR e.user_id = p_user_id)
      AND (p_entity_type IS NULL OR e.properties->>'entity_type' = p_entity_type)
      AND (p_source IS NULL OR COALESCE(NULLIF(e.properties->>'share_platform', ''), NULLIF(e.properties->>'utm_source', ''), s.utm_source, s.landing_source, 'direct') = p_source)
      AND (p_campaign IS NULL OR COALESCE(NULLIF(e.properties->>'utm_campaign', ''), s.utm_campaign) = p_campaign)
      AND (p_medium IS NULL OR COALESCE(NULLIF(e.properties->>'utm_medium', ''), s.utm_medium, CASE WHEN s.landing_referrer IS NOT NULL THEN 'referral' ELSE 'none' END) = p_medium)
  ),
  node_rows AS (
    SELECT 'source:' || source_name AS id, 'source' AS layer, 0 AS layer_index, source_name AS label,
      COUNT(*)::INT AS events,
      COUNT(DISTINCT session_id)::INT AS sessions,
      COUNT(*) FILTER (WHERE event_name LIKE 'share_%')::INT AS shares,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT AS signups,
      COUNT(*) FILTER (WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))::INT AS conversions
    FROM scoped_events
    GROUP BY source_name
    UNION ALL
    SELECT 'method:' || method_name, 'method', 1, method_name,
      COUNT(*)::INT,
      COUNT(DISTINCT session_id)::INT,
      COUNT(*) FILTER (WHERE event_name LIKE 'share_%')::INT,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT,
      COUNT(*) FILTER (WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))::INT
    FROM scoped_events
    GROUP BY method_name
    UNION ALL
    SELECT 'campaign:' || campaign_name, 'campaign', 2, campaign_name,
      COUNT(*)::INT,
      COUNT(DISTINCT session_id)::INT,
      COUNT(*) FILTER (WHERE event_name LIKE 'share_%')::INT,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT,
      COUNT(*) FILTER (WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))::INT
    FROM scoped_events
    GROUP BY campaign_name
    UNION ALL
    SELECT 'content:' || content_name, 'content', 3, content_name,
      COUNT(*)::INT,
      COUNT(DISTINCT session_id)::INT,
      COUNT(*) FILTER (WHERE event_name LIKE 'share_%')::INT,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT,
      COUNT(*) FILTER (WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))::INT
    FROM scoped_events
    GROUP BY content_name
    UNION ALL
    SELECT 'destination:' || destination_path, 'destination', 4, destination_path,
      COUNT(*)::INT,
      COUNT(DISTINCT session_id)::INT,
      COUNT(*) FILTER (WHERE event_name LIKE 'share_%')::INT,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT,
      COUNT(*) FILTER (WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))::INT
    FROM scoped_events
    GROUP BY destination_path
    UNION ALL
    SELECT 'conversion:' || event_name, 'conversion', 5, event_name,
      COUNT(*)::INT,
      COUNT(DISTINCT session_id)::INT,
      0,
      COUNT(*) FILTER (WHERE event_name = 'auth_register')::INT,
      COUNT(*)::INT
    FROM scoped_events
    WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link')
    GROUP BY event_name
  ),
  ranked_nodes AS (
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY layer ORDER BY events DESC, label ASC) AS node_order
    FROM node_rows
    WHERE events > 0
  ),
  edge_rows AS (
    SELECT 'source:' || source_name AS source, 'method:' || method_name AS target, COUNT(*)::INT AS count
    FROM scoped_events
    GROUP BY source_name, method_name
    UNION ALL
    SELECT 'method:' || method_name, 'campaign:' || campaign_name, COUNT(*)::INT
    FROM scoped_events
    GROUP BY method_name, campaign_name
    UNION ALL
    SELECT 'campaign:' || campaign_name, 'content:' || content_name, COUNT(*)::INT
    FROM scoped_events
    GROUP BY campaign_name, content_name
    UNION ALL
    SELECT 'content:' || content_name, 'destination:' || destination_path, COUNT(*)::INT
    FROM scoped_events
    GROUP BY content_name, destination_path
    UNION ALL
    SELECT 'destination:' || destination_path, 'conversion:' || event_name, COUNT(*)::INT
    FROM scoped_events
    WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link')
    GROUP BY destination_path, event_name
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'from', v_from,
      'to', v_to,
      'events', (SELECT COUNT(*) FROM scoped_events),
      'sessions', (SELECT COUNT(DISTINCT session_id) FROM scoped_events),
      'shares', (SELECT COUNT(*) FROM scoped_events WHERE event_name LIKE 'share_%'),
      'conversions', (SELECT COUNT(*) FROM scoped_events WHERE event_name IN ('auth_register','invite_accepted','payment_created','settlement_completed','group_created','expense_created','profile_viewed_from_shared_link'))
    ),
    'nodes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', layer,
          'label', label,
          'layer_index', layer_index,
          'order', node_order,
          'metrics', jsonb_build_object(
            'events', events,
            'sessions', sessions,
            'shares', shares,
            'signups', signups,
            'conversions', conversions,
            'conversion_rate', CASE WHEN sessions > 0 THEN ROUND((conversions::NUMERIC / sessions::NUMERIC) * 100, 2) ELSE 0 END
          )
        )
        ORDER BY layer_index, node_order
      )
      FROM ranked_nodes
    ), '[]'::JSONB),
    'edges', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'source', source,
          'target', target,
          'count', count
        )
        ORDER BY count DESC, source ASC, target ASC
      )
      FROM edge_rows
      WHERE count > 0
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN COALESCE(v_result, jsonb_build_object('summary', jsonb_build_object('from', v_from, 'to', v_to), 'nodes', '[]'::JSONB, 'edges', '[]'::JSONB));
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_utm_canvas(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

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
      s.utm_content AS session_content,
      COALESCE(NULLIF(e.properties->>'destination_path', ''), e.page_path, '/') AS destination_path
    FROM user_tracking_events e
    LEFT JOIN scoped_sessions s ON s.id = e.session_id
    WHERE e.occurred_at >= v_from
      AND e.occurred_at <= v_to
      AND (p_user_id IS NULL OR e.user_id = p_user_id)
      AND (p_entity_type IS NULL OR e.properties->>'entity_type' = p_entity_type)
      AND (p_source IS NULL OR COALESCE(NULLIF(e.properties->>'share_platform', ''), NULLIF(e.properties->>'utm_source', ''), s.source_name, 'direct') = p_source)
      AND (p_campaign IS NULL OR COALESCE(NULLIF(e.properties->>'utm_campaign', ''), s.utm_campaign) = p_campaign)
      AND (p_medium IS NULL OR COALESCE(NULLIF(e.properties->>'utm_medium', ''), s.medium_name) = p_medium)
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
        SELECT COALESCE(NULLIF(properties->>'share_platform', ''), NULLIF(properties->>'utm_source', ''), source_name, 'direct') AS source_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name = 'auth_register'
        GROUP BY COALESCE(NULLIF(properties->>'share_platform', ''), NULLIF(properties->>'utm_source', ''), source_name, 'direct')
        ORDER BY count DESC, source_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'invite_accepted_by_campaign', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', campaign_name, 'count', count) ORDER BY count DESC, campaign_name ASC)
      FROM (
        SELECT COALESCE(NULLIF(properties->>'utm_campaign', ''), session_campaign, 'none') AS campaign_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name = 'invite_accepted'
        GROUP BY COALESCE(NULLIF(properties->>'utm_campaign', ''), session_campaign, 'none')
        ORDER BY count DESC, campaign_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'share_count_by_content', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', content_name, 'count', count) ORDER BY count DESC, content_name ASC)
      FROM (
        SELECT COALESCE(NULLIF(properties->>'utm_content', ''), session_content, 'unknown') AS content_name, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name LIKE 'share_%'
        GROUP BY COALESCE(NULLIF(properties->>'utm_content', ''), session_content, 'unknown')
        ORDER BY count DESC, content_name ASC
        LIMIT 20
      ) rows
    ), '[]'::JSONB),
    'destination_pages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', destination_path, 'count', count) ORDER BY count DESC, destination_path ASC)
      FROM (
        SELECT destination_path, COUNT(*)::INT AS count
        FROM scoped_events
        WHERE event_name LIKE 'share_%'
        GROUP BY destination_path
        ORDER BY count DESC, destination_path ASC
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
    ), '[]'::JSONB),
    'recent_shares', COALESCE((
      SELECT jsonb_agg(to_jsonb(row) ORDER BY occurred_at DESC)
      FROM (
        SELECT
          occurred_at,
          event_name,
          user_id,
          session_id,
          properties->>'share_method' AS share_method,
          properties->>'share_platform' AS share_platform,
          properties->>'share_platform_detection' AS share_platform_detection,
          COALESCE(properties->>'destination_path', destination_path) AS destination_path,
          properties->>'destination_url' AS destination_url,
          properties->>'generated_path' AS generated_path,
          properties->>'generated_url_hash' AS generated_url_hash,
          properties->>'generated_url' AS generated_url,
          properties->>'entity_type' AS entity_type,
          properties->>'entity_id' AS entity_id,
          COALESCE(properties->>'utm_source', source_name) AS utm_source,
          COALESCE(properties->>'utm_medium', medium_name) AS utm_medium,
          COALESCE(properties->>'utm_campaign', session_campaign) AS utm_campaign,
          COALESCE(properties->>'utm_content', session_content) AS utm_content
        FROM scoped_events
        WHERE event_name LIKE 'share_%'
        ORDER BY occurred_at DESC
        LIMIT 50
      ) row
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_utm_performance(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION get_utm_share_config() IS
  'Public safe UTM share config for enabled platforms and templates.';

COMMENT ON FUNCTION admin_get_utm_canvas(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID) IS
  'Admin-only: Returns aggregate UTM flow nodes and edges for visual attribution canvas.';
