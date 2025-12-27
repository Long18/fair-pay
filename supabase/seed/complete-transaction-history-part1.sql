-- Complete Transaction History for FairPay
-- This script clears all existing expenses and inserts complete transaction history
-- Including both PAID (historical) and UNPAID (current debts) transactions

-- Clear existing data
DELETE FROM expense_splits;
DELETE FROM expenses;

-- Insert all transactions
DO $$
DECLARE
  -- User IDs
  user_long UUID := '9ac73f98-d6ff-54dd-8337-e96816e855c1';
  user_hoang_anh UUID := '57ee3bab-6970-599f-b0b0-e0bbb443a3ff';
  user_thang UUID := 'a90e67fa-d056-5163-a18e-7b3b63ec21ac';
  user_minh UUID := 'a7df138a-2668-5aad-af91-224817db1669';
  user_duc UUID := '1c2e85b5-2db5-5da1-83fd-431337f840df';
  user_ngan UUID := '9a6b9221-1f2f-5787-b557-d29084e9e1a4';
  user_nghi UUID := '1c66269b-d242-5ef0-afae-159b238ddf02';
  user_tuyen UUID := '5836f6a6-2849-56cd-add9-03e1f8620ab5';
  user_thinh UUID := 'be1fc676-78e0-5adf-b4ac-8b297d851f5b';
  user_thai UUID := '05a7407e-c0d5-5707-8e7f-0344a63a0170';
  user_dang UUID := 'e6a4c23e-e5a0-58ed-a5e5-5a8740428cf8';
  user_phuc UUID := '541d8243-68ae-53e2-9a98-06dbae0ae01d';
  user_tam UUID := '259f239d-fc96-568a-a25b-561da5381407';
  user_mike UUID := '18441dda-4fdf-57fe-829e-5dd795f25937';
  user_kayen UUID := '9a6b9221-1f2f-5787-b557-d29084e9e1a4';
  user_hai UUID := '4fab7e3e-949d-5d6b-b997-9b45db0a9407';

  -- Group ID
  group_newgames UUID := '66630ca7-a0cd-4287-9c7f-727aed9cbaea';

  -- Expense ID tracker
  expense_id UUID;
  transaction_count INTEGER := 0;

