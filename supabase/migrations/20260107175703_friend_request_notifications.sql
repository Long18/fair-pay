-- ========================================
-- FRIEND REQUEST NOTIFICATIONS
-- ========================================
-- Description: Add database trigger to automatically create notifications
--              when a user sends a friend request to another user
-- Date: 2026-01-07
--
-- This migration adds:
-- - Column related_id to notifications table for linking to related entities
-- - Function to create friend request notification for recipient
-- - Trigger to call the function when a pending friendship is created
-- ========================================

BEGIN;
-- Add related_id column to notifications table if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_id UUID;
-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friendships;
-- Function to create notification for friend request recipient
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
  -- Only create notification for pending friend requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the user who did NOT create the request)
  -- and requester (the user who created the request)
  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  -- Get requester's full name from profiles
  SELECT full_name INTO v_requester_name
  FROM profiles
  WHERE id = v_requester_id;

  -- Check if recipient has friend request notifications enabled
  SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
  FROM user_settings
  WHERE user_id = v_recipient_id;

  -- If notifications are disabled, skip
  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- Create notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    related_id,
    is_read,
    created_at
  ) VALUES (
    v_recipient_id,
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
-- Trigger to call notify_friend_request after friendship insert
CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();
COMMIT;
