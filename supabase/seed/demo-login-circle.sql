-- Demo login circle for local development
-- Guarantees friendships, a shared group, expenses, and a payment between the
-- accounts used by VITE_DEV_* quick sign-in buttons.
--
-- Safe to re-run (idempotent via fixed UUIDs + ON CONFLICT).
--
-- Accounts (password: password123):
--   admin@fairpay.local      00000000-0000-0000-0000-000000000002
--   moderator@fairpay.local  00000000-0000-0000-0000-000000000003
--   test@fairpay.local       00000000-0000-0000-0000-000000000001
--   user1@fairpay.local      (looked up by email)
--   user2@fairpay.local      (looked up by email)
--
-- Usage:
--   docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/demo-login-circle.sql

BEGIN;

DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-000000000002';
  mod_id   UUID := '00000000-0000-0000-0000-000000000003';
  test_id  UUID := '00000000-0000-0000-0000-000000000001';
  user1_id UUID;
  user2_id UUID;
  demo_group_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001';
  pair RECORD;
  ordered_a UUID;
  ordered_b UUID;
  fid UUID;
  eid UUID;
  member_id UUID;
BEGIN
  SELECT id INTO user1_id FROM profiles WHERE email = 'user1@fairpay.local' LIMIT 1;
  SELECT id INTO user2_id FROM profiles WHERE email = 'user2@fairpay.local' LIMIT 1;

  IF user1_id IS NULL OR user2_id IS NULL THEN
    RAISE EXCEPTION 'user1@fairpay.local / user2@fairpay.local missing — run sample-data.sql first';
  END IF;

  -- ── Friendships between every pair (accepted) ────────────────────────────
  FOR pair IN
    SELECT * FROM (VALUES
      (admin_id, mod_id),
      (admin_id, test_id),
      (admin_id, user1_id),
      (admin_id, user2_id),
      (mod_id, test_id),
      (mod_id, user1_id),
      (mod_id, user2_id),
      (test_id, user1_id),
      (test_id, user2_id),
      (user1_id, user2_id)
    ) AS t(a, b)
  LOOP
    IF pair.a < pair.b THEN
      ordered_a := pair.a; ordered_b := pair.b;
    ELSE
      ordered_a := pair.b; ordered_b := pair.a;
    END IF;

    IF EXISTS (
      SELECT 1 FROM friendships WHERE user_a = ordered_a AND user_b = ordered_b
    ) THEN
      UPDATE friendships
      SET status = 'accepted', updated_at = NOW()
      WHERE user_a = ordered_a AND user_b = ordered_b;
    ELSE
      INSERT INTO friendships (user_a, user_b, status, created_by, created_at, updated_at)
      VALUES (ordered_a, ordered_b, 'accepted', pair.a, NOW() - INTERVAL '30 days', NOW());
    END IF;
  END LOOP;

  -- ── Shared demo group ────────────────────────────────────────────────────
  INSERT INTO groups (id, name, description, simplify_debts, avatar_url, created_by, created_at, updated_at)
  VALUES (
    demo_group_id,
    'FairPay Demo Squad',
    'Shared local demo group for admin / moderator / user1 / user2 / test',
    true,
    'https://api.dicebear.com/7.x/shapes/svg?seed=fairpay-demo',
    admin_id,
    NOW() - INTERVAL '45 days',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();

  FOREACH member_id IN ARRAY ARRAY[admin_id, mod_id, test_id, user1_id, user2_id]
  LOOP
    INSERT INTO group_members (group_id, user_id, role, joined_at)
    VALUES (
      demo_group_id,
      member_id,
      CASE WHEN member_id = admin_id THEN 'admin' ELSE 'member' END,
      NOW() - INTERVAL '40 days'
    )
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;
  END LOOP;

  -- ── Clear previous demo expenses (fixed UUID prefix) so re-runs stay clean ─
  DELETE FROM expense_splits
  WHERE expense_id IN (
    SELECT id FROM expenses WHERE id::text LIKE 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee01%'
  );
  DELETE FROM expenses WHERE id::text LIKE 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee01%';
  DELETE FROM payments WHERE id::text LIKE 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee02%';

  -- 1) Admin paid lunch — split equally among 5 (100k each)
  eid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0101';
  INSERT INTO expenses (
    id, context_type, group_id, description, amount, currency, category,
    expense_date, paid_by_user_id, is_payment, created_by, created_at, updated_at
  ) VALUES (
    eid, 'group', demo_group_id, 'Team lunch (demo)', 500000, 'VND', 'Food & Drink',
    CURRENT_DATE - 7, admin_id, false, admin_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  );
  FOREACH member_id IN ARRAY ARRAY[admin_id, mod_id, test_id, user1_id, user2_id]
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
    VALUES (eid, member_id, 'equal', 100000, NOW() - INTERVAL '7 days');
  END LOOP;

  -- 2) User1 paid coffee for admin+user1 (friend context)
  SELECT id INTO fid FROM friendships
  WHERE (user_a = LEAST(admin_id, user1_id) AND user_b = GREATEST(admin_id, user1_id))
  LIMIT 1;

  eid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0102';
  INSERT INTO expenses (
    id, context_type, friendship_id, description, amount, currency, category,
    expense_date, paid_by_user_id, is_payment, created_by, created_at, updated_at
  ) VALUES (
    eid, 'friend', fid, 'Cafe sua da (demo)', 90000, 'VND', 'Food & Drink',
    CURRENT_DATE - 3, user1_id, false, user1_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  );
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at) VALUES
    (eid, admin_id, 'equal', 45000, NOW() - INTERVAL '3 days'),
    (eid, user1_id, 'equal', 45000, NOW() - INTERVAL '3 days');

  -- 3) Moderator paid grab for the group
  eid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0103';
  INSERT INTO expenses (
    id, context_type, group_id, description, amount, currency, category,
    expense_date, paid_by_user_id, is_payment, created_by, created_at, updated_at
  ) VALUES (
    eid, 'group', demo_group_id, 'Grab to office (demo)', 250000, 'VND', 'Transportation',
    CURRENT_DATE - 2, mod_id, false, mod_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  );
  FOREACH member_id IN ARRAY ARRAY[admin_id, mod_id, test_id, user1_id, user2_id]
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
    VALUES (eid, member_id, 'equal', 50000, NOW() - INTERVAL '2 days');
  END LOOP;

  -- 4) User2 paid movie tickets — unpaid so balances show
  eid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0104';
  INSERT INTO expenses (
    id, context_type, group_id, description, amount, currency, category,
    expense_date, paid_by_user_id, is_payment, created_by, created_at, updated_at
  ) VALUES (
    eid, 'group', demo_group_id, 'Movie night (demo)', 400000, 'VND', 'Entertainment',
    CURRENT_DATE - 1, user2_id, false, user2_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  );
  FOREACH member_id IN ARRAY ARRAY[admin_id, mod_id, test_id, user1_id, user2_id]
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
    VALUES (eid, member_id, 'equal', 80000, NOW() - INTERVAL '1 day');
  END LOOP;

  -- 5) Partial settle: user1 pays admin 100k for lunch share
  INSERT INTO payments (
    id, context_type, group_id, from_user, to_user, amount, currency,
    payment_date, note, created_by, created_at
  ) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0201',
    'group', demo_group_id, user1_id, admin_id, 100000, 'VND',
    CURRENT_DATE - 1, 'Settled lunch share (demo)', user1_id, NOW() - INTERVAL '1 day'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo login circle ready: FairPay Demo Squad + friendships + 4 expenses + 1 payment';
END $$;

COMMIT;
