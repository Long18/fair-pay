-- Test Case: iCloud Subscription Per-Member Prepaid
-- Description: End-to-end test of the per-member prepaid system
-- Scenario: 200,000 VND/month, 4 members, Member A prepays 5 months

-- ========================================
-- SETUP: Create Test Data
-- ========================================

DO $$
DECLARE
  v_user_a UUID;
  v_user_b UUID;
  v_user_c UUID;
  v_user_d UUID;
  v_group_id UUID;
  v_template_id UUID;
  v_recurring_id UUID;
  v_instance_1_id UUID;
  v_instance_2_id UUID;
  v_prepaid_result JSONB;
  v_consume_result JSONB;
  v_balance RECORD;
  v_split RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST: iCloud Subscription Per-Member Prepaid';
  RAISE NOTICE '========================================';

  -- Create test users (assuming they don't exist)
  -- In real test, these would be actual user IDs
  v_user_a := gen_random_uuid();
  v_user_b := gen_random_uuid();
  v_user_c := gen_random_uuid();
  v_user_d := gen_random_uuid();

  RAISE NOTICE 'Created test users:';
  RAISE NOTICE '  Member A: %', v_user_a;
  RAISE NOTICE '  Member B: %', v_user_b;
  RAISE NOTICE '  Member C: %', v_user_c;
  RAISE NOTICE '  Member D: %', v_user_d;

  -- Create group (placeholder)
  v_group_id := gen_random_uuid();
  RAISE NOTICE 'Created test group: %', v_group_id;

  -- Create template expense: 200,000 VND/month
  INSERT INTO expenses (
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    is_payment,
    context_type,
    group_id,
    created_by
  ) VALUES (
    'iCloud Subscription',
    200000,
    'VND',
    'subscriptions',
    CURRENT_DATE,
    v_user_a,
    false,
    'group',
    v_group_id,
    v_user_a
  ) RETURNING id INTO v_template_id;

  RAISE NOTICE 'Created template expense: %', v_template_id;

  -- Create splits: Each member = 50,000 VND
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
    (v_template_id, v_user_a, 'equal', 50000),
    (v_template_id, v_user_b, 'equal', 50000),
    (v_template_id, v_user_c, 'equal', 50000),
    (v_template_id, v_user_d, 'equal', 50000);

  RAISE NOTICE 'Created expense splits: 4 members × 50,000 VND';

  -- Create recurring expense
  INSERT INTO recurring_expenses (
    template_expense_id,
    frequency,
    interval,
    next_occurrence,
    context_type,
    group_id,
    created_by,
    is_active
  ) VALUES (
    v_template_id,
    'monthly',
    1,
    CURRENT_DATE,
    'group',
    v_group_id,
    v_user_a,
    true
  ) RETURNING id INTO v_recurring_id;

  RAISE NOTICE 'Created recurring expense: %', v_recurring_id;

  -- ========================================
  -- TEST 1: Record Prepaid for Member A (5 months)
  -- ========================================

  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Record prepaid for Member A (5 months)';
  RAISE NOTICE '----------------------------------------';

  v_prepaid_result := record_member_prepaid(
    p_recurring_expense_id := v_recurring_id,
    p_user_id := v_user_a,
    p_months := 5,
    p_paid_by_user_id := v_user_a
  );

  RAISE NOTICE 'Prepaid Result: %', v_prepaid_result;

  -- Verify prepaid amount
  IF (v_prepaid_result->>'amount')::DECIMAL != 250000 THEN
    RAISE EXCEPTION 'FAILED: Expected amount 250000, got %', v_prepaid_result->>'amount';
  END IF;

  RAISE NOTICE '✓ Prepaid amount correct: 250,000 VND';

  -- Verify balance created
  SELECT * INTO v_balance
  FROM member_prepaid_balances
  WHERE recurring_expense_id = v_recurring_id
    AND user_id = v_user_a;

  IF v_balance.balance_amount != 250000 THEN
    RAISE EXCEPTION 'FAILED: Expected balance 250000, got %', v_balance.balance_amount;
  END IF;

  IF v_balance.months_remaining != 5 THEN
    RAISE EXCEPTION 'FAILED: Expected 5 months, got %', v_balance.months_remaining;
  END IF;

  RAISE NOTICE '✓ Balance created: 250,000 VND (5 months)';

  -- ========================================
  -- TEST 2: Generate Instance 1 and Consume Prepaid
  -- ========================================

  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Generate Instance 1 and consume prepaid';
  RAISE NOTICE '----------------------------------------';

  -- Create instance 1 manually
  INSERT INTO expenses (
    description,
    amount,
    currency,
    expense_date,
    paid_by_user_id,
    context_type,
    group_id,
    recurring_expense_id,
    created_by
  ) SELECT
    description,
    amount,
    currency,
    CURRENT_DATE,
    paid_by_user_id,
    context_type,
    group_id,
    v_recurring_id,
    created_by
  FROM expenses WHERE id = v_template_id
  RETURNING id INTO v_instance_1_id;

  -- Copy splits
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, is_settled, settled_amount)
  SELECT v_instance_1_id, user_id, split_method, computed_amount, false, 0
  FROM expense_splits WHERE expense_id = v_template_id;

  RAISE NOTICE 'Created instance 1: %', v_instance_1_id;

  -- Consume prepaid
  v_consume_result := consume_prepaid_for_instance(v_instance_1_id);

  RAISE NOTICE 'Consume Result: %', v_consume_result;

  -- Verify Member A's split settled
  SELECT * INTO v_split
  FROM expense_splits
  WHERE expense_id = v_instance_1_id AND user_id = v_user_a;

  IF NOT v_split.is_settled THEN
    RAISE EXCEPTION 'FAILED: Member A split should be settled';
  END IF;

  IF v_split.settled_amount != 50000 THEN
    RAISE EXCEPTION 'FAILED: Expected settled_amount 50000, got %', v_split.settled_amount;
  END IF;

  RAISE NOTICE '✓ Member A split settled: 50,000 VND';

  -- Verify balance reduced
  SELECT * INTO v_balance
  FROM member_prepaid_balances
  WHERE recurring_expense_id = v_recurring_id AND user_id = v_user_a;

  IF v_balance.balance_amount != 200000 THEN
    RAISE EXCEPTION 'FAILED: Expected balance 200000, got %', v_balance.balance_amount;
  END IF;

  IF v_balance.months_remaining != 4 THEN
    RAISE EXCEPTION 'FAILED: Expected 4 months remaining, got %', v_balance.months_remaining;
  END IF;

  RAISE NOTICE '✓ Balance reduced: 200,000 VND (4 months)';

  -- Verify consumption logged
  IF NOT EXISTS (
    SELECT 1 FROM prepaid_consumption_log
    WHERE expense_instance_id = v_instance_1_id
      AND user_id = v_user_a
      AND amount_consumed = 50000
  ) THEN
    RAISE EXCEPTION 'FAILED: Consumption not logged';
  END IF;

  RAISE NOTICE '✓ Consumption logged';

  -- ========================================
  -- TEST 3: Generate Instance 2 (Verify consumption continues)
  -- ========================================

  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Generate Instance 2 (verify continued consumption)';
  RAISE NOTICE '----------------------------------------';

  -- Create instance 2
  INSERT INTO expenses (
    description,
    amount,
    currency,
    expense_date,
    paid_by_user_id,
    context_type,
    group_id,
    recurring_expense_id,
    created_by
  ) SELECT
    description,
    amount,
    currency,
    CURRENT_DATE + INTERVAL '1 month',
    paid_by_user_id,
    context_type,
    group_id,
    v_recurring_id,
    created_by
  FROM expenses WHERE id = v_template_id
  RETURNING id INTO v_instance_2_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, is_settled, settled_amount)
  SELECT v_instance_2_id, user_id, split_method, computed_amount, false, 0
  FROM expense_splits WHERE expense_id = v_template_id;

  RAISE NOTICE 'Created instance 2: %', v_instance_2_id;

  -- Consume prepaid
  v_consume_result := consume_prepaid_for_instance(v_instance_2_id);

  -- Verify balance reduced again
  SELECT * INTO v_balance
  FROM member_prepaid_balances
  WHERE recurring_expense_id = v_recurring_id AND user_id = v_user_a;

  IF v_balance.balance_amount != 150000 THEN
    RAISE EXCEPTION 'FAILED: Expected balance 150000, got %', v_balance.balance_amount;
  END IF;

  IF v_balance.months_remaining != 3 THEN
    RAISE EXCEPTION 'FAILED: Expected 3 months remaining, got %', v_balance.months_remaining;
  END IF;

  RAISE NOTICE '✓ Balance reduced again: 150,000 VND (3 months)';

  -- ========================================
  -- TEST 4: Multi-Member Prepaid
  -- ========================================

  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Multi-member prepaid (Members B and C)';
  RAISE NOTICE '----------------------------------------';

  v_prepaid_result := record_multi_member_prepaid(
    p_recurring_expense_id := v_recurring_id,
    p_member_months := '[
      {"user_id": "' || v_user_b || '", "months": 2},
      {"user_id": "' || v_user_c || '", "months": 3}
    ]'::JSONB,
    p_paid_by_user_id := v_user_b
  );

  RAISE NOTICE 'Multi-member Result: %', v_prepaid_result;

  -- Verify Member B balance
  SELECT * INTO v_balance
  FROM member_prepaid_balances
  WHERE recurring_expense_id = v_recurring_id AND user_id = v_user_b;

  IF v_balance.balance_amount != 100000 THEN
    RAISE EXCEPTION 'FAILED: Member B expected balance 100000, got %', v_balance.balance_amount;
  END IF;

  RAISE NOTICE '✓ Member B balance: 100,000 VND (2 months)';

  -- Verify Member C balance
  SELECT * INTO v_balance
  FROM member_prepaid_balances
  WHERE recurring_expense_id = v_recurring_id AND user_id = v_user_c;

  IF v_balance.balance_amount != 150000 THEN
    RAISE EXCEPTION 'FAILED: Member C expected balance 150000, got %', v_balance.balance_amount;
  END IF;

  RAISE NOTICE '✓ Member C balance: 150,000 VND (3 months)';

  -- ========================================
  -- SUMMARY
  -- ========================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL TESTS PASSED! ✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Member A: 150,000 VND (3 months remaining)';
  RAISE NOTICE '  - Member B: 100,000 VND (2 months)';
  RAISE NOTICE '  - Member C: 150,000 VND (3 months)';
  RAISE NOTICE '  - Member D: 0 VND (no prepaid)';
  RAISE NOTICE '  - Instances created: 2';
  RAISE NOTICE '  - Consumption working correctly';
  RAISE NOTICE '========================================';

  -- Cleanup (rollback)
  RAISE EXCEPTION 'Test complete - rolling back';
END;
$$;

-- Note: This will rollback all changes due to the exception
-- Remove the RAISE EXCEPTION line to persist test data
