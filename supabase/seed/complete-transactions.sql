-- Complete Transaction History
-- Generated from Python script

DELETE FROM expense_splits;
DELETE FROM expenses;

DO $$
DECLARE
  u_anh_mike UUID := '18441dda-4fdf-57fe-829e-5dd795f25937';
  u_anh_mike_aka_mai UUID := '18441dda-4fdf-57fe-829e-5dd795f25937';
  u_anh_phúc UUID := '541d8243-68ae-53e2-9a98-06dbae0ae01d';
  u_anh_thắng UUID := 'a90e67fa-d056-5163-a18e-7b3b63ec21ac';
  u_anh_tâm UUID := '259f239d-fc96-568a-a25b-561da5381407';
  u_anh_đăng UUID := 'e6a4c23e-e5a0-58ed-a5e5-5a8740428cf8';
  u_chị_kayen UUID := '8708e18c-144f-58f0-b34a-a7ddc9324b4f';
  u_chị_kim_ngân UUID := '9a6b9221-1f2f-5787-b557-d29084e9e1a4';
  u_chị_ngân UUID := '9a6b9221-1f2f-5787-b557-d29084e9e1a4';
  u_hoàng_anh UUID := '57ee3bab-6970-599f-b0b0-e0bbb443a3ff';
  u_hải UUID := '4fab7e3e-949d-5d6b-b997-9b45db0a9407';
  u_long UUID := '9ac73f98-d6ff-54dd-8337-e96816e855c1';
  u_minh UUID := 'a7df138a-2668-5aad-af91-224817db1669';
  u_minh_hồ UUID := 'a7df138a-2668-5aad-af91-224817db1669';
  u_thái UUID := '05a7407e-c0d5-5707-8e7f-0344a63a0170';
  u_thịnh_arin UUID := 'be1fc676-78e0-5adf-b4ac-8b297d851f5b';
  u_thục_nghi UUID := '1c66269b-d242-5ef0-afae-159b238ddf02';
  u_tuyến UUID := '5836f6a6-2849-56cd-add9-03e1f8620ab5';
  u_đức UUID := '1c2e85b5-2db5-5da1-83fd-431337f840df';
  g_new UUID := '66630ca7-a0cd-4287-9c7f-727aed9cbaea';
  eid UUID;
  cnt INT := 0;