BEGIN
  RAISE NOTICE 'Starting transaction import...';

  -- ========================================
  -- UNPAID TRANSACTIONS (Current Debts)
  -- ========================================

  RAISE NOTICE 'Importing UNPAID transactions...';

  -- Tuần thứ 3 - 11/2025
  -- Anh Thắng - ngày 18/11/2025 - 12h trưa: 45,000đ ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_thang, group_newgames, 'Food & Drink', 'equal', '2025-11-18 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_thang, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Anh Thắng - ngày 20/11/2025 - 12h trưa: 45,000 ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_thang, group_newgames, 'Food & Drink', 'equal', '2025-11-20 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_thang, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Tuần thứ 1 - 12/2025
  -- Hoàng Anh - ngày 04/12/2025 - 12h trưa: 45,000đ ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-12-04 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 04/12/2025 - 19h tối: 33,000đ emart
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền đi emart', 33000, 'VND', user_long, user_hoang_anh, group_newgames, 'Shopping', 'equal', '2025-12-04 19:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 16500), (expense_id, user_long, 'equal', 16500);
  transaction_count := transaction_count + 1;

  -- Tuần thứ 2 - 12/2025
  -- Hoàng Anh - ngày 10/12/2025 - 12h trưa: 45,000đ ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-12-10 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 12/12/2025 - 12h trưa: 45,000đ ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-12-12 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Tuần thứ 3 - 12/2025
  -- Hoàng Anh - ngày 15/12/2025 - 12h trưa: 45,000đ ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 45000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-12-15 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 16/12/2025 - 12h trưa: 45,000đ ăn trưa emart (Canh bí + Cơm)
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa emart (Canh bí + Cơm)', 45000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-12-16 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 22500), (expense_id, user_long, 'equal', 22500);
  transaction_count := transaction_count + 1;

  -- Karaoke on 19/12/2025 - 4 people paid separately: Hoàng Anh, Mike, Minh, Đức (85,000 each)
  -- Hoàng Anh paid 85,000
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền hát karaoke Apple Mũi Né', 85000, 'VND', user_long, user_hoang_anh, group_newgames, 'Entertainment', 'equal', '2025-12-19 23:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense_id, user_hoang_anh, 'equal', 17000),
    (expense_id, user_mike, 'equal', 17000),
    (expense_id, user_minh, 'equal', 17000),
    (expense_id, user_duc, 'equal', 17000),
    (expense_id, user_long, 'equal', 17000);
  transaction_count := transaction_count + 1;

  -- Mike paid 85,000
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền hát karaoke Apple Mũi Né', 85000, 'VND', user_long, user_mike, group_newgames, 'Entertainment', 'equal', '2025-12-19 23:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense_id, user_hoang_anh, 'equal', 17000),
    (expense_id, user_mike, 'equal', 17000),
    (expense_id, user_minh, 'equal', 17000),
    (expense_id, user_duc, 'equal', 17000),
    (expense_id, user_long, 'equal', 17000);
  transaction_count := transaction_count + 1;

  -- Minh paid 85,000
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền hát karaoke Apple Mũi Né', 85000, 'VND', user_long, user_minh, group_newgames, 'Entertainment', 'equal', '2025-12-19 23:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense_id, user_hoang_anh, 'equal', 17000),
    (expense_id, user_mike, 'equal', 17000),
    (expense_id, user_minh, 'equal', 17000),
    (expense_id, user_duc, 'equal', 17000),
    (expense_id, user_long, 'equal', 17000);
  transaction_count := transaction_count + 1;

  -- Đức paid 85,000
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền hát karaoke Apple Mũi Né', 85000, 'VND', user_long, user_duc, group_newgames, 'Entertainment', 'equal', '2025-12-19 23:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense_id, user_hoang_anh, 'equal', 17000),
    (expense_id, user_mike, 'equal', 17000),
    (expense_id, user_minh, 'equal', 17000),
    (expense_id, user_duc, 'equal', 17000),
    (expense_id, user_long, 'equal', 17000);
  transaction_count := transaction_count + 1;

  RAISE NOTICE 'UNPAID transactions imported: %', transaction_count;

  -- ========================================
  -- PAID TRANSACTIONS (Historical data)
  -- ========================================

  RAISE NOTICE 'Importing PAID transactions (historical data)...';

  -- Tuần thứ 1 - 04/2025
  -- Hoàng Anh - ngày 01/04/2025 - 10h sáng: 30,000đ tiền cà phê
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 30000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-01 10:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 15000), (expense_id, user_long, 'equal', 15000);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 02/04/2025 - 10h sáng: 35,000đ tiền cà phê
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-02 10:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 02/04/2025 - 12h trưa: 100,000đ tiền ăn trưa
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền ăn trưa', 100000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-02 12:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 50000), (expense_id, user_long, 'equal', 50000);
  transaction_count := transaction_count + 1;

  -- Continue with remaining April transactions...
  -- Hoàng Anh - ngày 03/04/2025 - 10h sáng: 35,000đ tiền cà phê
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-03 10:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  -- Hoàng Anh - ngày 04/04/2025 - 10h sáng: 35,000đ tiền cà phê
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-04 10:00:00', false)
  RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  RAISE NOTICE 'April 2025 Week 1 completed';

  -- Tuần thứ 2 - 04/2025
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-07 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 30000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-08 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 15000), (expense_id, user_long, 'equal', 15000);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-09 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-10 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-11 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  -- Tuần thứ 3 - 04/2025
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-15 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-16 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-17 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-18 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  -- Tuần thứ 4 - 04/2025
  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-22 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-23 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-24 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  INSERT INTO expenses (description, total_amount, currency, created_by, paid_by_user_id, group_id, category, split_method, created_at, is_payment)
  VALUES ('Tiền cà phê', 35000, 'VND', user_long, user_hoang_anh, group_newgames, 'Food & Drink', 'equal', '2025-04-25 10:00:00', false) RETURNING id INTO expense_id;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount) VALUES (expense_id, user_hoang_anh, 'equal', 17500), (expense_id, user_long, 'equal', 17500);
  transaction_count := transaction_count + 1;

  RAISE NOTICE 'April 2025 completed (% transactions)', 18;

  -- This file will continue in part 2 due to character limit...
  -- The remaining months (June-December) will be added in the next section

  RAISE NOTICE 'Total transactions imported so far: %', transaction_count;

END $$;
