-- Test Cases for notify_expense_added() Fix
-- Run after applying migration 20260206000000_fix_notify_expense_added_function.sql
--
-- Prerequisites:
-- - Migration applied successfully
-- - Test users exist in profiles table
-- - Notification preferences allow 'expense_added' type

-- Cleanup from previous test runs
DELETE FROM notifications WHERE message LIKE '%Test%';
DELETE FROM expense_splits WHERE expense_id IN (
  SELECT id FROM expenses WHERE description LIKE '%Test Case%'
);
DELETE FROM expenses WHERE description LIKE '%Test Case%';

BEGIN;

-- ============================================================================
-- Test Case 1: Regular Split (All Registered Users)
-- Expected: Notification created for user-2 only (not creator)
-- ============================================================================

DO $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_user1_id UUID;
  v_user2_id UUID;
  v_notification_count INT;
BEGIN
  -- Get test users (assuming they exist)
  SELECT id INTO v_user1_id FROM profiles LIMIT 1;
  SELECT id INTO v_user2_id FROM profiles WHERE id != v_user1_id LIMIT 1;

  RAISE NOTICE 'Test Case 1: Regular Split';
  RAISE NOTICE '  Expense ID: %', v_expense_id;
  RAISE NOTICE '  Creator (User 1): %', v_user1_id;
  RAISE NOTICE '  Participant (User 2): %', v_user2_id;

  -- Create expense
  INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, expense_date)
  VALUES (
    v_expense_id,
    'Test Case 1: Regular Split',
    100.00,
    'VND',
    v_user1_id,
    v_user1_id,
    'group',
    CURRENT_DATE
  );

  -- Create splits (both users have user_id)
  INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method, is_settled, settled_amount)
  VALUES
    (v_expense_id, v_user1_id, 50.00, 'equal', TRUE, 50.00),  -- Creator
    (v_expense_id, v_user2_id, 50.00, 'equal', FALSE, 0);     -- Participant

  -- Wait for trigger to execute
  PERFORM pg_sleep(0.1);

  -- Verify notification created for user-2 only
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE user_id = v_user2_id
    AND type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 1, 'Expected 1 notification for user-2, got ' || v_notification_count;

  -- Verify no notification for creator
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE user_id = v_user1_id
    AND type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 0, 'Expected 0 notifications for creator, got ' || v_notification_count;

  RAISE NOTICE '  ✓ Test Case 1 PASSED';
END $$;

-- ============================================================================
-- Test Case 2: Pending Email Participant
-- Expected: No error, no notification for pending email (NULL user_id handled)
-- ============================================================================

DO $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_user1_id UUID;
  v_notification_count INT;
BEGIN
  SELECT id INTO v_user1_id FROM profiles LIMIT 1;

  RAISE NOTICE 'Test Case 2: Pending Email Participant';
  RAISE NOTICE '  Expense ID: %', v_expense_id;
  RAISE NOTICE '  Creator: %', v_user1_id;

  -- Create expense
  INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, expense_date)
  VALUES (
    v_expense_id,
    'Test Case 2: Pending Email',
    100.00,
    'VND',
    v_user1_id,
    v_user1_id,
    'group',
    CURRENT_DATE
  );

  -- Create splits (one with pending_email, NULL user_id)
  INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed, is_settled, settled_amount)
  VALUES
    (v_expense_id, v_user1_id, NULL, 50.00, 'equal', TRUE, TRUE, 50.00),              -- Creator
    (v_expense_id, NULL, 'newuser@example.com', 50.00, 'equal', FALSE, FALSE, 0);     -- Pending

  -- Wait for trigger
  PERFORM pg_sleep(0.1);

  -- Verify no notifications created (creator skipped, pending email skipped)
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 0, 'Expected 0 notifications (creator + pending), got ' || v_notification_count;

  RAISE NOTICE '  ✓ Test Case 2 PASSED (no error with NULL user_id)';
END $$;

-- ============================================================================
-- Test Case 3: Mixed Participants (Creator + Regular User + Pending Email)
-- Expected: Notification for regular user only
-- ============================================================================

DO $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_user1_id UUID;
  v_user2_id UUID;
  v_notification_count INT;
BEGIN
  SELECT id INTO v_user1_id FROM profiles LIMIT 1;
  SELECT id INTO v_user2_id FROM profiles WHERE id != v_user1_id LIMIT 1;

  RAISE NOTICE 'Test Case 3: Mixed Participants';
  RAISE NOTICE '  Expense ID: %', v_expense_id;

  -- Create expense
  INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, expense_date)
  VALUES (
    v_expense_id,
    'Test Case 3: Mixed',
    150.00,
    'VND',
    v_user1_id,
    v_user1_id,
    'group',
    CURRENT_DATE
  );

  -- Create splits (creator, regular user, pending email)
  INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed, is_settled, settled_amount)
  VALUES
    (v_expense_id, v_user1_id, NULL, 50.00, 'equal', TRUE, TRUE, 50.00),           -- Creator
    (v_expense_id, v_user2_id, NULL, 50.00, 'equal', TRUE, FALSE, 0),              -- Regular user
    (v_expense_id, NULL, 'pending@example.com', 50.00, 'equal', FALSE, FALSE, 0);  -- Pending

  -- Wait for trigger
  PERFORM pg_sleep(0.1);

  -- Verify notification created for user-2 only
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE user_id = v_user2_id
    AND type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 1, 'Expected 1 notification for user-2, got ' || v_notification_count;

  -- Verify total notifications = 1 (only user-2)
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 1, 'Expected 1 total notification, got ' || v_notification_count;

  RAISE NOTICE '  ✓ Test Case 3 PASSED';
