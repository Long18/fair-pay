-- Admin email devtool support
-- - Allows admins to manage notification rows from the dashboard.
-- - Allows the email worker to send selected notifications immediately.

-- Admin notification management policies.
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (is_admin());

-- Replace the original no-arg queue RPC with an optionally targeted version.
-- Default calls preserve cron behavior: only rows older than 2 minutes are sent.
DROP FUNCTION IF EXISTS public.get_email_notification_queue();

CREATE OR REPLACE FUNCTION public.get_email_notification_queue(
  p_notification_ids UUID[] DEFAULT NULL,
  p_include_recent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  notification_id   UUID,
  user_id           UUID,
  user_email        TEXT,
  user_name         TEXT,
  notification_type TEXT,
  title             TEXT,
  message           TEXT,
  link              TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    n.id        AS notification_id,
    n.user_id,
    u.email     AS user_email,
    p.full_name AS user_name,
    n.type      AS notification_type,
    n.title,
    n.message,
    n.link,
    n.created_at
  FROM public.notifications n
  JOIN auth.users u ON u.id = n.user_id
  JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN public.user_settings us ON us.user_id = n.user_id
  WHERE n.email_sent_at IS NULL
    AND (p_notification_ids IS NULL OR n.id = ANY(p_notification_ids))
    AND (p_include_recent OR n.created_at < now() - interval '2 minutes')
    AND u.email IS NOT NULL
    AND u.email != ''
    AND (us.email_notifications IS NULL OR us.email_notifications = true)
  ORDER BY n.user_id, n.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) IS
  'Service-role email queue reader. Optional notification ids let admin-triggered reminders bypass the normal 2-minute batching delay.';