BEGIN

  -- 1. Tiền ăn trưa (Anh Thắng, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-18', u_anh_thắng, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_thắng, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 2. Tiền ăn trưa (Anh Thắng, 2025-11-20 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', u_anh_thắng, false, u_long, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_thắng, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 3. Tiền ăn trưa (Hoàng Anh, 2025-12-04 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-04', u_hoàng_anh, false, u_long, '2025-12-04 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 4. Tiền đi emart (Hoàng Anh, 2025-12-04 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền đi emart', 33000, 'VND', 'Shopping', '2025-12-04', u_hoàng_anh, false, u_long, '2025-12-04 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 16500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 16500, now());
  cnt := cnt + 1;

  -- 5. Tiền ăn trưa (Hoàng Anh, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_hoàng_anh, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 6. Tiền ăn trưa (Hoàng Anh, 2025-12-12 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-12', u_hoàng_anh, false, u_long, '2025-12-12 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 7. Tiền ăn trưa (Hoàng Anh, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_hoàng_anh, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 8. Tiền ăn trưa emart (Canh bí + Cơm) (Hoàng Anh, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa emart (Canh bí + Cơm)', 45000, 'VND', 'Food & Drink', '2025-12-16', u_hoàng_anh, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 9. Tiền hát karaoke Apple Mũi Né (Hoàng Anh, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', u_hoàng_anh, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_anh_mike, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_minh_hồ, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_đức, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17000, now());
  cnt := cnt + 1;

  -- 10. Tiền hát karaoke Apple Mũi Né (Anh Mike, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', u_anh_mike, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_anh_mike, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_minh_hồ, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_đức, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17000, now());
  cnt := cnt + 1;

  -- 11. Tiền hát karaoke Apple Mũi Né (Minh Hồ, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', u_minh_hồ, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_anh_mike, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_minh_hồ, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_đức, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17000, now());
  cnt := cnt + 1;

  -- 12. Tiền hát karaoke Apple Mũi Né (Đức, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', u_đức, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_anh_mike, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_minh_hồ, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_đức, 'equal', NULL, 17000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17000, now());
  cnt := cnt + 1;

  -- 13. Tiền cà phê (Hoàng Anh, 2025-04-01 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 30000, 'VND', 'Food & Drink', '2025-04-01', u_hoàng_anh, false, u_long, '2025-04-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 15000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 15000, now());
  cnt := cnt + 1;

  -- 14. Tiền cà phê (Hoàng Anh, 2025-04-02 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-02', u_hoàng_anh, false, u_long, '2025-04-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 15. Tiền ăn trưa (Hoàng Anh, 2025-04-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 100000, 'VND', 'Food & Drink', '2025-04-02', u_hoàng_anh, false, u_long, '2025-04-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 50000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 50000, now());
  cnt := cnt + 1;

  -- 16. Tiền cà phê (Hoàng Anh, 2025-04-03 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-03', u_hoàng_anh, false, u_long, '2025-04-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 17. Tiền cà phê (Hoàng Anh, 2025-04-04 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-04', u_hoàng_anh, false, u_long, '2025-04-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 18. Tiền cà phê (Hoàng Anh, 2025-04-07 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-07', u_hoàng_anh, false, u_long, '2025-04-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 19. Tiền cà phê (Hoàng Anh, 2025-04-08 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 30000, 'VND', 'Food & Drink', '2025-04-08', u_hoàng_anh, false, u_long, '2025-04-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 15000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 15000, now());
  cnt := cnt + 1;

  -- 20. Tiền cà phê (Hoàng Anh, 2025-04-09 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-09', u_hoàng_anh, false, u_long, '2025-04-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 21. Tiền cà phê (Hoàng Anh, 2025-04-10 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-10', u_hoàng_anh, false, u_long, '2025-04-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 22. Tiền cà phê (Hoàng Anh, 2025-04-11 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-11', u_hoàng_anh, false, u_long, '2025-04-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 23. Tiền cà phê (Hoàng Anh, 2025-04-15 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-15', u_hoàng_anh, false, u_long, '2025-04-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 24. Tiền cà phê (Hoàng Anh, 2025-04-16 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-16', u_hoàng_anh, false, u_long, '2025-04-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 25. Tiền cà phê (Hoàng Anh, 2025-04-17 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-17', u_hoàng_anh, false, u_long, '2025-04-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 26. Tiền cà phê (Hoàng Anh, 2025-04-18 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-18', u_hoàng_anh, false, u_long, '2025-04-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 27. Tiền cà phê (Hoàng Anh, 2025-04-22 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-22', u_hoàng_anh, false, u_long, '2025-04-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 28. Tiền cà phê (Hoàng Anh, 2025-04-23 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-23', u_hoàng_anh, false, u_long, '2025-04-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 29. Tiền cà phê (Hoàng Anh, 2025-04-24 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-24', u_hoàng_anh, false, u_long, '2025-04-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 30. Tiền cà phê (Hoàng Anh, 2025-04-25 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-04-25', u_hoàng_anh, false, u_long, '2025-04-25 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 31. Tiền ăn tối (Chị Kim (Ngân), 2025-06-18 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', u_chị_kim_ngân, false, u_long, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 25000, now());
  cnt := cnt + 1;

  -- 32. Tiền hát karaoke (Chị Kim (Ngân), 2025-06-18 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', u_chị_kim_ngân, false, u_long, '2025-06-18 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 20666, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20666, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20666, now());
  cnt := cnt + 1;

  -- 33. Tiền ăn tối (Hoàng Anh, 2025-06-18 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', u_hoàng_anh, false, u_long, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 25000, now());
  cnt := cnt + 1;

  -- 34. Tiền ăn tối (Thục Nghi, 2025-06-18 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', u_thục_nghi, false, u_long, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 25000, now());
  cnt := cnt + 1;

  -- 35. Tiền hát karaoke (Thục Nghi, 2025-06-18 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', u_thục_nghi, false, u_long, '2025-06-18 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 20666, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20666, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20666, now());
  cnt := cnt + 1;

  -- 36. Tiền ăn tối (Chị Kim (Ngân), 2025-07-16 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', u_chị_kim_ngân, false, u_long, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 37. Tiền hát karaoke (Chị Kim (Ngân), 2025-07-16 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', u_chị_kim_ngân, false, u_long, '2025-07-16 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 38. Tiền ăn tối (Hoàng Anh, 2025-07-16 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', u_hoàng_anh, false, u_long, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 39. Tiền hát karaoke (Hoàng Anh, 2025-07-16 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', u_hoàng_anh, false, u_long, '2025-07-16 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 40. Tiền ăn tối (Thục Nghi, 2025-07-16 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', u_thục_nghi, false, u_long, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 41. Tiền hát karaoke (Thục Nghi, 2025-07-16 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', u_thục_nghi, false, u_long, '2025-07-16 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 42. Tiền ăn tối (Chị Kim (Ngân), 2025-07-23 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', u_chị_kim_ngân, false, u_long, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 43. Tiền ăn tối (Hoàng Anh, 2025-07-23 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', u_hoàng_anh, false, u_long, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 44. Tiền ăn tối (Thục Nghi, 2025-07-23 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', u_thục_nghi, false, u_long, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 45. Tiền ăn tối (Chị Kim (Ngân), 2025-07-30 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', u_chị_kim_ngân, false, u_long, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 46. Tiền ăn tối (Hoàng Anh, 2025-07-30 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', u_hoàng_anh, false, u_long, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 47. Tiền ăn tối (Thục Nghi, 2025-07-30 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', u_thục_nghi, false, u_long, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kim_ngân, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 37500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 37500, now());
  cnt := cnt + 1;

  -- 48. Tiền Grab (Hoàng Anh, 2025-08-01 09:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền Grab', 30000, 'VND', 'Transportation', '2025-08-01', u_hoàng_anh, false, u_long, '2025-08-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 15000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 15000, now());
  cnt := cnt + 1;

  -- 49. Tiền cà phê (Hoàng Anh, 2025-08-01 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-01', u_hoàng_anh, false, u_long, '2025-08-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 50. Tiền cà phê (Hoàng Anh, 2025-08-05 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-05', u_hoàng_anh, false, u_long, '2025-08-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 51. Tiền cà phê (Hoàng Anh, 2025-08-08 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-08', u_hoàng_anh, false, u_long, '2025-08-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 52. Tiền cà phê (Hoàng Anh, 2025-08-11 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-11', u_hoàng_anh, false, u_long, '2025-08-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 53. Tiền cà phê (Hoàng Anh, 2025-08-12 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-12', u_hoàng_anh, false, u_long, '2025-08-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 54. Tiền cà phê (Hoàng Anh, 2025-08-13 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-13', u_hoàng_anh, false, u_long, '2025-08-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 55. Tiền cà phê (Hoàng Anh, 2025-08-15 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-15', u_hoàng_anh, false, u_long, '2025-08-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 56. Tiền cà phê (Hoàng Anh, 2025-08-18 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-18', u_hoàng_anh, false, u_long, '2025-08-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 57. Tiền cà phê (Hoàng Anh, 2025-08-19 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-19', u_hoàng_anh, false, u_long, '2025-08-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 58. Tiền cà phê (Hoàng Anh, 2025-08-22 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-08-22', u_hoàng_anh, false, u_long, '2025-08-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 59. Tiền cà phê (Hoàng Anh, 2025-09-01 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-01', u_hoàng_anh, false, u_long, '2025-09-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 60. Tiền cà phê (Hoàng Anh, 2025-09-02 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-02', u_hoàng_anh, false, u_long, '2025-09-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 61. Tiền cà phê (Hoàng Anh, 2025-09-05 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-05', u_hoàng_anh, false, u_long, '2025-09-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 62. Tiền cà phê (Hoàng Anh, 2025-09-08 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-08', u_hoàng_anh, false, u_long, '2025-09-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 63. Tiền cà phê (Hoàng Anh, 2025-09-09 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-09', u_hoàng_anh, false, u_long, '2025-09-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 64. Tiền cà phê (Hoàng Anh, 2025-09-12 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-12', u_hoàng_anh, false, u_long, '2025-09-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 65. Tiền cà phê (Hoàng Anh, 2025-09-15 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-15', u_hoàng_anh, false, u_long, '2025-09-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 66. Tiền cà phê (Hoàng Anh, 2025-09-16 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-16', u_hoàng_anh, false, u_long, '2025-09-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 67. Tiền cà phê (Hoàng Anh, 2025-09-19 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-19', u_hoàng_anh, false, u_long, '2025-09-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 68. Tiền cà phê (Hoàng Anh, 2025-09-22 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-22', u_hoàng_anh, false, u_long, '2025-09-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 69. Tiền cà phê (Hoàng Anh, 2025-09-23 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-23', u_hoàng_anh, false, u_long, '2025-09-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 70. Tiền cà phê (Hoàng Anh, 2025-09-26 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-09-26', u_hoàng_anh, false, u_long, '2025-09-26 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 71. Tiền iCloud (Hoàng Anh, 2025-10-01 09:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền iCloud', 29000, 'VND', 'Utilities', '2025-10-01', u_hoàng_anh, false, u_long, '2025-10-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 14500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14500, now());
  cnt := cnt + 1;

  -- 72. Tiền cà phê (Hoàng Anh, 2025-10-03 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-03', u_hoàng_anh, false, u_long, '2025-10-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 73. Tiền cà phê (Hoàng Anh, 2025-10-06 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-06', u_hoàng_anh, false, u_long, '2025-10-06 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 74. Tiền cà phê (Hoàng Anh, 2025-10-07 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-07', u_hoàng_anh, false, u_long, '2025-10-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 75. Tiền cà phê (Hoàng Anh, 2025-10-10 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-10', u_hoàng_anh, false, u_long, '2025-10-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 76. Tiền cà phê (Hoàng Anh, 2025-10-13 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-13', u_hoàng_anh, false, u_long, '2025-10-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 77. Tiền cà phê (Hoàng Anh, 2025-10-14 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-14', u_hoàng_anh, false, u_long, '2025-10-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 78. Tiền cà phê (Hoàng Anh, 2025-10-17 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-17', u_hoàng_anh, false, u_long, '2025-10-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 79. Tiền cà phê (Hoàng Anh, 2025-10-20 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-20', u_hoàng_anh, false, u_long, '2025-10-20 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 80. Tiền cà phê (Hoàng Anh, 2025-10-21 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-21', u_hoàng_anh, false, u_long, '2025-10-21 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 81. Tiền cà phê (Hoàng Anh, 2025-10-24 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-24', u_hoàng_anh, false, u_long, '2025-10-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 82. Tiền cà phê (Hoàng Anh, 2025-10-27 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-27', u_hoàng_anh, false, u_long, '2025-10-27 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 83. Tiền cà phê (Hoàng Anh, 2025-10-28 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-28', u_hoàng_anh, false, u_long, '2025-10-28 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 84. Tiền cà phê (Hoàng Anh, 2025-10-31 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-10-31', u_hoàng_anh, false, u_long, '2025-10-31 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 85. Tiền cà phê (Hoàng Anh, 2025-11-03 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-03', u_hoàng_anh, false, u_long, '2025-11-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 86. Tiền cà phê (Hoàng Anh, 2025-11-04 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-04', u_hoàng_anh, false, u_long, '2025-11-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 87. Tiền cà phê (Hoàng Anh, 2025-11-07 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-07', u_hoàng_anh, false, u_long, '2025-11-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 88. Tiền cà phê (Hoàng Anh, 2025-11-10 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-10', u_hoàng_anh, false, u_long, '2025-11-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 89. Tiền cà phê (Hoàng Anh, 2025-11-11 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-11', u_hoàng_anh, false, u_long, '2025-11-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 90. Tiền cà phê (Hoàng Anh, 2025-11-14 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 25000, 'VND', 'Food & Drink', '2025-11-14', u_hoàng_anh, false, u_long, '2025-11-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 12500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 12500, now());
  cnt := cnt + 1;

  -- 91. Tiền ăn sáng (Anh Mike a.k.a Mai, 2025-11-17 08:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-17', u_anh_mike_aka_mai, false, u_long, '2025-11-17 08:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 92. Tiền ăn trưa (Ăn Trưa) (Hoàng Anh, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_hoàng_anh, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 93. Tiền ăn sáng (Chị Kayen, 2025-11-18 08:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-18', u_chị_kayen, false, u_long, '2025-11-18 08:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 94. Tiền ăn trưa (Ăn Trưa) (Chị Kayen, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_chị_kayen, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 95. Tiền ăn trưa (Ăn Chiều) (Long, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 27000, 'VND', 'Food & Drink', '2025-11-18', u_long, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 27000, now());
  cnt := cnt + 1;

  -- 96. Tiền ăn trưa (Ăn Trưa) (Long, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_long, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 97. Tiền ăn trưa (Ăn Trưa) (Chị Ngân, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_chị_ngân, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 98. Tiền ăn trưa (Ăn Trưa) (Thịnh (Arin), 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_thịnh_arin, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 99. Tiền ăn trưa (Ăn Trưa) (Tuyến, 2025-11-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', u_tuyến, false, u_long, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 100. Tiền ăn tối (Hoàng Anh, 2025-11-19 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', u_hoàng_anh, false, u_long, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 101. Tiền ăn tối (Chị Kayen, 2025-11-19 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', u_chị_kayen, false, u_long, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 102. Tiền ăn tối (Long, 2025-11-19 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', u_long, false, u_long, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 103. Tiền ăn tối (Thục Nghi, 2025-11-19 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', u_thục_nghi, false, u_long, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 104. Tiền ăn tối (Tuyến, 2025-11-19 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', u_tuyến, false, u_long, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 105. Tiền ăn tối (Anh Mike a.k.a Mai, 2025-11-20 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 50000, 'VND', 'Food & Drink', '2025-11-20', u_anh_mike_aka_mai, false, u_long, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 25000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 25000, now());
  cnt := cnt + 1;

  -- 106. Tiền ăn tối (Anh Tâm, 2025-11-20 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 56000, 'VND', 'Food & Drink', '2025-11-20', u_anh_tâm, false, u_long, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 28000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 28000, now());
  cnt := cnt + 1;

  -- 107. Tiền ăn tối (Thục Nghi, 2025-11-20 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn tối', 40000, 'VND', 'Food & Drink', '2025-11-20', u_thục_nghi, false, u_long, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 20000, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 20000, now());
  cnt := cnt + 1;

  -- 108. Tiền ăn trưa (Long, 2025-11-20 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', u_long, false, u_long, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 11250, now());
  cnt := cnt + 1;

  -- 109. Tiền ăn trưa (Hoàng Anh, 2025-11-20 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', u_hoàng_anh, false, u_long, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 11250, now());
  cnt := cnt + 1;

  -- 110. Tiền ăn trưa (Chị Kayen, 2025-11-20 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', u_chị_kayen, false, u_long, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 11250, now());
  cnt := cnt + 1;

  -- 111. Tiền ăn trưa (Tuyến, 2025-11-20 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', u_tuyến, false, u_long, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 11250, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 11250, now());
  cnt := cnt + 1;

  -- 112. Tiền ăn trưa (Ăn Chiều) (Chị Kayen, 2025-12-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', u_chị_kayen, false, u_long, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7800, now());
  cnt := cnt + 1;

  -- 113. Tiền ăn trưa (Ăn Chiều) (Long, 2025-12-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 49500, 'VND', 'Food & Drink', '2025-12-02', u_long, false, u_long, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 9900, now());
  cnt := cnt + 1;

  -- 114. Tiền ăn trưa (Ăn Chiều) (Thịnh (Arin), 2025-12-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 49500, 'VND', 'Food & Drink', '2025-12-02', u_thịnh_arin, false, u_long, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 9900, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 9900, now());
  cnt := cnt + 1;

  -- 115. Tiền ăn trưa (Ăn Chiều) (Thục Nghi, 2025-12-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', u_thục_nghi, false, u_long, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7800, now());
  cnt := cnt + 1;

  -- 116. Tiền ăn trưa (Ăn Chiều) (Tuyến, 2025-12-02 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', u_tuyến, false, u_long, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7800, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7800, now());
  cnt := cnt + 1;

  -- 117. Tiền ăn trưa (Ăn Trưa) (Anh Mike a.k.a Mai, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', u_anh_mike_aka_mai, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 8333, now());
  cnt := cnt + 1;

  -- 118. Tiền ăn trưa (Ăn Trưa) (Chị Ngân, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', u_chị_ngân, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 8333, now());
  cnt := cnt + 1;

  -- 119. Tiền ăn trưa (Ăn Trưa) (Hoàng Anh, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-03', u_hoàng_anh, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 120. Tiền ăn trưa (Ăn Trưa) (Long, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', u_long, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 8333, now());
  cnt := cnt + 1;

  -- 121. Tiền ăn trưa (Ăn Trưa) (Thục Nghi, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 35000, 'VND', 'Food & Drink', '2025-12-03', u_thục_nghi, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 5833, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 5833, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 5833, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 5833, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 5833, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 5833, now());
  cnt := cnt + 1;

  -- 122. Tiền ăn trưa (Ăn Trưa) (Tuyến, 2025-12-03 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', u_tuyến, false, u_long, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 8333, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 8333, now());
  cnt := cnt + 1;

  -- 123. Tiền ăn trưa (Ăn Chiều) (Chị Ngân, 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_chị_ngân, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 124. Tiền ăn trưa (Ăn Chiều) (Hoàng Anh, 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_hoàng_anh, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 125. Tiền ăn trưa (Ăn Chiều) (Long, 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_long, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 126. Tiền ăn trưa (Ăn Chiều) (Thịnh (Arin), 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_thịnh_arin, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 127. Tiền ăn trưa (Ăn Chiều) (Thục Nghi, 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_thục_nghi, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 128. Tiền ăn trưa (Ăn Chiều) (Tuyến, 2025-12-08 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', u_tuyến, false, u_long, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 129. Tiền ăn trưa (Ăn Trưa) (Hoàng Anh, 2025-12-09 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-09', u_hoàng_anh, false, u_long, '2025-12-09 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 130. Tiền ăn trưa (Anh Mike a.k.a Mai, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 50000, 'VND', 'Food & Drink', '2025-12-10', u_anh_mike_aka_mai, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7142, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7142, now());
  cnt := cnt + 1;

  -- 131. Tiền ăn trưa (Chị Ngân, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_chị_ngân, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 132. Tiền ăn trưa (Thái, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_thái, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 133. Tiền ăn trưa (Thịnh (Arin), 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_thịnh_arin, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 134. Tiền ăn trưa (Thục Nghi, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_thục_nghi, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 135. Tiền ăn trưa (Tuyến, 2025-12-10 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', u_tuyến, false, u_long, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_mike_aka_mai, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 136. Tiền đi siêu thị (Hoàng Anh, 2025-12-11 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền đi siêu thị', 45000, 'VND', 'Shopping', '2025-12-11', u_hoàng_anh, false, u_long, '2025-12-11 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hoàng_anh, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 137. Tiền ăn trưa (Chị Kayen, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_chị_kayen, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 138. Tiền ăn trưa (Long, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_long, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 139. Tiền ăn trưa (Thái, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_thái, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 140. Tiền ăn trưa (Thịnh (Arin), 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_thịnh_arin, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 141. Tiền ăn trưa (Thục Nghi, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-15', u_thục_nghi, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 833, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 833, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 833, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 833, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 833, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 833, now());
  cnt := cnt + 1;

  -- 142. Tiền ăn trưa (Tuyến, 2025-12-15 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', u_tuyến, false, u_long, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 7500, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 7500, now());
  cnt := cnt + 1;

  -- 143. Tiền ăn trưa (Anh Tâm, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_anh_tâm, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 144. Tiền ăn trưa (Chị Kayen, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_chị_kayen, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 145. Tiền ăn trưa (Long, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_long, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 146. Tiền ăn trưa (Thái, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_thái, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 147. Tiền ăn trưa (Thịnh (Arin), 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_thịnh_arin, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 148. Tiền ăn trưa (Thục Nghi, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-16', u_thục_nghi, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 714, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 714, now());
  cnt := cnt + 1;

  -- 149. Tiền ăn trưa (Tuyến, 2025-12-16 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', u_tuyến, false, u_long, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_chị_kayen, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thái, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thịnh_arin, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 6428, now()), (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 6428, now());
  cnt := cnt + 1;

  -- 150. Tiền cà phê (Hải, 2025-12-17 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-12-17', u_hải, false, u_long, '2025-12-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hải, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 151. Tiền cà phê (Long, 2025-12-17 10:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền cà phê', 35000, 'VND', 'Food & Drink', '2025-12-17', u_long, false, u_long, '2025-12-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_hải, 'equal', NULL, 17500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 17500, now());
  cnt := cnt + 1;

  -- 152. Tiền đi siêu thị (Long, 2025-12-18 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền đi siêu thị', 201000, 'VND', 'Shopping', '2025-12-18', u_long, false, u_long, '2025-12-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 201000, now());
  cnt := cnt + 1;

  -- 153. Tiền ăn trưa (Long, 2025-12-18 19:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-18', u_long, false, u_long, '2025-12-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_long, 'equal', NULL, 5000, now());
  cnt := cnt + 1;

  -- 154. Tiền ăn trưa (Thục Nghi, 2025-12-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-18', u_thục_nghi, false, u_long, '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_thục_nghi, 'equal', NULL, 2500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 2500, now());
  cnt := cnt + 1;

  -- 155. Tiền ăn trưa (Tuyến, 2025-12-18 12:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-18', u_tuyến, false, u_long, '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_tuyến, 'equal', NULL, 22500, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 22500, now());
  cnt := cnt + 1;

  -- 156. Tiền hát karaoke (Anh Tâm, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', u_anh_tâm, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_đăng, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_phúc, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_minh, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14166, now());
  cnt := cnt + 1;

  -- 157. Tiền hát karaoke (Chị Ngân, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', u_chị_ngân, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_đăng, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_phúc, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_minh, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14166, now());
  cnt := cnt + 1;

  -- 158. Tiền hát karaoke (Anh Đăng, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', u_anh_đăng, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_đăng, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_phúc, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_minh, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14166, now());
  cnt := cnt + 1;

  -- 159. Tiền hát karaoke (Anh Phúc, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', u_anh_phúc, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_đăng, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_phúc, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_minh, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14166, now());
  cnt := cnt + 1;

  -- 160. Tiền hát karaoke (Minh, 2025-12-19 23:00:00)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', g_new, 'Tiền hát karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', u_minh, false, u_long, '2025-12-19 23:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits VALUES (gen_random_uuid(), eid, u_anh_tâm, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_chị_ngân, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_đăng, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_anh_phúc, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_minh, 'equal', NULL, 14166, now()), (gen_random_uuid(), eid, u_long, 'equal', NULL, 14166, now());
  cnt := cnt + 1;

  RAISE NOTICE 'Total: % transactions', cnt;
END $$;
