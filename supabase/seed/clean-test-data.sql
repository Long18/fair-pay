-- Script: Clear all expenses and add new test data
-- Purpose: Replace production data with clean test expenses
-- Date: 2025-12-27

-- Step 1: Delete all existing expenses and splits
DELETE FROM expense_splits;
DELETE FROM expenses;

-- Step 2: Get user IDs (we'll need these for the inserts)
-- Long's ID: 9ac73f98-d6ff-54dd-8337-e96816e855c1
-- We need to find other users' IDs

-- Step 3: Insert new expenses
-- Note: All expenses are paid by Long, split equally with one other person

-- Tuần thứ 3 - 11/2025:
-- Anh Thắng - 18/11/2025 - 12h trưa: 45,000đ tiền ăn trưa
INSERT INTO expenses (
    context_type, group_id, friendship_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea', -- NewGames group
    NULL,
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-11-18 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1', -- Long paid
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-11-18 12:00:00'
) RETURNING id;

-- Split between Long and Thắng
INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-11-18 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1', -- Long
    'equal',
    NULL,
    22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-11-18 12:00:00'),
    'a90e67fa-d056-5163-a18e-7b3b63ec21ac', -- Thắng
    'equal',
    NULL,
    22500;

-- Anh Thắng - 20/11/2025 - 12h trưa: 45,000đ tiền ăn trưa
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-11-20 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-11-20 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-11-20 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-11-20 12:00:00'),
    'a90e67fa-d056-5163-a18e-7b3b63ec21ac', -- Thắng
    'equal', NULL, 22500;

-- Tuần thứ 1 - 12/2025:
-- Hoàng Anh - 04/12/2025 - 12h trưa: 45,000đ tiền ăn trưa
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-12-04 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-04 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-04 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-04 12:00:00'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', -- Hoàng Anh
    'equal', NULL, 22500;

-- Hoàng Anh - 04/12/2025 - 19h tối: 33,000đ tiền đi emart
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền đi emart',
    33000,
    'VND',
    'shopping',
    '2025-12-04 19:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-04 19:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền đi emart' AND expense_date = '2025-12-04 19:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 16500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền đi emart' AND expense_date = '2025-12-04 19:00:00'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', -- Hoàng Anh
    'equal', NULL, 16500;

-- Tuần thứ 2 - 12/2025:
-- Hoàng Anh - 10/12/2025 - 12h trưa: 45,000đ
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-12-10 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-10 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-10 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-10 12:00:00'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'equal', NULL, 22500;

-- Hoàng Anh - 12/12/2025 - 12h trưa: 45,000đ
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-12-12 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-12 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-12 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-12 12:00:00'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'equal', NULL, 22500;

-- Tuần thứ 3 - 12/2025:
-- Hoàng Anh - 15/12/2025 - 12h trưa: 45,000đ
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa',
    45000,
    'VND',
    'food',
    '2025-12-15 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-15 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-15 12:00:00'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description = 'Tiền ăn trưa' AND expense_date = '2025-12-15 12:00:00'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'equal', NULL, 22500;

-- Hoàng Anh - 16/12/2025 - 12h trưa: 45,000đ emart (Canh bí + Cơm)
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền ăn trưa emart (Canh bí + Cơm)',
    45000,
    'VND',
    'food',
    '2025-12-16 12:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-16 12:00:00'
);

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%Canh bí%'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'equal', NULL, 22500;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%Canh bí%'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'equal', NULL, 22500;

-- Karaoke - 19/12/2025 - 23h: 85,000đ x 4 người (Long, Hoàng Anh, Mike, Minh Hồ, Đức)
-- Total: 340,000đ paid by Long, split 5 ways = 68,000đ each
INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    category, expense_date, paid_by_user_id, is_payment, created_by, created_at
) VALUES (
    'group',
    '66630ca7-a0cd-4287-9c7f-727aed9cbaea',
    'Tiền hát karaoke Apple Mũi Né',
    340000, -- 85k x 4 others (Long doesn't pay for himself)
    'VND',
    'entertainment',
    '2025-12-19 23:00:00',
    '9ac73f98-d6ff-54dd-8337-e96816e855c1', -- Long paid
    false,
    '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    '2025-12-19 23:00:00'
);

-- Split among 5 people: Long, Hoàng Anh, Mike, Minh Hồ, Đức
-- Each owes 68,000đ (340,000 / 5)
INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%karaoke%'),
    '9ac73f98-d6ff-54dd-8337-e96816e855c1', -- Long
    'equal', NULL, 68000;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%karaoke%'),
    '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', -- Hoàng Anh
    'equal', NULL, 68000;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%karaoke%'),
    '18441dda-4fdf-57fe-829e-5dd795f25937', -- Mike
    'equal', NULL, 68000;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%karaoke%'),
    'a7df138a-2668-5aad-af91-224817db1669', -- Minh
    'equal', NULL, 68000;

INSERT INTO expense_splits (expense_id, user_id, split_method, split_value, computed_amount)
SELECT
    (SELECT id FROM expenses WHERE description LIKE '%karaoke%'),
    '1c2e85b5-2db5-5da1-83fd-431337f840df', -- Đức
    'equal', NULL, 68000;

-- Summary of expected debts:
-- Thắng owes Long: 45,000đ (2 lunches x 22,500)
-- Hoàng Anh owes Long:
--   - Lunches: 6 x 22,500 = 135,000
--   - Emart: 16,500
--   - Karaoke: 68,000
--   Total: 219,500đ
-- Mike owes Long: 68,000đ (karaoke)
-- Minh owes Long: 68,000đ (karaoke)
-- Đức owes Long: 68,000đ (karaoke)
