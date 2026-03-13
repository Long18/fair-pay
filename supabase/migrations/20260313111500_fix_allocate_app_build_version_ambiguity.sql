-- Migration: Fix allocate_app_build_version ambiguity with RETURNS TABLE output names
-- Purpose:
--   The original function used ON CONFLICT (base_version, channel, counter_date)
--   while RETURNS TABLE exposed output params named base_version/channel.
--   In PL/pgSQL that can become ambiguous at execution time.

CREATE OR REPLACE FUNCTION public.allocate_app_build_version(
  p_base_version TEXT,
  p_channel TEXT,
  p_tz TEXT DEFAULT 'Asia/Ho_Chi_Minh'
)
RETURNS TABLE (
  version TEXT,
  base_version TEXT,
  date_code TEXT,
  sequence INTEGER,
  channel TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_counter_date DATE;
  v_date_code TEXT;
  v_sequence INTEGER;
  v_version TEXT;
BEGIN
  IF COALESCE(trim(p_base_version), '') = '' THEN
    RAISE EXCEPTION 'p_base_version is required';
  END IF;

  IF p_channel NOT IN ('production', 'preview') THEN
    RAISE EXCEPTION 'p_channel must be production or preview';
  END IF;

  IF COALESCE(trim(p_tz), '') = '' THEN
    RAISE EXCEPTION 'p_tz is required';
  END IF;

  v_counter_date := timezone(p_tz, now())::DATE;
  v_date_code := to_char(v_counter_date, 'YYMMDD');

  INSERT INTO public.app_build_counters (
    base_version,
    channel,
    counter_date,
    date_code,
    last_sequence,
    updated_at
  )
  VALUES (
    p_base_version,
    p_channel,
    v_counter_date,
    v_date_code,
    1,
    timezone('utc', now())
  )
  ON CONFLICT ON CONSTRAINT app_build_counters_unique_day
  DO UPDATE
    SET last_sequence = public.app_build_counters.last_sequence + 1,
        date_code = EXCLUDED.date_code,
        updated_at = timezone('utc', now())
  RETURNING public.app_build_counters.last_sequence
  INTO v_sequence;

  v_version := format(
    '%s-%s%s',
    p_base_version,
    v_date_code,
    CASE
      WHEN v_sequence < 100 THEN lpad(v_sequence::TEXT, 2, '0')
      ELSE v_sequence::TEXT
    END
  );

  RETURN QUERY
  SELECT
    v_version AS version,
    p_base_version AS base_version,
    v_date_code AS date_code,
    v_sequence AS sequence,
    p_channel AS channel;
END;
$$;

COMMENT ON FUNCTION public.allocate_app_build_version(TEXT, TEXT, TEXT) IS
'Allocate the next runtime app build version for a base version/channel/day.';

REVOKE ALL ON FUNCTION public.allocate_app_build_version(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_app_build_version(TEXT, TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.allocate_app_build_version(TEXT, TEXT, TEXT) TO service_role;
