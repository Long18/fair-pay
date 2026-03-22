-- ========================================
-- Migration: User Journey Canvas RPCs
-- Purpose: Graph aggregation RPC for canvas view + per-user tracking delete
-- ========================================

-- =============================================
-- 1. admin_get_user_journey_graph
-- Returns nodes (unique pages) and edges (page-to-page transitions)
-- for rendering a visual journey canvas.
-- =============================================
CREATE OR REPLACE FUNCTION admin_get_user_journey_graph(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_event_names TEXT[] DEFAULT NULL
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
    RAISE EXCEPTION 'Only administrators can read user journey graph';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  WITH scoped_events AS (
    SELECT e.*
    FROM user_tracking_events e
    WHERE e.user_id = p_user_id
      AND (p_session_id IS NULL OR e.session_id = p_session_id)
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_event_names IS NULL OR e.event_name = ANY(p_event_names))
  ),
  -- Compute duration for page_view events using LEAD window
  page_durations AS (
    SELECT
      e.page_path,
      EXTRACT(EPOCH FROM (
        LEAD(e.occurred_at) OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) - e.occurred_at
      )) AS duration_secs
    FROM scoped_events e
    WHERE e.event_name = 'page_view'
  ),
  -- Aggregate durations per page (cap at 30 min = 1800s)
  avg_durations AS (
    SELECT
      page_path,
      AVG(CASE WHEN duration_secs > 0 AND duration_secs <= 1800 THEN duration_secs END) AS avg_duration_seconds
    FROM page_durations
    GROUP BY page_path
  ),
  -- Nodes: unique pages with aggregated stats
  nodes AS (
    SELECT
      e.page_path,
      COUNT(*) AS visit_count,
      MAX(e.occurred_at) AS last_visited_at,
      ARRAY_AGG(DISTINCT e.event_name ORDER BY e.event_name) AS event_types,
      d.avg_duration_seconds
    FROM scoped_events e
    LEFT JOIN avg_durations d ON d.page_path = e.page_path
    GROUP BY e.page_path, d.avg_duration_seconds
  ),
  -- Edges: consecutive page transitions within same session
  ordered_events AS (
    SELECT
      e.session_id,
      e.page_path,
      e.occurred_at,
      LAG(e.page_path) OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) AS prev_page_path
    FROM scoped_events e
  ),
  transitions AS (
    SELECT
      prev_page_path AS source,
      page_path AS target,
      COUNT(*) AS frequency
    FROM ordered_events
    WHERE prev_page_path IS NOT NULL
      AND prev_page_path <> page_path
    GROUP BY prev_page_path, page_path
  )
  SELECT jsonb_build_object(
    'nodes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_path', n.page_path,
        'visit_count', n.visit_count,
        'last_visited_at', n.last_visited_at,
        'event_types', n.event_types,
        'avg_duration_seconds', ROUND(n.avg_duration_seconds::NUMERIC, 1)
      ) ORDER BY n.visit_count DESC)
      FROM nodes n
    ), '[]'::JSONB),
    'edges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'source', t.source,
        'target', t.target,
        'frequency', t.frequency
      ) ORDER BY t.frequency DESC)
      FROM transitions t
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_get_user_journey_graph(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[]) TO authenticated;

COMMENT ON FUNCTION admin_get_user_journey_graph IS 'Returns page nodes and transition edges for rendering a visual journey canvas. Admin-only.';

-- =============================================
-- 2. admin_delete_user_tracking
-- Deletes tracking data for a specific user within a time range.
-- =============================================
CREATE OR REPLACE FUNCTION admin_delete_user_tracking(
  p_user_id UUID,
  p_time_range TEXT DEFAULT 'all'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted_events BIGINT;
  v_deleted_sessions BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete user tracking data';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_time_range NOT IN ('1h', '24h', '7d', '30d', '1y', 'all') THEN
    RAISE EXCEPTION 'Invalid p_time_range. Must be one of: 1h, 24h, 7d, 30d, 1y, all';
  END IF;

  -- Compute cutoff timestamp
  IF p_time_range = 'all' THEN
    v_cutoff := NULL;
  ELSIF p_time_range = '1h' THEN
    v_cutoff := NOW() - INTERVAL '1 hour';
  ELSIF p_time_range = '24h' THEN
    v_cutoff := NOW() - INTERVAL '24 hours';
  ELSIF p_time_range = '7d' THEN
    v_cutoff := NOW() - INTERVAL '7 days';
  ELSIF p_time_range = '30d' THEN
    v_cutoff := NOW() - INTERVAL '30 days';
  ELSIF p_time_range = '1y' THEN
    v_cutoff := NOW() - INTERVAL '1 year';
  END IF;

  -- Delete events
  IF v_cutoff IS NULL THEN
    DELETE FROM user_tracking_events WHERE user_id = p_user_id;
  ELSE
    DELETE FROM user_tracking_events WHERE user_id = p_user_id AND occurred_at >= v_cutoff;
  END IF;
  GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

  -- Delete orphaned sessions (no remaining events)
  DELETE FROM user_tracking_sessions s
  WHERE s.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_tracking_events e WHERE e.session_id = s.id
    );
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_events', v_deleted_events,
    'deleted_sessions', v_deleted_sessions
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION admin_delete_user_tracking(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_delete_user_tracking IS 'Deletes tracking events and orphaned sessions for a specific user within a time range. Admin-only.';
