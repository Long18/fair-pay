-- Migration: Add email notification worker support
-- Adds email_sent_at tracking field and queue function for the
-- send-email-notifications Edge Function (scheduled every 5 min via pg_cron).

-- 1. Add email_sent_at to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- 2. Index to efficiently query unsent notifications
--    Partial index only covers rows where email not yet sent (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_notifications_email_queue
  ON public.notifications (user_id, created_at)
  WHERE email_sent_at IS NULL;

-- 3. SQL function to fetch pending email notification queue
--    Joins notifications + auth.users (for email) + user_settings (for preference)
--    Only returns notifications that:
--      - Have not been emailed yet (email_sent_at IS NULL)
--      - Are older than 2 minutes (buffer to batch rapid notifications)
--      - Belong to users with email_notifications enabled
--      - Have a valid email address
CREATE OR REPLACE FUNCTION get_email_notification_queue()
RETURNS TABLE (
  notification_id  UUID,
  user_id          UUID,
  user_email       TEXT,
  user_name        TEXT,
  notification_type TEXT,
  title            TEXT,
  message          TEXT,
  link             TEXT,
  created_at       TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    n.id              AS notification_id,
    n.user_id,
    u.email           AS user_email,
    p.full_name       AS user_name,
    n.type            AS notification_type,
    n.title,
    n.message,
    n.link,
    n.created_at
  FROM public.notifications n
  JOIN auth.users u ON u.id = n.user_id
  JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN public.user_settings us ON us.user_id = n.user_id
  WHERE n.email_sent_at IS NULL
    AND n.created_at < now() - interval '2 minutes'
    AND u.email IS NOT NULL
    AND u.email != ''
    AND (us.email_notifications IS NULL OR us.email_notifications = true)
  ORDER BY n.user_id, n.created_at
  LIMIT 200;
$$;

-- Grant execute to service_role only (Edge Function uses service_role key)
REVOKE ALL ON FUNCTION get_email_notification_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_email_notification_queue() TO service_role;

-- -----------------------------------------------------------------------
-- CRON JOB SETUP (requires pg_cron + pg_net extensions)
-- Run this manually in Supabase SQL editor after setting up the Edge Function:
--
-- SELECT cron.schedule(
--   'send-email-notifications',        -- job name
--   '*/5 * * * *',                     -- every 5 minutes
--   $$
--   SELECT net.http_post(
--     url     := current_setting('app.supabase_url') || '/functions/v1/send-email-notifications',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body    := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
--
-- Also set app settings in Supabase dashboard:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
-- -----------------------------------------------------------------------
