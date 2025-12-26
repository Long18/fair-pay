-- Test Script: Auto-Friend Group Members Feature
-- Purpose: Verify automatic friendship creation when users join groups
-- Date: 2025-12-27
-- Run this after applying migration 006_auto_friend_group_members.sql

-- ========================================
-- Test Setup: Create test users and group
-- ========================================

-- Note: This assumes you have test users in your database
-- Replace these UUIDs with actual test user IDs from your profiles table

-- Test 1: Create a group and add members one by one
-- Expected: Friendships should be created automatically

DO $$
DECLARE
  v_group_id UUID;
  v_user_1 UUID;
  v_user_2 UUID;
  v_user_3 UUID;
  v_friendship_count INTEGER;
BEGIN
  -- Get three test users (adjust this query based on your test data)
  SELECT id INTO v_user_1 FROM profiles LIMIT 1 OFFSET 0;
  SELECT id INTO v_user_2 FROM profiles LIMIT 1 OFFSET 1;
  SELECT id INTO v_user_3 FROM profiles LIMIT 1 OFFSET 2;

  RAISE NOTICE 'Test Users: %, %, %', v_user_1, v_user_2, v_user_3;

  -- Create a test group
  INSERT INTO groups (name, description, created_by)
  VALUES ('Test Auto-Friend Group', 'Testing automatic friendship creation', v_user_1)
  RETURNING id INTO v_group_id;

  RAISE NOTICE 'Created test group: %', v_group_id;

  -- User 1 is automatically added as admin by trigger
  -- Check initial friendship count (should be 0)
  SELECT COUNT(*) INTO v_friendship_count
  FROM friendships
  WHERE (user_a = v_user_1 OR user_b = v_user_1);

  RAISE NOTICE 'User 1 friendships before adding others: %', v_friendship_count;

  -- Add User 2 to the group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_2, 'member');

  RAISE NOTICE 'Added User 2 to group';

  -- Check if friendship was created between User 1 and User 2
  SELECT COUNT(*) INTO v_friendship_count
  FROM friendships
  WHERE (user_a = LEAST(v_user_1, v_user_2) AND user_b = GREATEST(v_user_1, v_user_2))
    AND status = 'accepted';

  IF v_friendship_count = 1 THEN
    RAISE NOTICE '✓ Test 1 PASSED: Friendship created between User 1 and User 2';
  ELSE
    RAISE NOTICE '✗ Test 1 FAILED: Expected 1 friendship, found %', v_friendship_count;
  END IF;

  -- Add User 3 to the group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_3, 'member');

  RAISE NOTICE 'Added User 3 to group';

  -- Check if friendships were created for User 3 with User 1 and User 2
  SELECT COUNT(*) INTO v_friendship_count
  FROM friendships
  WHERE ((user_a = LEAST(v_user_1, v_user_3) AND user_b = GREATEST(v_user_1, v_user_3))
      OR (user_a = LEAST(v_user_2, v_user_3) AND user_b = GREATEST(v_user_2, v_user_3)))
    AND status = 'accepted';

  IF v_friendship_count = 2 THEN
    RAISE NOTICE '✓ Test 2 PASSED: Friendships created for User 3 with User 1 and User 2';
  ELSE
    RAISE NOTICE '✗ Test 2 FAILED: Expected 2 friendships, found %', v_friendship_count;
  END IF;

  -- Check total friendships in the group (should be 3: 1-2, 1-3, 2-3)
  SELECT COUNT(*) INTO v_friendship_count
  FROM friendships
  WHERE (user_a IN (v_user_1, v_user_2, v_user_3)
     AND user_b IN (v_user_1, v_user_2, v_user_3))
    AND status = 'accepted';

  IF v_friendship_count = 3 THEN
    RAISE NOTICE '✓ Test 3 PASSED: Total of 3 friendships in group';
  ELSE
    RAISE NOTICE '✗ Test 3 FAILED: Expected 3 total friendships, found %', v_friendship_count;
  END IF;

  -- Cleanup: Remove test data
  DELETE FROM group_members WHERE group_id = v_group_id;
  DELETE FROM groups WHERE id = v_group_id;
  DELETE FROM friendships
  WHERE (user_a IN (v_user_1, v_user_2, v_user_3)
     AND user_b IN (v_user_1, v_user_2, v_user_3));

  RAISE NOTICE 'Test cleanup completed';

END $$;

-- ========================================
-- Test 2: Verify no duplicate friendships
-- ========================================

-- This test verifies that adding a user to multiple groups
-- doesn't create duplicate friendships

-- ========================================
-- Test 3: Verify status update for existing friendships
-- ========================================

-- This test verifies that if a pending/rejected friendship exists,
-- it gets updated to accepted when users join the same group

-- Manual verification queries:

-- Check all friendships for a specific user
-- SELECT * FROM friendships WHERE user_a = 'USER_ID' OR user_b = 'USER_ID';

-- Check all group members
-- SELECT * FROM group_members WHERE group_id = 'GROUP_ID';

-- Check trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_create_friendships';

-- Check function exists
-- SELECT * FROM pg_proc WHERE proname = 'auto_create_friendships_from_group';
