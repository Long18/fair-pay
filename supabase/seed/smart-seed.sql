-- Smart Seed Data for FairPay Database
-- Auto-generated based on existing profiles
-- Date: 2025-12-25
-- Profiles used: 2

-- ============================================
-- 1. USER_SETTINGS
-- ============================================

INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme, notifications_enabled, email_notifications, notify_on_expense_added, notify_on_payment_received, notify_on_friend_request, notify_on_group_invite, allow_friend_requests, allow_group_invites, profile_visibility)
VALUES
  ('7e2e1689-5d8d-45db-8c64-f0f18210742b', 'VND', 'DD/MM/YYYY', 'vi-VN', 'light', true, true, true, true, true, true, true, true, 'friends'),
  ('927eec99-18e3-440c-bd69-f1ab35bfd005', 'VND', 'DD/MM/YYYY', 'vi-VN', 'dark', true, true, true, true, true, true, true, true, 'friends')
ON CONFLICT (user_id) DO UPDATE SET
  default_currency = EXCLUDED.default_currency,
  theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================
-- 2. FRIENDSHIPS
-- ============================================
-- Create friendships between available users
-- Ensure user_a < user_b (constraint requirement)

INSERT INTO friendships (user_a, user_b, status, created_by)
VALUES
  ('7e2e1689-5d8d-45db-8c64-f0f18210742b', '927eec99-18e3-440c-bd69-f1ab35bfd005', 'accepted', '7e2e1689-5d8d-45db-8c64-f0f18210742b')
ON CONFLICT DO NOTHING;


-- ============================================
-- 3. EXPENSES (Friend expenses only)
-- ============================================
-- Note: These will be created after the friendship exists
-- The friendship_id will be resolved at runtime

DO $$
DECLARE
    friendship_uuid UUID;
    expense1_uuid UUID;
    expense2_uuid UUID;
    expense3_uuid UUID;
BEGIN
    -- Get the friendship ID
    SELECT id INTO friendship_uuid
    FROM friendships
    WHERE user_a = '7e2e1689-5d8d-45db-8c64-f0f18210742b' AND user_b = '927eec99-18e3-440c-bd69-f1ab35bfd005'
    LIMIT 1;

    IF friendship_uuid IS NULL THEN
        RAISE NOTICE 'No friendship found, skipping expenses';
        RETURN;
    END IF;

    -- Create expenses
    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Coffee at Highlands', 120000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '5 days', '7e2e1689-5d8d-45db-8c64-f0f18210742b', false, '7e2e1689-5d8d-45db-8c64-f0f18210742b')
    RETURNING id INTO expense1_uuid;

    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Grab ride to district 1', 85000, 'VND', 'Transportation', CURRENT_DATE - INTERVAL '3 days', '927eec99-18e3-440c-bd69-f1ab35bfd005', false, '927eec99-18e3-440c-bd69-f1ab35bfd005')
    RETURNING id INTO expense2_uuid;

    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Dinner at Korean BBQ', 450000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '1 day', '7e2e1689-5d8d-45db-8c64-f0f18210742b', false, '7e2e1689-5d8d-45db-8c64-f0f18210742b')
    RETURNING id INTO expense3_uuid;

    -- Create expense splits
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
    VALUES
      (expense1_uuid, '7e2e1689-5d8d-45db-8c64-f0f18210742b', 'equal', 60000),
      (expense1_uuid, '927eec99-18e3-440c-bd69-f1ab35bfd005', 'equal', 60000),
      (expense2_uuid, '7e2e1689-5d8d-45db-8c64-f0f18210742b', 'equal', 42500),
      (expense2_uuid, '927eec99-18e3-440c-bd69-f1ab35bfd005', 'equal', 42500),
      (expense3_uuid, '7e2e1689-5d8d-45db-8c64-f0f18210742b', 'equal', 225000),
      (expense3_uuid, '927eec99-18e3-440c-bd69-f1ab35bfd005', 'equal', 225000)
    ON CONFLICT DO NOTHING;

    -- Create payment
    INSERT INTO payments (context_type, friendship_id, from_user, to_user, amount, currency, payment_date, note, created_by)
    VALUES
      ('friend', friendship_uuid, '927eec99-18e3-440c-bd69-f1ab35bfd005', '7e2e1689-5d8d-45db-8c64-f0f18210742b', 102500, 'VND', CURRENT_DATE - INTERVAL '2 days', 'Settling coffee and grab expenses', '927eec99-18e3-440c-bd69-f1ab35bfd005')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================

INSERT INTO notifications (user_id, type, title, message, link, related_id, is_read, created_at)
VALUES
  ('927eec99-18e3-440c-bd69-f1ab35bfd005', 'expense_added', 'New Expense', 'New expense "Coffee at Highlands" was added', '/expenses', NULL, false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('7e2e1689-5d8d-45db-8c64-f0f18210742b', 'payment_recorded', 'Payment Recorded', 'Payment of 102,500 VND received', '/friends', NULL, false, CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

