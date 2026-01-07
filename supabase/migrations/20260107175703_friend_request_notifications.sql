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

-- Create notifications table if it doesn't exist (for fresh migrations)
-- Note: FK constraint will be added later when profiles table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add related_id column to notifications table if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

-- Add foreign key constraint if profiles table exists and constraint doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name = 'notifications'
      AND constraint_name = 'notifications_user_id_fkey'
    ) THEN
      ALTER TABLE notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Users can view their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND policyname = 'notifications_read_own'
  ) THEN
    CREATE POLICY "notifications_read_own" ON notifications
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Users can update their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND policyname = 'notifications_update_own'
  ) THEN
    CREATE POLICY "notifications_update_own" ON notifications
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Users can insert their own notifications (for triggers)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND policyname = 'notifications_insert_own'
  ) THEN
    CREATE POLICY "notifications_insert_own" ON notifications
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC);

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

  -- Get requester's full name from profiles (if exists)
  BEGIN
    SELECT full_name INTO v_requester_name
    FROM profiles
    WHERE id = v_requester_id;
  EXCEPTION WHEN OTHERS THEN
    v_requester_name := 'Someone';
  END;

  -- Check if recipient has friend request notifications enabled (if user_settings exists)
  BEGIN
    SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
    FROM user_settings
    WHERE user_id = v_recipient_id;
  EXCEPTION WHEN OTHERS THEN
    v_notify_enabled := TRUE;
  END;

  -- If notifications are disabled, skip
  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- Create notification for recipient (if notifications table exists)
  BEGIN
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
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/friends',
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail if notifications table doesn't exist yet
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Only create trigger if friendships table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') THEN
    -- Drop trigger if it exists (for idempotency)
    DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friendships;

    -- Create trigger
    CREATE TRIGGER trigger_notify_friend_request
      AFTER INSERT ON friendships
      FOR EACH ROW
      EXECUTE FUNCTION notify_friend_request();
  END IF;
END $$;

COMMIT;
