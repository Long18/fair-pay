-- Migration: Switch recurring scheduler invoker to Supabase Vault
-- Purpose:
--   Supabase managed cloud forbids `ALTER DATABASE/ROLE postgres SET app.*` for
--   non-superuser roles, so the original migration (20260310100000) silently
--   skipped cron registration on production because `app.supabase_url` and
--   `app.service_role_key` could never be set.
--
--   This migration replaces only the invoker function so it:
--     1. Hardcodes the Supabase project URL (URL is not a secret).
--     2. Reads the service_role_key from Supabase Vault, which is the
--        recommended pattern for storing secrets accessed by pg_cron jobs.
--
-- Operator follow-up:
--   After applying, run ONCE in the SQL Editor to seed the Vault secret:
--
--     SELECT vault.create_secret(
--       '<SERVICE_ROLE_KEY>',
--       'process_recurring_service_role_key'
--     );
--
--   Then verify with:
--
--     SELECT public.invoke_process_recurring_expenses();
--
-- Notes:
--   - Function name + signature are unchanged, so the existing pg_cron job
--     `process-recurring-expenses-daily-vn` keeps working without
--     unschedule/reschedule.
--   - Migration 20260310100000 remains the source of truth for the cron job
--     registration; only the invoker body is being overridden here.

CREATE OR REPLACE FUNCTION public.invoke_process_recurring_expenses()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_supabase_url TEXT := 'https://nowtovakbozjjkdsjmtd.supabase.co';
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret
  INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'process_recurring_service_role_key'
  LIMIT 1;

  IF COALESCE(v_service_role_key, '') = '' THEN
    RAISE EXCEPTION
      'Missing Vault secret: process_recurring_service_role_key. Run: SELECT vault.create_secret(''<SERVICE_ROLE_KEY>'', ''process_recurring_service_role_key'');';
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/process-recurring-expenses',
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
'Invoke the recurring expense Edge Function. Reads the service_role_key from
Supabase Vault (secret name: process_recurring_service_role_key). Used by the
pg_cron job process-recurring-expenses-daily-vn.';

REVOKE ALL ON FUNCTION public.invoke_process_recurring_expenses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_process_recurring_expenses() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_process_recurring_expenses() TO service_role;
