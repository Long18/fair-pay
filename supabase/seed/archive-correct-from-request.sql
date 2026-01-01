-- Transaction History - CORRECT LOGIC
-- Long paid for everything, everyone owes Long

DELETE FROM expense_splits;
DELETE FROM expenses;

DO $$
DECLARE
  eid UUID;
  cnt_unpaid INT := 0;
  cnt_paid INT := 0;
BEGIN

  -- 1. OWES: Anh Thắng owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 2. OWES: Anh Thắng owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 3. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-04', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-04 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 4. OWES: Hoàng Anh owes Long 33,000đ - emart
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'emart', 33000, 'VND', 'Shopping', '2025-12-04', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-04 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 33000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 5. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 6. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-12', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-12 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 7. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 8. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa emart (Canh bí + Cơm)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa emart (Canh bí + Cơm)', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 9. OWES: Hoàng Anh owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 85000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 10. OWES: Anh Mike owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 85000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 11. OWES: Minh Hồ owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a7df138a-2668-5aad-af91-224817db1669', 'equal', 85000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 12. OWES: Đức owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', false, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c2e85b5-2db5-5da1-83fd-431337f840df', 'equal', 85000);
  cnt_unpaid := cnt_unpaid + 1;

  -- 13. PAID: Hoàng Anh owes Long 30,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 30000, 'VND', 'Food & Drink', '2025-04-01', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000);
  cnt_paid := cnt_paid + 1;

  -- 14. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 15. PAID: Hoàng Anh owes Long 100,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 100000, 'VND', 'Food & Drink', '2025-04-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 16. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 17. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-04', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 18. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-07', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 19. PAID: Hoàng Anh owes Long 30,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 30000, 'VND', 'Food & Drink', '2025-04-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000);
  cnt_paid := cnt_paid + 1;

  -- 20. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-09', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 21. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 22. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-11', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 23. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 24. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 25. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-17', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 26. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 27. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-22', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 28. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-23', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 29. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-24', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 30. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-25', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-04-25 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 31. PAID: Chị Kim (Ngân) owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 32. PAID: Chị Kim (Ngân) owes Long 62,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 62000);
  cnt_paid := cnt_paid + 1;

  -- 33. PAID: Hoàng Anh owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 34. PAID: Thục Nghi owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 35. PAID: Thục Nghi owes Long 62,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 62000);
  cnt_paid := cnt_paid + 1;

  -- 36. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 37. PAID: Chị Kim (Ngân) owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 70000);
  cnt_paid := cnt_paid + 1;

  -- 38. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 39. PAID: Hoàng Anh owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 70000);
  cnt_paid := cnt_paid + 1;

  -- 40. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 41. PAID: Thục Nghi owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 70000);
  cnt_paid := cnt_paid + 1;

  -- 42. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 43. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 44. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 45. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 46. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 47. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000);
  cnt_paid := cnt_paid + 1;

  -- 48. PAID: Hoàng Anh owes Long 30,000đ - Grab
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'Grab', 30000, 'VND', 'Transportation', '2025-08-01', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000);
  cnt_paid := cnt_paid + 1;

  -- 49. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-01', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 50. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-05', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 51. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 52. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-11', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 53. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-12', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 54. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-13', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 55. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 56. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 57. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 58. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-22', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-08-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 59. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-01', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 60. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 61. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-05', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 62. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 63. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-09', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 64. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-12', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 65. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 66. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 67. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 68. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-22', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 69. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-23', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 70. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-26', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-09-26 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 71. PAID: Hoàng Anh owes Long 29,000đ - iCloud
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'iCloud', 29000, 'VND', 'Utilities', '2025-10-01', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 29000);
  cnt_paid := cnt_paid + 1;

  -- 72. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 73. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-06', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-06 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 74. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-07', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 75. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 76. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-13', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 77. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-14', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 78. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-17', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 79. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-20 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 80. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-21', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-21 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 81. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-24', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 82. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-27', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-27 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 83. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-28', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-28 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 84. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-31', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-10-31 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 85. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 86. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-04', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 87. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-07', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 88. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 89. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-11', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 90. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-14', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000);
  cnt_paid := cnt_paid + 1;

  -- 91. PAID: Anh Mike a.k.a Mai owes Long 15,000đ - ăn sáng
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-17', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 15000);
  cnt_paid := cnt_paid + 1;

  -- 92. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 93. PAID: Chị Kayen owes Long 15,000đ - ăn sáng
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 15000);
  cnt_paid := cnt_paid + 1;

  -- 94. PAID: Chị Kayen owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 97. PAID: Chị Ngân owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 98. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 99. PAID: Tuyến owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 100. PAID: Hoàng Anh owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 101. PAID: Chị Kayen owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 103. PAID: Thục Nghi owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 104. PAID: Tuyến owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 100000);
  cnt_paid := cnt_paid + 1;

  -- 105. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 50000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000);
  cnt_paid := cnt_paid + 1;

  -- 106. PAID: Anh Tâm owes Long 56,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 56000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 56000);
  cnt_paid := cnt_paid + 1;

  -- 107. PAID: Thục Nghi owes Long 40,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn tối', 40000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 40000);
  cnt_paid := cnt_paid + 1;

  -- 109. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 110. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 111. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 112. PAID: Chị Kayen owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 39000);
  cnt_paid := cnt_paid + 1;

  -- 114. PAID: Thịnh (Arin) owes Long 49,500đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 49500, 'VND', 'Food & Drink', '2025-12-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 49500);
  cnt_paid := cnt_paid + 1;

  -- 115. PAID: Thục Nghi owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 39000);
  cnt_paid := cnt_paid + 1;

  -- 116. PAID: Tuyến owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 39000);
  cnt_paid := cnt_paid + 1;

  -- 117. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000);
  cnt_paid := cnt_paid + 1;

  -- 118. PAID: Chị Ngân owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 50000);
  cnt_paid := cnt_paid + 1;

  -- 119. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 121. PAID: Thục Nghi owes Long 35,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 35000, 'VND', 'Food & Drink', '2025-12-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 122. PAID: Tuyến owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 50000);
  cnt_paid := cnt_paid + 1;

  -- 123. PAID: Chị Ngân owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 124. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 126. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 127. PAID: Thục Nghi owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 128. PAID: Tuyến owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 129. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-09', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-09 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 130. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 50000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000);
  cnt_paid := cnt_paid + 1;

  -- 131. PAID: Chị Ngân owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 132. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 133. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 134. PAID: Thục Nghi owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 135. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 136. PAID: Hoàng Anh owes Long 45,000đ - đi siêu thị
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'đi siêu thị', 45000, 'VND', 'Shopping', '2025-12-11', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-11 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 137. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 139. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 140. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 141. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000);
  cnt_paid := cnt_paid + 1;

  -- 142. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 143. PAID: Anh Tâm owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 144. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 146. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 147. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 148. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000);
  cnt_paid := cnt_paid + 1;

  -- 149. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 150. PAID: Hải owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'cà phê', 35000, 'VND', 'Food & Drink', '2025-12-17', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '4fab7e3e-949d-5d6b-b997-9b45db0a9407', 'equal', 35000);
  cnt_paid := cnt_paid + 1;

  -- 154. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000);
  cnt_paid := cnt_paid + 1;

  -- 155. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-18', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000);
  cnt_paid := cnt_paid + 1;

  -- 156. PAID: Anh Tâm owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 85000);
  cnt_paid := cnt_paid + 1;

  -- 157. PAID: Chị Ngân owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 85000);
  cnt_paid := cnt_paid + 1;

  -- 158. PAID: Anh Đăng owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'e6a4c23e-e5a0-58ed-a5e5-5a8740428cf8', 'equal', 85000);
  cnt_paid := cnt_paid + 1;

  -- 159. PAID: Anh Phúc owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '541d8243-68ae-53e2-9a98-06dbae0ae01d', 'equal', 85000);
  cnt_paid := cnt_paid + 1;

  -- 160. PAID: Minh owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', '66630ca7-a0cd-4287-9c7f-727aed9cbaea', 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', '9ac73f98-d6ff-54dd-8337-e96816e855c1', true, '9ac73f98-d6ff-54dd-8337-e96816e855c1', '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a7df138a-2668-5aad-af91-224817db1669', 'equal', 85000);
  cnt_paid := cnt_paid + 1;

  RAISE NOTICE 'UNPAID transactions: %', cnt_unpaid;
  RAISE NOTICE 'PAID transactions: %', cnt_paid;
  RAISE NOTICE 'Total: %', cnt_unpaid + cnt_paid;
END $$;

