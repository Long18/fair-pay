-- Unread notification spam for LOCAL manual QA (deep links). Not in config.toml.
-- Login: admin@fairpay.local / password123
--
--   docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/admin-unread-notifications-spam.sql
--   pnpm db:local:notification-spam

BEGIN;

DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-000000000002';
  mod_id   UUID := '00000000-0000-0000-0000-000000000003';
  v_expense_id UUID;
  v_group_id UUID;
  v_friendship_id UUID;
  v_comment_id UUID := 'cccccccc-cccc-4ccc-8ccc-cccccccccc01';
  v_demo_group UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001';
  i INT;
BEGIN
  SELECT e.id INTO v_expense_id
  FROM expenses e
  JOIN expense_splits es ON es.expense_id = e.id
  WHERE es.user_id = admin_id AND COALESCE(e.is_payment, false) = false
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_expense_id IS NULL THEN
    RAISE EXCEPTION 'No expense for admin — run sample-data.sql / demo-login-circle.sql first';
  END IF;

  SELECT g.id INTO v_group_id
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = admin_id AND gm.role = 'admin'
  ORDER BY g.created_at DESC
  LIMIT 1;

  IF v_group_id IS NULL THEN
    v_group_id := v_demo_group;
  END IF;

  SELECT f.id INTO v_friendship_id
  FROM friendships f
  WHERE f.user_a = admin_id OR f.user_b = admin_id
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_friendship_id IS NULL THEN
    v_friendship_id := '98f63ac2-a4ce-480a-9af1-45117487c03e';
  END IF;

  DELETE FROM expense_comments WHERE id = v_comment_id;
  INSERT INTO expense_comments (id, expense_id, user_id, content, created_at, updated_at)
  VALUES (
    v_comment_id,
    v_expense_id,
    mod_id,
    '[local spam seed] Tap notification — should scroll here and highlight.',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  );

  DELETE FROM notifications WHERE id::text LIKE 'f1111111%';

  -- Core deep-link matrix (new + legacy links)
  INSERT INTO notifications (
    id, user_id, actor_id, type, title, message, link, related_id, is_read, created_at
  ) VALUES
    (
      'f1111111-1111-4111-8111-111111111101',
      admin_id, mod_id,
      'friend_request',
      '[spam] Friend request (legacy /friends)',
      'Moderator sent a request — resolver → Connections requests.',
      '/friends',
      v_friendship_id,
      false,
      NOW() - INTERVAL '90 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111102',
      admin_id, mod_id,
      'friend_request',
      '[spam] Friend request (new link)',
      'Same flow with DB link from trigger.',
      '/connections?tab=friends&section=requests',
      v_friendship_id,
      false,
      NOW() - INTERVAL '85 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111103',
      admin_id, mod_id,
      'friend_accepted',
      '[spam] Accepted (legacy /friends)',
      'Should open moderator profile via actor_id.',
      '/friends',
      v_friendship_id,
      false,
      NOW() - INTERVAL '80 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111104',
      admin_id, mod_id,
      'friend_accepted',
      '[spam] Accepted (new /profile)',
      'Direct profile deep link.',
      '/profile/' || mod_id::text,
      v_friendship_id,
      false,
      NOW() - INTERVAL '75 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111105',
      admin_id, mod_id,
      'expense_added',
      '[spam] Expense added',
      'Opens expense detail.',
      '/expenses/show/' || v_expense_id::text,
      v_expense_id,
      false,
      NOW() - INTERVAL '70 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111106',
      admin_id, mod_id,
      'expense_updated',
      '[spam] Expense updated',
      'Opens same expense.',
      '/expenses/show/' || v_expense_id::text,
      v_expense_id,
      false,
      NOW() - INTERVAL '65 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111107',
      admin_id, mod_id,
      'comment_mention',
      '[spam] Mention + #comment anchor',
      'Scroll + highlight test comment.',
      '/expenses/show/' || v_expense_id::text || '#comment-' || v_comment_id::text,
      v_comment_id,
      false,
      NOW() - INTERVAL '60 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111108',
      admin_id, mod_id,
      'comment_reply',
      '[spam] Reply + anchor',
      'Same comment anchor.',
      '/expenses/show/' || v_expense_id::text || '#comment-' || v_comment_id::text,
      v_comment_id,
      false,
      NOW() - INTERVAL '55 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111109',
      admin_id, mod_id,
      'expense_comment',
      '[spam] New comment',
      'Expense comment notification.',
      '/expenses/show/' || v_expense_id::text || '#comment-' || v_comment_id::text,
      v_comment_id,
      false,
      NOW() - INTERVAL '50 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111110',
      admin_id, mod_id,
      'group_join_request',
      '[spam] Join request (legacy /groups/show)',
      'Resolver adds #group-join-requests.',
      '/groups/show/' || v_group_id::text,
      v_group_id,
      false,
      NOW() - INTERVAL '45 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111111',
      admin_id, mod_id,
      'group_join_request',
      '[spam] Join request (hash)',
      'Scroll to join-requests panel.',
      '/groups/show/' || v_group_id::text || '#group-join-requests',
      v_group_id,
      false,
      NOW() - INTERVAL '40 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111112',
      admin_id, mod_id,
      'added_to_group',
      '[spam] Added to group',
      'Opens group show.',
      '/groups/show/' || v_group_id::text,
      v_group_id,
      false,
      NOW() - INTERVAL '35 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111113',
      admin_id, mod_id,
      'payment_recorded',
      '[spam] Payment recorded',
      'Default balances hub.',
      '/balances',
      NULL,
      false,
      NOW() - INTERVAL '30 minutes'
    ),
    (
      'f1111111-1111-4111-8111-111111111114',
      admin_id, mod_id,
      'recurring_due_reminder',
      '[spam] Recurring due',
      'Recurring list.',
      '/recurring-expenses',
      NULL,
      false,
      NOW() - INTERVAL '25 minutes'
    );

  -- Extra unread rows for panel scroll / burst UI
  FOR i IN 1..12 LOOP
    INSERT INTO notifications (
      id, user_id, actor_id, type, title, message, link, related_id, is_read, created_at
    ) VALUES (
      ('f1111111-1111-4111-8111-' || lpad(i::text, 12, '0'))::uuid,
      admin_id,
      mod_id,
      CASE (i % 4)
        WHEN 0 THEN 'expense_added'
        WHEN 1 THEN 'friend_request'
        WHEN 2 THEN 'expense_updated'
        ELSE 'expense_comment'
      END,
      '[spam ' || i || '] Filler unread',
      'Extra row for notification list density.',
      CASE (i % 4)
        WHEN 0 THEN '/expenses/show/' || v_expense_id::text
        WHEN 1 THEN '/connections?tab=friends&section=requests'
        WHEN 2 THEN '/expenses/show/' || v_expense_id::text
        ELSE '/expenses/show/' || v_expense_id::text || '#comment-' || v_comment_id::text
      END,
      CASE (i % 4)
        WHEN 0 THEN v_expense_id
        WHEN 1 THEN v_friendship_id
        WHEN 2 THEN v_expense_id
        ELSE v_comment_id
      END,
      false,
      NOW() - (i || ' minutes')::interval
    );
  END LOOP;

  RAISE NOTICE 'Spam seed OK — expense %, group %, comment %', v_expense_id, v_group_id, v_comment_id;
END $$;

COMMIT;

SELECT type, title, link, is_read
FROM notifications
WHERE user_id = '00000000-0000-0000-0000-000000000002'
  AND id::text LIKE 'f1111111%'
ORDER BY created_at DESC;

SELECT COUNT(*) AS unread_admin_spam
FROM notifications
WHERE user_id = '00000000-0000-0000-0000-000000000002'
  AND is_read = false
  AND id::text LIKE 'f1111111%';
