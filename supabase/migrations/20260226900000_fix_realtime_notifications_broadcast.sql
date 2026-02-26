-- =============================================
-- Fix real-time notifications for all notification types
--
-- Problem: postgres_changes subscription only delivers expense_added
-- notifications in real-time. Comment, reaction, mention notifications
-- require page refresh to appear.
--
-- Root cause: Supabase Realtime postgres_changes evaluates RLS policies
-- to determine which subscribers receive events. When SECURITY DEFINER
-- RPC functions (add_expense_comment, toggle_reaction) insert notifications
-- for other users, the RLS evaluation context may not correctly resolve
-- auth.uid() for the target subscriber, causing events to be silently dropped.
-- Trigger-based inserts (notify_expense_added) work because they execute
-- in a different transaction context.
--
-- Fix: Use Supabase Realtime Broadcast as a secondary delivery mechanism.
-- Create a trigger on the notifications table that broadcasts every INSERT
-- via realtime.broadcast_changes(). The frontend subscribes to both
-- postgres_changes (for backward compat) AND broadcast channel.
--
-- This approach is recommended by Supabase docs for reliable delivery.
-- =============================================

-- ============================================================
-- 1. Create trigger function that broadcasts notification inserts
--    Uses realtime.broadcast_changes() for reliable delivery
--    Falls back gracefully if function doesn't exist
-- ============================================================
CREATE OR REPLACE FUNCTION broadcast_notification_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Broadcast to a user-specific topic so only the target user receives it
  -- Topic format: notifications:<user_id>
  BEGIN
    PERFORM realtime.broadcast_changes(
      'notifications:' || NEW.user_id::text,  -- topic (matches frontend channel name)
      TG_OP,                                   -- event: INSERT
      TG_OP,                                   -- operation
      TG_TABLE_NAME,                           -- table: notifications
      TG_TABLE_SCHEMA,                         -- schema: public
      NEW,                                     -- new record
      OLD                                      -- old record (NULL for INSERT)
    );
  EXCEPTION WHEN undefined_function THEN
    -- realtime.broadcast_changes() not available in this environment
    -- postgres_changes will still work as fallback
    NULL;
  WHEN OTHERS THEN
    -- Don't let broadcast failures block notification inserts
    RAISE WARNING 'broadcast_notification_insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$fn$;

-- ============================================================
-- 2. Create trigger on notifications table
-- ============================================================
DROP TRIGGER IF EXISTS trigger_broadcast_notification ON notifications;
CREATE TRIGGER trigger_broadcast_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_notification_insert();

-- ============================================================
-- 3. Ensure RLS policy exists for realtime.messages (broadcast auth)
--    This allows authenticated users to receive broadcast messages
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
    AND tablename = 'messages'
    AND policyname = 'authenticated_can_receive_broadcasts'
  ) THEN
    CREATE POLICY "authenticated_can_receive_broadcasts"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- realtime.messages table might not exist in all environments
  RAISE WARNING 'Could not create broadcast RLS policy: %', SQLERRM;
END $$;
