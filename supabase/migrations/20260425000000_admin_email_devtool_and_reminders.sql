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

CREATE OR REPLACE FUNCTION public.admin_get_email_devtool_summary(
  p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_pending_queue_count BIGINT;
  v_debtors JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view email devtool summary';
  END IF;

  SELECT COUNT(*)
  INTO v_pending_queue_count
  FROM public.notifications
  WHERE email_sent_at IS NULL;

  WITH user_debts AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      u.email,
      COALESCE(SUM(CASE WHEN uds.owes_user = p.id THEN uds.amount_owed ELSE 0 END), 0)::NUMERIC(12,2) AS total_i_owe,
      COALESCE(
        SUM(CASE WHEN uds.owed_user = p.id THEN uds.amount_owed ELSE -uds.amount_owed END),
        0
      )::NUMERIC(12,2) AS net_balance,
      COUNT(DISTINCT CASE
        WHEN uds.owed_user = p.id THEN uds.owes_user
        WHEN uds.owes_user = p.id THEN uds.owed_user
      END)::INT AS active_debt_relationships
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.user_debts_summary uds ON (uds.owed_user = p.id OR uds.owes_user = p.id)
    GROUP BY p.id, p.full_name, u.email
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.total_i_owe DESC), '[]'::JSONB)
  INTO v_debtors
  FROM (
    SELECT *
    FROM user_debts
    WHERE total_i_owe > 0
      AND email IS NOT NULL
      AND email != ''
    ORDER BY total_i_owe DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) d;

  RETURN jsonb_build_object(
    'pending_queue_count', COALESCE(v_pending_queue_count, 0),
    'debtors', COALESCE(v_debtors, '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_email_devtool_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_email_devtool_summary(INT) TO authenticated;

COMMENT ON FUNCTION public.admin_get_email_devtool_summary(INT) IS
  'Admin-only summary for DevTool email tab: unsent notification count and current debtors with email addresses.';
