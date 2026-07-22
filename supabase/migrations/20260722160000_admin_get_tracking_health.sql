-- Admin tracking health: event volume in last 24h for pipeline observability.
-- Staff-only (is_admin OR is_staff).

CREATE OR REPLACE FUNCTION public.admin_get_tracking_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - interval '24 hours';
  v_events JSONB;
  v_total BIGINT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STAFF_REQUIRED';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_name', event_name,
        'count', event_count
      )
      ORDER BY event_count DESC, event_name ASC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM (
    SELECT event_name, COUNT(*)::BIGINT AS event_count
    FROM public.user_tracking_events
    WHERE occurred_at >= v_since
    GROUP BY event_name
  ) counts;

  SELECT COUNT(*)::BIGINT
  INTO v_total
  FROM public.user_tracking_events
  WHERE occurred_at >= v_since;

  RETURN jsonb_build_object(
    'window_hours', 24,
    'total_events', v_total,
    'distinct_events', COALESCE(jsonb_array_length(v_events), 0),
    'events', v_events
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_tracking_health() IS
  'Staff-only: event counts in user_tracking_events for the last 24 hours.';

REVOKE ALL ON FUNCTION public.admin_get_tracking_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_tracking_health() TO authenticated;
