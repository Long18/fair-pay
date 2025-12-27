-- Script: Clear all expenses and add new test data (Fixed)
-- Purpose: Replace production data with clean test expenses
-- Date: 2025-12-27

-- Step 1: Delete all existing expenses and splits (CASCADE will handle splits)
DELETE FROM expenses;

-- Step 2: Insert new expenses with correct structure
-- All expenses paid by Long, in NewGames group

-- Tuần thứ 3 - 11/2025:
-- Thắng - 18/11/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-11-18',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    -- Split between Long and Thắng
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 22500);
END $$;

-- Thắng - 20/11/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-11-20',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 22500);
END $$;

-- Tuần thứ 1 - 12/2025:
-- Hoàng Anh - 04/12/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-12-04',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 22500);
END $$;

-- Hoàng Anh - 04/12/2025 - 19h tối: 33,000đ emart
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền đi emart',
        33000,
        'VND',
        'Shopping',
        '2025-12-04',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 16500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 16500);
END $$;

-- Tuần thứ 2 - 12/2025:
-- Hoàng Anh - 10/12/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-12-10',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 22500);
END $$;

-- Hoàng Anh - 12/12/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-12-12',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 22500);
END $$;

-- Tuần thứ 3 - 12/2025:
-- Hoàng Anh - 15/12/2025 - 12h trưa: 45,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa',
        45000,
        'VND',
        'Food & Drink',
        '2025-12-15',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 22500);
END $$;

-- Hoàng Anh - 16/12/2025 - 12h trưa: 45,000đ emart (Canh bí + Cơm)
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền ăn trưa emart (Canh bí + Cơm)',
        45000,
        'VND',
        'Food & Drink',
        '2025-12-16',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 22500),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 22500);
END $$;

-- Karaoke - 19/12/2025 - 23h: 85,000đ each, 5 people total
-- Total paid by Long: 425,000đ, each person owes 85,000đ
DO $$
DECLARE
    expense_id_var uuid;
BEGIN
    INSERT INTO expenses (
        context_type, group_id, description, amount, currency,
        category, expense_date, paid_by_user_id, is_payment, created_by
    ) VALUES (
        'group',
        '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
        'Tiền hát karaoke Apple Mũi Né',
        425000,
        'VND',
        'Entertainment',
        '2025-12-19',
        '9ac73f98-d6ff-54dd-8337-e96816e855c1',
        false,
        '9ac73f98-d6ff-54dd-8337-e96816e855c1'
    ) RETURNING id INTO expense_id_var;

    -- Split among 5 people: Long, Hoàng Anh, Mike, Minh, Đức
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES
        (expense_id_var, '9ac73f98-d6ff-54dd-8337-e96816e855c1', 'equal', 85000),
        (expense_id_var, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 85000),
        (expense_id_var, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 85000),
        (expense_id_var, 'a7df138a-2668-5aad-af91-224817db1669', 'equal', 85000),
        (expense_id_var, '1c2e85b5-2db5-5da1-83fd-431337f840df', 'equal', 85000);
END $$;

-- Expected debts summary:
-- Thắng owes Long: 2 x 22,500 = 45,000đ
-- Hoàng Anh owes Long:
--   6 lunches x 22,500 = 135,000đ
--   1 emart x 16,500 = 16,500đ
--   1 karaoke x 85,000 = 85,000đ
--   Total = 236,500đ
-- Mike owes Long: 85,000đ (karaoke)
-- Minh owes Long: 85,000đ (karaoke)
-- Đức owes Long: 85,000đ (karaoke)
--
-- Grand total owed to Long: 536,500đ