END $$;

-- ============================================================================
-- Test Case 4: All Pending Emails (Edge Case)
-- Expected: No notifications, no errors
-- ============================================================================

DO $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_user1_id UUID;
  v_notification_count INT;
BEGIN
  SELECT id INTO v_user1_id FROM profiles LIMIT 1;

  RAISE NOTICE 'Test Case 4: All Pending Emails';
  RAISE NOTICE '  Expense ID: %', v_expense_id;

  -- Create expense
  INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, expense_date)
  VALUES (
    v_expense_id,
    'Test Case 4: All Pending',
    100.00,
    'VND',
    v_user1_id,
    v_user1_id,
    'group',
    CURRENT_DATE
  );

  -- All splits have pending_email (no registered users except creator who pays)
  -- Note: Creator must have user_id to be paid_by_user_id, but not in splits
  INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed, is_settled, settled_amount)
  VALUES
    (v_expense_id, NULL, 'email1@test.com', 50.00, 'equal', FALSE, FALSE, 0),
    (v_expense_id, NULL, 'email2@test.com', 50.00, 'equal', FALSE, FALSE, 0);

  -- Wait for trigger
  PERFORM pg_sleep(0.1);

  -- Verify no notifications created
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 0, 'Expected 0 notifications (all pending), got ' || v_notification_count;

  RAISE NOTICE '  ✓ Test Case 4 PASSED';
END $$;

-- ============================================================================
-- Test Case 5: Multiple Participants (Scalability Check)
-- Expected: Notifications for all non-creator registered users
-- ============================================================================

DO $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_user1_id UUID;
  v_user2_id UUID;
  v_user3_id UUID;
  v_notification_count INT;
BEGIN
  SELECT id INTO v_user1_id FROM profiles LIMIT 1;
  SELECT id INTO v_user2_id FROM profiles WHERE id != v_user1_id LIMIT 1;
  SELECT id INTO v_user3_id FROM profiles WHERE id NOT IN (v_user1_id, v_user2_id) LIMIT 1;

  RAISE NOTICE 'Test Case 5: Multiple Participants';
  RAISE NOTICE '  Expense ID: %', v_expense_id;

  -- Create expense
  INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, expense_date)
  VALUES (
    v_expense_id,
    'Test Case 5: Multiple Users',
    200.00,
    'VND',
    v_user1_id,
    v_user1_id,
    'group',
    CURRENT_DATE
  );

  -- Create splits for 3 users + 1 pending
  INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed, is_settled, settled_amount)
  VALUES
    (v_expense_id, v_user1_id, NULL, 50.00, 'equal', TRUE, TRUE, 50.00),           -- Creator
    (v_expense_id, v_user2_id, NULL, 50.00, 'equal', TRUE, FALSE, 0),              -- User 2
    (v_expense_id, v_user3_id, NULL, 50.00, 'equal', TRUE, FALSE, 0),              -- User 3
    (v_expense_id, NULL, 'pending@test.com', 50.00, 'equal', FALSE, FALSE, 0);     -- Pending

  -- Wait for trigger
  PERFORM pg_sleep(0.1);

  -- Verify notifications created for user-2 and user-3 (not creator, not pending)
  SELECT COUNT(*) INTO v_notification_count
  FROM notifications
  WHERE type = 'expense_added'
    AND link = '/expenses/show/' || v_expense_id::text;

  ASSERT v_notification_count = 2, 'Expected 2 notifications (user-2, user-3), got ' || v_notification_count;

  RAISE NOTICE '  ✓ Test Case 5 PASSED';
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '=== Verification Summary ===';

-- Check function exists
DO $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'notify_expense_added') INTO v_exists;
  ASSERT v_exists, 'Function notify_expense_added does not exist';
  RAISE NOTICE '✓ Function notify_expense_added exists';
END $$;

-- Check trigger exists
DO $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added') INTO v_exists;
  ASSERT v_exists, 'Trigger trigger_notify_expense_added does not exist';
  RAISE NOTICE '✓ Trigger trigger_notify_expense_added exists';
END $$;

-- Check trigger attached to expense_splits
DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  SELECT tgrelid::regclass::text INTO v_table_name
  FROM pg_trigger
  WHERE tgname = 'trigger_notify_expense_added';

  ASSERT v_table_name = 'expense_splits', 'Trigger not attached to expense_splits, attached to: ' || v_table_name;
  RAISE NOTICE '✓ Trigger attached to expense_splits table';
END $$;

-- Display created notifications from tests
SELECT
  'Test notifications created: ' || COUNT(*)::text AS summary
FROM notifications
WHERE message LIKE '%Test%';

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '=== All Tests Completed Successfully ===';
RAISE NOTICE 'Migration 20260206000000_fix_notify_expense_added_function.sql verified';
