-- =============================================
-- Fix notification triggers for robustness
--
-- Issues addressed:
-- 1. Remove auto_fill_notification_actor_id BEFORE INSERT trigger
--    (unnecessary complexity, all functions now set actor_id explicitly)
-- 2. Wrap all notification trigger functions in exception handlers
--    so a notification failure never breaks the parent transaction
-- 3. Ensure notify_added_to_group handles missing group gracefully
-- 4. Use proper $$ dollar-quoting for all functions
-- =============================================

-- ============================================================
-- 1. Drop the auto_fill trigger (all functions set actor_id explicitly now)
-- ============================================================
DROP TRIGGER IF EXISTS trigger_auto_fill_notification_actor_id ON notifications;
DROP FUNCTION IF EXISTS auto_fill_notification_actor_id();

-- ============================================================
-- 2. Recreate notify_expense_added with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_expense RECORD;
  v_creator_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id, e.description, e.amount, e.currency, e.created_by, e.is_payment
  INTO v_expense
  FROM expenses e
  WHERE e.id = NEW.expense_id;

  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_expense.is_payment THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  IF NOT should_send_notification(NEW.user_id, 'expense_added') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = v_expense.created_by;

  BEGIN
    INSERT INTO notifications (
      user_id, actor_id, type, title, message, link, is_read, created_at
    ) VALUES (
      NEW.user_id,
      v_expense.created_by,
      'expense_added',
      'New Expense Added',
      COALESCE(v_creator_name, 'Someone') || ' added "' || COALESCE(v_expense.description, 'an expense') || '" - ' ||
        to_char(v_expense.amount, 'FM999,999,999') || ' ' || v_expense.currency ||
        '. You owe ' || to_char(COALESCE(NEW.computed_amount, 0), 'FM999,999,999') || ' ' || v_expense.currency,
      '/expenses/show/' || v_expense.id::text,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_expense_added failed for user %: %', NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";


-- ============================================================
-- 3. Recreate notify_friend_request with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
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
  FROM profiles WHERE id = v_requester_id;

  SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
  FROM user_settings WHERE user_id = v_recipient_id;

  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO notifications (
      user_id, actor_id, type, title, message, link, related_id, is_read, created_at
    ) VALUES (
      v_recipient_id,
      v_requester_id,
      'friend_request',
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/friends',
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_friend_request failed for user %: %', v_recipient_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

GRANT ALL ON FUNCTION notify_friend_request() TO anon;
GRANT ALL ON FUNCTION notify_friend_request() TO authenticated;
GRANT ALL ON FUNCTION notify_friend_request() TO service_role;

-- ============================================================
-- 4. Recreate notify_friend_accepted with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_accepter_id UUID;
  v_accepter_name TEXT;
  v_requester_id UUID;
BEGIN
  IF OLD.status != 'pending' OR NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_friend_accepted failed for user %: %', v_requester_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trigger_notify_friend_accepted ON friendships;
CREATE TRIGGER trigger_notify_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

GRANT ALL ON FUNCTION notify_friend_accepted() TO anon;
GRANT ALL ON FUNCTION notify_friend_accepted() TO authenticated;
GRANT ALL ON FUNCTION notify_friend_accepted() TO service_role;


-- ============================================================
-- 5. Recreate notify_added_to_group with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION notify_added_to_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_group_name TEXT;
  v_group_creator UUID;
  v_adder_id UUID;
  v_adder_name TEXT;
BEGIN
  SELECT name, created_by INTO v_group_name, v_group_creator
  FROM groups WHERE id = NEW.group_id;

  IF v_group_creator IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_group_creator THEN
    RETURN NEW;
  END IF;

  v_adder_id := COALESCE(auth.uid(), v_group_creator);

  SELECT full_name INTO v_adder_name
  FROM profiles WHERE id = v_adder_id;

  IF NOT should_send_notification(NEW.user_id, 'group_invite') THEN
    RETURN NEW;
  END IF;

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_added_to_group failed for user %: %', NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trigger_notify_added_to_group ON group_members;
CREATE TRIGGER trigger_notify_added_to_group
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_added_to_group();

GRANT ALL ON FUNCTION notify_added_to_group() TO anon;
GRANT ALL ON FUNCTION notify_added_to_group() TO authenticated;
GRANT ALL ON FUNCTION notify_added_to_group() TO service_role;

-- ============================================================
-- 6. Recreate notify_payment_recorded with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION notify_payment_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_payer_name TEXT;
  v_link TEXT;
BEGIN
  IF NEW.from_user = NEW.to_user THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_payer_name
  FROM profiles WHERE id = NEW.from_user;

  IF NOT should_send_notification(NEW.to_user, 'payment_received') THEN
    RETURN NEW;
  END IF;

  IF NEW.context_type = 'group' AND NEW.group_id IS NOT NULL THEN
    v_link := '/groups/show/' || NEW.group_id;
  ELSIF NEW.context_type = 'friend' AND NEW.friendship_id IS NOT NULL THEN
    v_link := '/friends/show/' || NEW.friendship_id;
  ELSE
    v_link := '/balances';
  END IF;

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_payment_recorded failed for user %: %', NEW.to_user, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trigger_notify_payment_recorded ON payments;
CREATE TRIGGER trigger_notify_payment_recorded
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_recorded();

GRANT ALL ON FUNCTION notify_payment_recorded() TO anon;
GRANT ALL ON FUNCTION notify_payment_recorded() TO authenticated;
GRANT ALL ON FUNCTION notify_payment_recorded() TO service_role;


-- ============================================================
-- 7. Recreate approve_join_request with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION approve_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'approve_join_request notification failed: %', SQLERRM;
  END;
END;
$fn$;

-- ============================================================
-- 8. Recreate reject_join_request with exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION reject_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reject_join_request notification failed: %', SQLERRM;
  END;
END;
$fn$;

GRANT EXECUTE ON FUNCTION approve_join_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_join_request(UUID) TO authenticated;

-- ============================================================
-- 9. Verify all triggers exist
-- ============================================================
DO $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added'
  ) THEN
    CREATE TRIGGER trigger_notify_expense_added
      AFTER INSERT ON expense_splits
      FOR EACH ROW
      EXECUTE FUNCTION notify_expense_added();
  END IF;
END;
$fn$;

DO $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_friend_request'
  ) THEN
    CREATE TRIGGER trigger_notify_friend_request
      AFTER INSERT ON friendships
      FOR EACH ROW
      EXECUTE FUNCTION notify_friend_request();
  END IF;
END;
$fn$;
