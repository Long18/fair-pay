-- Migration: Recurring processing timezone normalization + daily scheduler
-- Purpose:
--   1. Normalize recurring due checks to Asia/Ho_Chi_Minh.
--   2. Add a date-aware RPC for recurring due lookup without breaking callers.
--   3. Provide a cron-friendly helper that invokes the recurring Edge Function.
--   4. Auto-register a daily pg_cron job at 17:05 UTC (= 00:05 ICT) when
--      pg_cron/pg_net and app settings are already configured.

-- ---------------------------------------------------------------------------
-- Due recurring lookup, parameterized by reference date
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_due_recurring_expenses_for_date(
  p_reference_date DATE
)
RETURNS TABLE (
  id UUID,
  template_expense_id UUID,
  frequency TEXT,
  interval_value INTEGER,
  next_occurrence DATE,
  context_type TEXT,
  group_id UUID,
  friendship_id UUID,
  created_by UUID,
  prepaid_until DATE,
  end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.template_expense_id,
    re.frequency,
    re.interval,
    re.next_occurrence,
    e.context_type,
    e.group_id,
    e.friendship_id,
    e.created_by,
    re.prepaid_until,
    re.end_date
  FROM public.recurring_expenses re
  JOIN public.expenses e ON re.template_expense_id = e.id
  WHERE re.is_active = TRUE
    AND re.next_occurrence <= p_reference_date
    AND (re.end_date IS NULL OR re.end_date >= p_reference_date);
END;
$$;

COMMENT ON FUNCTION public.get_due_recurring_expenses_for_date(DATE) IS
'Get recurring expenses due on or before a supplied reference date. This is the
date-aware recurring lookup used by scheduled processing.';

GRANT EXECUTE ON FUNCTION public.get_due_recurring_expenses_for_date(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_recurring_expenses_for_date(DATE) TO service_role;

-- ---------------------------------------------------------------------------
-- Backward-compatible wrapper using Vietnam local date
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_due_recurring_expenses()
RETURNS TABLE (
  id UUID,
  template_expense_id UUID,
  frequency TEXT,
  interval_value INTEGER,
  next_occurrence DATE,
  context_type TEXT,
  group_id UUID,
  friendship_id UUID,
  created_by UUID,
  prepaid_until DATE,
  end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_vietnam_today DATE := (timezone('Asia/Ho_Chi_Minh', now()))::DATE;
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_due_recurring_expenses_for_date(v_vietnam_today);
END;
$$;

COMMENT ON FUNCTION public.get_due_recurring_expenses() IS
'Get recurring expenses due based on the current day in Asia/Ho_Chi_Minh.';

GRANT EXECUTE ON FUNCTION public.get_due_recurring_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_recurring_expenses() TO service_role;

-- ---------------------------------------------------------------------------
-- Cron helper that invokes the Edge Function with service_role auth
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invoke_process_recurring_expenses()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url TEXT := current_setting('app.supabase_url', true);
  v_service_role_key TEXT := current_setting('app.service_role_key', true);
  v_request_id BIGINT;
BEGIN
  IF COALESCE(v_supabase_url, '') = '' THEN
    RAISE EXCEPTION 'app.supabase_url is not set';
  END IF;

  IF COALESCE(v_service_role_key, '') = '' THEN
    RAISE EXCEPTION 'app.service_role_key is not set';
  END IF;

  SELECT net.http_post(
    url := rtrim(v_supabase_url, '/') || '/functions/v1/process-recurring-expenses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.invoke_process_recurring_expenses() IS
'Invoke the recurring expense Edge Function using app.supabase_url and
app.service_role_key. Intended for pg_cron scheduling.';

REVOKE ALL ON FUNCTION public.invoke_process_recurring_expenses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_process_recurring_expenses() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_process_recurring_expenses() TO service_role;

-- ---------------------------------------------------------------------------
-- Scheduler registration
-- 17:05 UTC = 00:05 Asia/Ho_Chi_Minh on the next day.
-- If pg_cron/pg_net or app settings are missing, the migration leaves a NOTICE
-- instead of failing. This keeps local/dev environments safe.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_existing_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    SELECT jobid
    INTO v_existing_job_id
    FROM cron.job
    WHERE jobname = 'process-recurring-expenses-daily-vn'
    LIMIT 1;

    IF v_existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_existing_job_id);
    END IF;

    IF COALESCE(current_setting('app.supabase_url', true), '') <> ''
       AND COALESCE(current_setting('app.service_role_key', true), '') <> '' THEN
      PERFORM cron.schedule(
        'process-recurring-expenses-daily-vn',
        '5 17 * * *',
        'SELECT public.invoke_process_recurring_expenses();'
      );

      RAISE NOTICE 'Scheduled recurring processing at 17:05 UTC (00:05 ICT).';
    ELSE
      RAISE NOTICE 'Skipping recurring schedule: app.supabase_url or app.service_role_key is not set.';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping recurring schedule: pg_cron or pg_net extension is not installed.';
  END IF;
END;
$$;
