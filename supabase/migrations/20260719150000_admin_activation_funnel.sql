-- Admin activation funnel: signup → first expense → 7d active cohort metrics.
-- Staff-only (is_admin OR is_staff).

CREATE OR REPLACE FUNCTION public.admin_get_activation_funnel(
  p_cohort_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_cohort_days INTEGER := GREATEST(1, LEAST(COALESCE(p_cohort_days, 30), 365));
  v_cohort_start TIMESTAMPTZ := now() - make_interval(days => v_cohort_days);
  v_signups BIGINT;
  v_first_expense BIGINT;
  v_active_7d BIGINT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STAFF_REQUIRED';
  END IF;

  WITH cohort AS (
    SELECT p.id AS user_id, p.created_at AS signed_up_at
    FROM public.profiles p
    WHERE p.created_at >= v_cohort_start
  ),
  first_expense AS (
    SELECT DISTINCT c.user_id
    FROM cohort c
    JOIN public.expenses e
      ON e.created_by = c.user_id
     AND e.is_payment = false
     AND e.created_at >= c.signed_up_at
  ),
  active_7d AS (
    SELECT DISTINCT c.user_id
    FROM cohort c
    WHERE EXISTS (
      SELECT 1
      FROM public.user_journey_events uje
      WHERE uje.user_id = c.user_id
        AND uje.created_at >= c.signed_up_at
        AND uje.created_at < c.signed_up_at + interval '7 days'
    )
    OR EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.created_by = c.user_id
        AND e.is_payment = false
        AND e.created_at >= c.signed_up_at
        AND e.created_at < c.signed_up_at + interval '7 days'
    )
  )
  SELECT
    (SELECT COUNT(*) FROM cohort),
    (SELECT COUNT(*) FROM first_expense),
    (SELECT COUNT(*) FROM active_7d)
  INTO v_signups, v_first_expense, v_active_7d;

  RETURN jsonb_build_object(
    'cohort_days', v_cohort_days,
    'signups', v_signups,
    'first_expense', v_first_expense,
    'active_7d', v_active_7d,
    'signup_to_expense_rate', CASE
      WHEN v_signups = 0 THEN 0
      ELSE ROUND(100.0 * v_first_expense / v_signups, 1)
    END,
    'signup_to_active_rate', CASE
      WHEN v_signups = 0 THEN 0
      ELSE ROUND(100.0 * v_active_7d / v_signups, 1)
    END,
    'expense_to_active_rate', CASE
      WHEN v_first_expense = 0 THEN 0
      ELSE ROUND(100.0 * v_active_7d / v_first_expense, 1)
    END
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_activation_funnel(INTEGER) IS
  'Staff-only activation cohort: signups → first expense → active within 7d of signup.';

REVOKE ALL ON FUNCTION public.admin_get_activation_funnel(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_activation_funnel(INTEGER)
  TO authenticated;
