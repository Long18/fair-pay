-- Extend email send timing to reduce spam-filter pressure on Gmail SMTP.
-- Changes:
--   1. Batch window: 2 minutes → 30 minutes (accumulate more into one digest)
--   2. Per-user cooldown: skip users who received any email digest in the last 2 hours
-- Admin / targeted sends (p_include_recent = true) still bypass both delays.

CREATE OR REPLACE FUNCTION public.get_email_notification_queue(
  p_notification_ids UUID[] DEFAULT NULL,
  p_include_recent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  notification_id   UUID,
  user_id           UUID,
  user_email        TEXT,
  user_name         TEXT,
  has_auth_account  BOOLEAN,
  notification_type TEXT,
  title             TEXT,
  message           TEXT,
  link              TEXT,
  created_at        TIMESTAMPTZ,
  email_context     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    n.id                                   AS notification_id,
    n.user_id,
    recipient.user_email                  AS user_email,
    p.full_name                            AS user_name,
    (u.id IS NOT NULL)                     AS has_auth_account,
    n.type                                 AS notification_type,
    n.title,
    n.message,
    n.link,
    n.created_at,
    n.email_context
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN auth.users u ON u.id = n.user_id
  LEFT JOIN public.user_settings us ON us.user_id = n.user_id
  LEFT JOIN LATERAL (
    SELECT ARRAY(
      SELECT DISTINCT ue.email
      FROM unnest(COALESCE(n.recipient_emails, ARRAY[]::TEXT[])) AS requested(email)
      JOIN public.user_emails ue
        ON ue.user_id = n.user_id
       AND ue.normalized_email = LOWER(BTRIM(requested.email))
      WHERE requested.email IS NOT NULL
        AND BTRIM(requested.email) <> ''
        AND ue.receives_notifications = TRUE
      ORDER BY ue.email
    ) AS emails
  ) requested ON TRUE
  LEFT JOIN LATERAL (
    SELECT ue.email
    FROM public.user_emails ue
    WHERE ue.user_id = n.user_id
      AND ue.is_primary = TRUE
      AND ue.receives_notifications = TRUE
    ORDER BY ue.updated_at DESC
    LIMIT 1
  ) primary_email ON TRUE
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN COALESCE(array_length(requested.emails, 1), 0) > 0 THEN requested.emails
      ELSE ARRAY[COALESCE(primary_email.email, NULLIF(p.email, ''), u.email)]
    END
  ) AS recipient(user_email)
  WHERE n.email_sent_at IS NULL
    AND (p_notification_ids IS NULL OR n.id = ANY(p_notification_ids))
    AND (p_include_recent OR n.created_at < now() - interval '30 minutes')
    AND (
      p_include_recent
      OR NOT EXISTS (
        SELECT 1
        FROM public.notifications recent
        WHERE recent.user_id = n.user_id
          AND recent.email_sent_at IS NOT NULL
          AND recent.email_sent_at > now() - interval '2 hours'
      )
    )
    AND recipient.user_email IS NOT NULL
    AND recipient.user_email <> ''
    AND (us.email_notifications IS NULL OR us.email_notifications = true)
  ORDER BY n.user_id, recipient.user_email, n.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) IS
  'Service-role email queue reader. Batches notifications older than 30 minutes and enforces a 2-hour per-user cooldown between digests (bypassed when p_include_recent).';
