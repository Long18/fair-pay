-- Migration: Include actor avatar_url in admin audit log reads
-- Purpose: Admin Audit Log list can show actor avatars without N+1 profile fetches.

DROP VIEW IF EXISTS admin_audit_unified;

CREATE VIEW admin_audit_unified AS
  SELECT
    al.id,
    'audit_logs'::TEXT AS source,
    al.table_name,
    NULL::TEXT AS entity_type,
    al.record_id AS entity_id,
    al.operation AS action_type,
    al.old_data,
    al.new_data,
    NULL::JSONB AS metadata,
    al.user_id AS actor_id,
    p.full_name AS actor_name,
    p.email AS actor_email,
    p.avatar_url AS actor_avatar_url,
    al.created_at AS timestamp
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id

  UNION ALL

  SELECT
    at2.id,
    'audit_trail'::TEXT AS source,
    NULL::TEXT AS table_name,
    at2.entity_type,
    at2.entity_id,
    at2.action_type,
    NULL::JSONB AS old_data,
    NULL::JSONB AS new_data,
    at2.metadata,
    at2.actor AS actor_id,
    p2.full_name AS actor_name,
    p2.email AS actor_email,
    p2.avatar_url AS actor_avatar_url,
    at2.timestamp
  FROM audit_trail at2
  LEFT JOIN profiles p2 ON p2.id = at2.actor;

COMMENT ON VIEW admin_audit_unified IS
  'Unified view merging audit_logs and audit_trail for admin dashboard, including actor_avatar_url.';

GRANT SELECT ON admin_audit_unified TO authenticated;

DROP FUNCTION IF EXISTS read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION read_admin_audit_logs(
  p_search TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_table_name TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
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
    RAISE EXCEPTION 'Only administrators can read audit logs';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN p_limit := 20; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  SELECT COUNT(*) INTO v_total
  FROM admin_audit_unified v
  WHERE
    (p_action_type IS NULL OR v.action_type = p_action_type)
    AND (p_table_name IS NULL OR v.table_name = p_table_name OR v.entity_type = p_table_name)
    AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
    AND (p_date_from IS NULL OR v.timestamp >= p_date_from)
    AND (p_date_to IS NULL OR v.timestamp <= p_date_to)
    AND (p_search IS NULL OR p_search = '' OR
      v.actor_name ILIKE '%' || p_search || '%' OR
      v.actor_email ILIKE '%' || p_search || '%' OR
      v.action_type ILIKE '%' || p_search || '%' OR
      COALESCE(v.table_name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(v.entity_type, '') ILIKE '%' || p_search || '%' OR
      v.entity_id::TEXT ILIKE '%' || p_search || '%'
    );

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', v.id,
      'source', v.source,
      'table_name', v.table_name,
      'entity_type', v.entity_type,
      'entity_id', v.entity_id,
      'action_type', v.action_type,
      'old_data', v.old_data,
      'new_data', v.new_data,
      'metadata', v.metadata,
      'actor_id', v.actor_id,
      'actor_name', v.actor_name,
      'actor_email', v.actor_email,
      'actor_avatar_url', v.actor_avatar_url,
      'timestamp', v.timestamp
    ) AS row_data
    FROM admin_audit_unified v
    WHERE
      (p_action_type IS NULL OR v.action_type = p_action_type)
      AND (p_table_name IS NULL OR v.table_name = p_table_name OR v.entity_type = p_table_name)
      AND (p_actor_id IS NULL OR v.actor_id = p_actor_id)
      AND (p_date_from IS NULL OR v.timestamp >= p_date_from)
      AND (p_date_to IS NULL OR v.timestamp <= p_date_to)
      AND (p_search IS NULL OR p_search = '' OR
        v.actor_name ILIKE '%' || p_search || '%' OR
        v.actor_email ILIKE '%' || p_search || '%' OR
        v.action_type ILIKE '%' || p_search || '%' OR
        COALESCE(v.table_name, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.entity_type, '') ILIKE '%' || p_search || '%' OR
        v.entity_id::TEXT ILIKE '%' || p_search || '%'
      )
    ORDER BY v.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'data', v_rows,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION read_admin_audit_logs(TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
