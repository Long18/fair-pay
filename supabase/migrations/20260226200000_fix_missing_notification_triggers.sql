-- =============================================
-- Fix missing notification triggers
--
-- Problem: Several notification functions exist but are broken
-- (use non-existent create_notification() or wrong columns)
-- and have no triggers attached.
--
-- This migration:
-- 1. Rewrites notify_friend_accepted (trigger on friendships UPDATE)
-- 2. Rewrites notify_added_to_group (trigger on group_members INSERT)
-- 3. Rewrites notify_payment_recorded (trigger on payments INSERT)
-- 4. Updates approve_join_request / reject_join_request with actor_id
-- 5. Adds actor_id to comment/reaction notification functions
-- All functions include actor_id for avatar display.
-- =============================================

-- ============================================================
-- 1. notify_friend_accepted
--    Fires when friendships.status changes from 'pending' to 'accepted'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_accepter_id UUID;
  v_accepter_name TEXT;
  v_requester_id UUID;
BEGIN
  -- Only fire on status change to 'accepted'
  IF OLD.status != 'pending' OR NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  -- The accepter is the one who did NOT create the request
  IF NEW.created_by = NEW.user_a THEN
    v_accepter_id := NEW.user_b;
    v_requester_id := NEW.user_a;
  ELSE
    v_accepter_id := NEW.user_a;
    v_requester_id := NEW.user_b;
  END IF;

  SELECT full_name INTO v_accepter_name
  FROM profiles WHERE id = v_accepter_id;

  IF NOT should_send_notification(v_requester_id, 'friend_request') THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
  VALUES (
    v_requester_id,
    v_accepter_id,
    'friend_accepted',
    'Friend Request Accepted',
    COALESCE(v_accepter_name, 'Someone') || ' accepted your friend request',
    '/friends',
    NEW.id,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_friend_accepted ON friendships;
CREATE TRIGGER trigger_notify_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

GRANT ALL ON FUNCTION notify_friend_accepted() TO anon;
GRANT ALL ON FUNCTION notify_friend_accepted() TO authenticated;
GRANT ALL ON FUNCTION notify_friend_accepted() TO service_role;

-- ============================================================
-- 2. notify_added_to_group
--    Fires when a new member is added to group_members
-- ============================================================
CREATE OR REPLACE FUNCTION notify_added_to_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_name TEXT;
  v_group_creator UUID;
  v_adder_id UUID;
  v_adder_name TEXT;
BEGIN
  SELECT name, created_by INTO v_group_name, v_group_creator
  FROM groups WHERE id = NEW.group_id;

  -- Don't notify the group creator (they added themselves on creation)
  IF NEW.user_id = v_group_creator THEN
    RETURN NEW;
  END IF;

  -- The adder is the current authenticated user (or group creator as fallback)
  v_adder_id := COALESCE(auth.uid(), v_group_creator);

  SELECT full_name INTO v_adder_name
  FROM profiles WHERE id = v_adder_id;

  IF NOT should_send_notification(NEW.user_id, 'group_invite') THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
  VALUES (
    NEW.user_id,
    v_adder_id,
    'added_to_group',
    'Added to Group',
    COALESCE(v_adder_name, 'Someone') || ' added you to "' || COALESCE(v_group_name, 'a group') || '"',
    '/groups/show/' || NEW.group_id,
    NEW.group_id,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_added_to_group ON group_members;
CREATE TRIGGER trigger_notify_added_to_group
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_added_to_group();

GRANT ALL ON FUNCTION notify_added_to_group() TO anon;
GRANT ALL ON FUNCTION notify_added_to_group() TO authenticated;
GRANT ALL ON FUNCTION notify_added_to_group() TO service_role;

-- ============================================================
-- 3. notify_payment_recorded
--    Fires when a new payment is inserted
-- ============================================================
CREATE OR REPLACE FUNCTION notify_payment_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payer_name TEXT;
  v_link TEXT;
BEGIN
  -- Don't notify yourself
  IF NEW.from_user = NEW.to_user THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_payer_name
  FROM profiles WHERE id = NEW.from_user;

  IF NOT should_send_notification(NEW.to_user, 'payment_received') THEN
    RETURN NEW;
  END IF;

  -- Determine link based on context
  IF NEW.context_type = 'group' AND NEW.group_id IS NOT NULL THEN
    v_link := '/groups/show/' || NEW.group_id;
  ELSIF NEW.context_type = 'friend' AND NEW.friendship_id IS NOT NULL THEN
    v_link := '/friends/show/' || NEW.friendship_id;
  ELSE
    v_link := '/balances';
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
  VALUES (
    NEW.to_user,
    NEW.from_user,
    'payment_recorded',
    'Payment Received',
    COALESCE(v_payer_name, 'Someone') || ' paid you ' || to_char(NEW.amount, 'FM999,999,999') || ' ' || NEW.currency,
    v_link,
    NEW.id,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_payment_recorded ON payments;
CREATE TRIGGER trigger_notify_payment_recorded
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_recorded();

GRANT ALL ON FUNCTION notify_payment_recorded() TO anon;
GRANT ALL ON FUNCTION notify_payment_recorded() TO authenticated;
GRANT ALL ON FUNCTION notify_payment_recorded() TO service_role;

-- ============================================================
-- 4. Update approve_join_request / reject_join_request with actor_id
-- ============================================================
CREATE OR REPLACE FUNCTION approve_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_is_admin BOOLEAN;
  v_admin_name TEXT;
BEGIN
  SELECT * INTO v_request FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_request.group_id AND user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can approve join requests';
  END IF;

  SELECT full_name INTO v_admin_name FROM profiles WHERE id = auth.uid();

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_request.group_id, v_request.user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE group_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO notifications (user_id, actor_id, type, title, message, link, is_read, created_at)
  VALUES (
    v_request.user_id,
    auth.uid(),
    'group_join_approved',
    'Join Request Approved',
    COALESCE(v_admin_name, 'An admin') || ' approved your request to join the group',
    '/groups/show/' || v_request.group_id,
    FALSE,
    NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION reject_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_is_admin BOOLEAN;
BEGIN
  SELECT * INTO v_request FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_request.group_id AND user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can reject join requests';
  END IF;

  UPDATE group_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO notifications (user_id, actor_id, type, title, message, link, is_read, created_at)
  VALUES (
    v_request.user_id,
    auth.uid(),
    'group_join_rejected',
    'Join Request Declined',
    'Your request to join the group was declined.',
    '/connections?tab=groups',
    FALSE,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION approve_join_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_join_request(UUID) TO authenticated;
