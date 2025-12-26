-- Test Script: Expense Categories Database Constraint
-- Purpose: Verify category enum validation and helper functions
-- Date: 2025-12-27
-- Run this after applying migration 007_expense_categories_constraint.sql

-- ========================================
-- Test 1: Verify Enum Type Created
-- ========================================

DO $$
BEGIN
  -- Check if enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    RAISE NOTICE '✓ Test 1 PASSED: expense_category enum type exists';
  ELSE
    RAISE NOTICE '✗ Test 1 FAILED: expense_category enum type not found';
  END IF;
END $$;

-- ========================================
-- Test 2: Verify All Categories
-- ========================================

DO $$
DECLARE
  v_category_count INTEGER;
  v_expected_categories TEXT[] := ARRAY[
    'Food & Drink',
    'Transportation',
    'Accommodation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Education',
    'Other'
  ];
BEGIN
  -- Count categories from helper function
  SELECT COUNT(*) INTO v_category_count
  FROM get_expense_categories();

  IF v_category_count = 9 THEN
    RAISE NOTICE '✓ Test 2 PASSED: All 9 categories available';
  ELSE
    RAISE NOTICE '✗ Test 2 FAILED: Expected 9 categories, found %', v_category_count;
  END IF;
END $$;

-- ========================================
-- Test 3: Insert Valid Categories
-- ========================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_test_group_id UUID;
  v_expense_id UUID;
BEGIN
  -- Get a test user and group
  SELECT id INTO v_test_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_test_group_id FROM groups LIMIT 1;

  IF v_test_user_id IS NULL OR v_test_group_id IS NULL THEN
    RAISE NOTICE 'Skipping Test 3: No test data available';
    RETURN;
  END IF;

  -- Try inserting expense with valid category
  BEGIN
    INSERT INTO expenses (
      context_type, group_id, description, amount, currency,
      category, paid_by_user_id, created_by
    ) VALUES (
      'group', v_test_group_id, 'Test Expense', 100000, 'VND',
      'Food & Drink', v_test_user_id, v_test_user_id
    ) RETURNING id INTO v_expense_id;

    RAISE NOTICE '✓ Test 3 PASSED: Valid category inserted successfully';

    -- Cleanup
    DELETE FROM expenses WHERE id = v_expense_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 3 FAILED: Could not insert valid category - %', SQLERRM;
  END;
END $$;

-- ========================================
-- Test 4: Reject Invalid Categories
-- ========================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_test_group_id UUID;
BEGIN
  -- Get a test user and group
  SELECT id INTO v_test_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_test_group_id FROM groups LIMIT 1;

  IF v_test_user_id IS NULL OR v_test_group_id IS NULL THEN
    RAISE NOTICE 'Skipping Test 4: No test data available';
    RETURN;
  END IF;

  -- Try inserting expense with invalid category (should fail)
  BEGIN
    INSERT INTO expenses (
      context_type, group_id, description, amount, currency,
      category, paid_by_user_id, created_by
    ) VALUES (
      'group', v_test_group_id, 'Test Expense', 100000, 'VND',
      'Invalid Category', v_test_user_id, v_test_user_id
    );

    RAISE NOTICE '✗ Test 4 FAILED: Invalid category was accepted';

  EXCEPTION WHEN invalid_text_representation THEN
    RAISE NOTICE '✓ Test 4 PASSED: Invalid category rejected as expected';
  WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 4 FAILED: Unexpected error - %', SQLERRM;
  END;
END $$;

-- ========================================
-- Test 5: Verify Indexes Created
-- ========================================

DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'expenses'
    AND indexname IN ('idx_expenses_category', 'idx_expenses_category_date');

  IF v_index_count = 2 THEN
    RAISE NOTICE '✓ Test 5 PASSED: Both category indexes created';
  ELSE
    RAISE NOTICE '✗ Test 5 FAILED: Expected 2 indexes, found %', v_index_count;
  END IF;
END $$;

-- ========================================
-- Test 6: Verify Statistics View
-- ========================================

DO $$
BEGIN
  -- Check if view exists and is queryable
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'expense_category_stats'
  ) THEN
    PERFORM * FROM expense_category_stats LIMIT 1;
    RAISE NOTICE '✓ Test 6 PASSED: expense_category_stats view exists and queryable';
  ELSE
    RAISE NOTICE '✗ Test 6 FAILED: expense_category_stats view not found';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✗ Test 6 FAILED: Error querying view - %', SQLERRM;
END $$;

-- ========================================
-- Test 7: NULL Categories Still Allowed
-- ========================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_test_group_id UUID;
  v_expense_id UUID;
BEGIN
  -- Get a test user and group
  SELECT id INTO v_test_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_test_group_id FROM groups LIMIT 1;

  IF v_test_user_id IS NULL OR v_test_group_id IS NULL THEN
    RAISE NOTICE 'Skipping Test 7: No test data available';
    RETURN;
  END IF;

  -- Try inserting expense with NULL category
  BEGIN
    INSERT INTO expenses (
      context_type, group_id, description, amount, currency,
      category, paid_by_user_id, created_by
    ) VALUES (
      'group', v_test_group_id, 'Uncategorized Expense', 100000, 'VND',
      NULL, v_test_user_id, v_test_user_id
    ) RETURNING id INTO v_expense_id;

    RAISE NOTICE '✓ Test 7 PASSED: NULL category allowed';

    -- Cleanup
    DELETE FROM expenses WHERE id = v_expense_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 7 FAILED: NULL category rejected - %', SQLERRM;
  END;
END $$;

-- ========================================
-- Manual Verification Queries
-- ========================================

-- List all valid categories
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Valid Categories ===';
END $$;

SELECT * FROM get_expense_categories();

-- Show category statistics (if data exists)
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Category Statistics ===';
END $$;

SELECT
  category,
  expense_count,
  total_amount,
  ROUND(avg_amount, 0) as avg_amount
FROM expense_category_stats
ORDER BY total_amount DESC;

-- Check for uncategorized expenses
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Uncategorized Expenses ===';
END $$;

SELECT COUNT(*) as uncategorized_count
FROM expenses
WHERE category IS NULL;

-- Verify enum type definition
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Enum Type Definition ===';
END $$;

SELECT
  enumlabel as category_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'expense_category'::regtype
ORDER BY enumsortorder;
