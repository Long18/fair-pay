-- =============================================
-- Broadcast notification via Supabase Realtime on INSERT
--
-- Instead of relying on postgres_changes (which is deprecated and
-- has scaling issues), we use realtime.send() to broadcast
-- new notifications to user-specific private channels.
--
-- Channel pattern: user:<user_id>:notifications
-- Event name: notification_created
-- =============================================

-- 1. Create the broadcast trigger function
CREATE OR REPLACE FUNCTION broadcast_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Broadcast to user-specific channel
  PERFORM realtime.send(
    'user:' || NEW.user_id::text || ':notifications',
    'notification_created',
    jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message,
      'link', NEW.link,
      'related_id', NEW.related_id,
      'is_read', NEW.is_read,
      'created_at', NEW.created_at
    ),
    false  -- public channel (no RLS check needed, channel is user-scoped)
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION broadcast_notification() OWNER TO postgres;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_broadcast_notification ON notifications;

CREATE TRIGGER trigger_broadcast_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_notification();

-- 3. Grant permissions
GRANT ALL ON FUNCTION broadcast_notification() TO postgres;
GRANT ALL ON FUNCTION broadcast_notification() TO service_role;
