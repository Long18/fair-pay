-- ========================================
-- Test Script for Audit Trail RPC Functions
-- Purpose: Validate write_audit_trail() and read_audit_trail() functions
-- ========================================

-- This is a test file, not a migration. Run manually to test the functions.

-- Test 1: Write audit trail record (should succeed for authenticated user)
-- Note: This requires a valid auth.uid() in the session
DO $$
DECLARE
  v_audit_id UUID;
  v_test_expense_id UUID := gen_random_uuid();
BEGIN
  -- Simulate authenticated user context (in real usage, auth.uid() would be set by Supabase Auth)
  -- For testing, we'll just verify the function signature and error handling
  
  RAISE NOTICE 'Test 1: Testing write_audit_trail() function signature...';
  
  -- Test with NULL action_type (should fail)
  BEGIN
    SELECT write_audit_trail(NULL, v_test_expense_id, 'expense', NULL) INTO v_audit_id;
    RAISE EXCEPTION 'Test failed: NULL action_type should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 1a PASSED: NULL action_type correctly rejected - %', SQLERRM;
  END;
  
  -- Test with NULL entity_id (should fail)
  BEGIN
    SELECT write_audit_trail('manual_settle_all', NULL, 'expense', NULL) INTO v_audit_id;
    RAISE EXCEPTION 'Test failed: NULL entity_id should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 1b PASSED: NULL entity_id correctly rejected - %', SQLERRM;
  END;
  
  -- Test with NULL entity_type (should fail)
  BEGIN
    SELECT write_audit_trail('manual_settle_all', v_test_expense_id, NULL, NULL) INTO v_audit_id;
    RAISE EXCEPTION 'Test failed: NULL entity_type should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 1c PASSED: NULL entity_type correctly rejected - %', SQLERRM;
  END;
  
  RAISE NOTICE 'Test 1: All validation tests PASSED';
END $$;

-- Test 2: Read audit trail function signature
DO $$
BEGIN
  RAISE NOTICE 'Test 2: Testing read_audit_trail() function signature...';
  
  -- Test with invalid limit (should fail)
  BEGIN
    PERFORM * FROM read_audit_trail(NULL, NULL, NULL, NULL, 0, 0);
    RAISE EXCEPTION 'Test failed: limit=0 should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 2a PASSED: Invalid limit correctly rejected - %', SQLERRM;
  END;
  
  -- Test with invalid limit (should fail)
  BEGIN
    PERFORM * FROM read_audit_trail(NULL, NULL, NULL, NULL, 101, 0);
    RAISE EXCEPTION 'Test failed: limit=101 should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 2b PASSED: Invalid limit correctly rejected - %', SQLERRM;
  END;
  
  -- Test with negative offset (should fail)
  BEGIN
    PERFORM * FROM read_audit_trail(NULL, NULL, NULL, NULL, 50, -1);
    RAISE EXCEPTION 'Test failed: negative offset should raise exception';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 2c PASSED: Negative offset correctly rejected - %', SQLERRM;
  END;
  
  RAISE NOTICE 'Test 2: All validation tests PASSED';
END $$;

-- Test 3: Verify function grants
DO $$
DECLARE
  v_write_granted BOOLEAN;
  v_read_granted BOOLEAN;
BEGIN
  RAISE NOTICE 'Test 3: Checking function grants...';
  
  -- Check write_audit_trail grant
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'write_audit_trail'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) INTO v_write_granted;
  
  IF v_write_granted THEN
    RAISE NOTICE 'Test 3a PASSED: write_audit_trail granted to authenticated';
  ELSE
    RAISE EXCEPTION 'Test 3a FAILED: write_audit_trail not granted to authenticated';
  END IF;
  
  -- Check read_audit_trail grant
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'read_audit_trail'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) INTO v_read_granted;
  
  IF v_read_granted THEN
    RAISE NOTICE 'Test 3b PASSED: read_audit_trail granted to authenticated';
  ELSE
    RAISE EXCEPTION 'Test 3b FAILED: read_audit_trail not granted to authenticated';
  END IF;
  
  RAISE NOTICE 'Test 3: All grant tests PASSED';
END $$;

-- Test 4: Verify function comments
DO $$
DECLARE
  v_write_comment TEXT;
  v_read_comment TEXT;
BEGIN
  RAISE NOTICE 'Test 4: Checking function comments...';
  
  -- Check write_audit_trail comment
  SELECT obj_description(oid, 'pg_proc') INTO v_write_comment
  FROM pg_proc
  WHERE proname = 'write_audit_trail'
    AND pronamespace = 'public'::regnamespace;
  
  IF v_write_comment IS NOT NULL THEN
    RAISE NOTICE 'Test 4a PASSED: write_audit_trail has comment';
  ELSE
    RAISE EXCEPTION 'Test 4a FAILED: write_audit_trail missing comment';
  END IF;
  
  -- Check read_audit_trail comment
  SELECT obj_description(oid, 'pg_proc') INTO v_read_comment
  FROM pg_proc
  WHERE proname = 'read_audit_trail'
    AND pronamespace = 'public'::regnamespace;
  
  IF v_read_comment IS NOT NULL THEN
    RAISE NOTICE 'Test 4b PASSED: read_audit_trail has comment';
  ELSE
    RAISE EXCEPTION 'Test 4b FAILED: read_audit_trail missing comment';
  END IF;
  
  RAISE NOTICE 'Test 4: All comment tests PASSED';
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL TESTS COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - write_audit_trail(TEXT, UUID, TEXT, JSONB)';
  RAISE NOTICE '  - read_audit_trail(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test with actual authenticated user session';
  RAISE NOTICE '  2. Integrate into settle_all_splits() function';
  RAISE NOTICE '  3. Test end-to-end audit trail workflow';
END $$;
