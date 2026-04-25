-- ROLLBACK: Restore invoke_process_recurring_expenses() to current_setting() form
-- Run manually if the Vault-based invoker causes a regression.
-- Note: After rollback the cron job will fail again unless app.supabase_url
-- and app.service_role_key are set, which Supabase managed cloud blocks.
-- Practical rollback also requires cron.unschedule(<jobid>) until a fix is ready.

BEGIN;

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

COMMIT;
