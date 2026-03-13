-- =============================================
-- Update notification-creating functions to include actor_id
-- Only updates the currently active functions.
-- =============================================

-- 1. Update notify_friend_request to include actor_id
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_recipient_id UUID;
  v_requester_id UUID;
  v_requester_name TEXT;
  v_notify_enabled BOOLEAN;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  SELECT full_name INTO v_requester_name
  FROM profiles
  WHERE id = v_requester_id;

  SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
  FROM user_settings
  WHERE user_id = v_recipient_id;

  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    link,
    related_id,
    is_read,
    created_at
  ) VALUES (
    v_recipient_id,
    v_requester_id,
    'friend_request',
    v_requester_name || ' sent you a friend request',
    'Accept or reject this request on the Friends page',
    '/friends',
    NEW.id,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$;
