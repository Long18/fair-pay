-- =============================================
-- Ensure ALL notification triggers exist on production
--
-- Problem: Only expense_added notifications work for normal users.
-- Other notification types (friend_request, friend_accepted,
-- added_to_group, payment_recorded) don't fire.
--
-- Root cause: Triggers may be missing on production if earlier
-- migrations used IF NOT EXISTS checks that silently skipped
-- trigger creation when stale triggers existed.
--
-- Fix: Forcefully DROP + CREATE all notification triggers.
-- =============================================

-- ============================================================
-- 1. notify_expense_added → fires on expense_splits INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_expense_added ON expense_splits;
CREATE TRIGGER trigger_notify_expense_added
  AFTER INSERT ON expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION notify_expense_added();

-- ============================================================
-- 2. notify_friend_request → fires on friendships INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friendships;
CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- ============================================================
-- 3. notify_friend_accepted → fires on friendships UPDATE
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_friend_accepted ON friendships;
CREATE TRIGGER trigger_notify_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

-- ============================================================
-- 4. notify_added_to_group → fires on group_members INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_added_to_group ON group_members;
CREATE TRIGGER trigger_notify_added_to_group
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_added_to_group();

-- ============================================================
-- 5. notify_payment_recorded → fires on payments INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_payment_recorded ON payments;
CREATE TRIGGER trigger_notify_payment_recorded
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_recorded();

-- ============================================================
-- 6. notify_admins_on_join_request → fires on group_join_requests INSERT
-- ============================================================
DROP TRIGGER IF EXISTS trigger_notify_admins_on_join_request ON group_join_requests;
CREATE TRIGGER trigger_notify_admins_on_join_request
  AFTER INSERT ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_join_request();

-- ============================================================
-- 7. Verify: list all notification triggers (for debugging)
-- ============================================================
DO $fn$
DECLARE
  v_trigger RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_trigger IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgname LIKE 'trigger_notify_%'
    ORDER BY tgname
  LOOP
    RAISE NOTICE 'Trigger: % on table: %', v_trigger.tgname, v_trigger.table_name;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Total notification triggers: %', v_count;
END;
$fn$;
