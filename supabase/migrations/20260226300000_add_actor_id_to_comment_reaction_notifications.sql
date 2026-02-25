-- =============================================
-- Add actor_id to comment and reaction notification INSERTs
--
-- The add_expense_comment and toggle_reaction functions already
-- create notifications but don't include actor_id.
-- This migration updates them to include the commenter/reactor
-- as the actor for avatar display.
-- =============================================

-- We need to update the INSERT INTO notifications statements
-- inside add_expense_comment and toggle_reaction.
-- Since these are large functions, we use a targeted approach:
-- recreate only the notification-related parts.

-- For add_expense_comment: v_user_id is the commenter (actor)
-- For toggle_reaction: v_user_id is the reactor (actor)

-- NOTE: The full functions are defined in migration 20260225100000.
-- We recreate them here with actor_id added to all notification INSERTs.

-- Due to the complexity and size of these functions, we'll update them
-- via a simpler approach: add a trigger that auto-fills actor_id
-- on notification INSERT if it's NULL, using the current auth user.

CREATE OR REPLACE FUNCTION auto_fill_notification_actor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If actor_id is not provided, use the current authenticated user
  IF NEW.actor_id IS NULL THEN
    NEW.actor_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_fill_notification_actor_id ON notifications;
CREATE TRIGGER trigger_auto_fill_notification_actor_id
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_notification_actor_id();

GRANT ALL ON FUNCTION auto_fill_notification_actor_id() TO anon;
GRANT ALL ON FUNCTION auto_fill_notification_actor_id() TO authenticated;
GRANT ALL ON FUNCTION auto_fill_notification_actor_id() TO service_role;
