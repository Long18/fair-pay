-- Sample Data for FairPay Database
-- Excludes: profiles, groups, group_members, employee_name_mapping
-- Execute this after migrations are applied and you have existing profiles and friendships

-- ============================================
-- 1. USER_SETTINGS
-- ============================================
-- Note: Replace UUIDs with actual profile IDs from your database
-- These are example UUIDs - update them to match your actual profiles

INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme, notifications_enabled, email_notifications, notify_on_expense_added, notify_on_payment_received, notify_on_friend_request, notify_on_group_invite, allow_friend_requests, allow_group_invites, profile_visibility)
VALUES
  -- User 1: Light theme, all notifications enabled
  ('c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'VND', 'DD/MM/YYYY', 'vi-VN', 'light', true, true, true, true, true, true, true, true, 'friends'),
  -- User 2: Dark theme, minimal notifications
  ('1e8ccbdb-370a-4357-897a-08c020aaee3b', 'VND', 'DD/MM/YYYY', 'vi-VN', 'dark', true, false, true, true, false, false, true, true, 'friends'),
  -- User 3: System theme, all enabled
  ('c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'VND', 'MM/DD/YYYY', 'vi-VN', 'system', true, true, true, true, true, true, true, true, 'public'),
  -- User 4: Light theme, notifications disabled
  ('1e8ccbdb-370a-4357-897a-08c020aaee3b', 'VND', 'DD/MM/YYYY', 'vi-VN', 'light', false, false, false, false, false, false, true, true, 'private'),
  -- User 5: Dark theme, selective notifications
  ('c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'VND', 'DD/MM/YYYY', 'vi-VN', 'dark', true, true, true, false, true, false, true, false, 'friends')
ON CONFLICT (user_id) DO UPDATE SET
  default_currency = EXCLUDED.default_currency,
  theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================
-- 2. FRIENDSHIPS
-- ============================================
-- Note: Ensure user_a < user_b (constraint requirement)
-- Replace UUIDs with actual profile IDs

INSERT INTO friendships (id, user_a, user_b, status, created_by)
VALUES
  -- Accepted friendships
  ('20000000-0000-0000-0000-000000000001', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'accepted', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  ('20000000-0000-0000-0000-000000000002', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'accepted', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  ('20000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'accepted', '1e8ccbdb-370a-4357-897a-08c020aaee3b'),
  ('20000000-0000-0000-0000-000000000004', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'accepted', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  -- Pending friendships
  ('20000000-0000-0000-0000-000000000005', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'pending', '1e8ccbdb-370a-4357-897a-08c020aaee3b'),
  ('20000000-0000-0000-0000-000000000006', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'pending', '1e8ccbdb-370a-4357-897a-08c020aaee3b')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. EXPENSES (Friend expenses only)
-- ============================================
-- All expenses use context_type = 'friend' and valid friendship_id

INSERT INTO expenses (id, context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
VALUES
  -- Friendship 1 expenses (User 1 & User 2)
  ('30000000-0000-0000-0000-000000000001', 'friend', '20000000-0000-0000-0000-000000000001', 'Coffee at Highlands', 120000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '5 days', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  ('30000000-0000-0000-0000-000000000002', 'friend', '20000000-0000-0000-0000-000000000001', 'Grab ride to district 1', 85000, 'VND', 'Transportation', CURRENT_DATE - INTERVAL '3 days', '1e8ccbdb-370a-4357-897a-08c020aaee3b', false, '1e8ccbdb-370a-4357-897a-08c020aaee3b'),
  ('30000000-0000-0000-0000-000000000003', 'friend', '20000000-0000-0000-0000-000000000001', 'Dinner at Korean BBQ', 450000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '1 day', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Friendship 2 expenses (User 1 & User 3)
  ('30000000-0000-0000-0000-000000000004', 'friend', '20000000-0000-0000-0000-000000000002', 'Movie tickets at CGV', 320000, 'VND', 'Entertainment', CURRENT_DATE - INTERVAL '7 days', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  ('30000000-0000-0000-0000-000000000005', 'friend', '20000000-0000-0000-0000-000000000002', 'Popcorn and drinks', 150000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '7 days', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Friendship 3 expenses (User 2 & User 4)
  ('30000000-0000-0000-0000-000000000006', 'friend', '20000000-0000-0000-0000-000000000003', 'Shared internet bill', 300000, 'VND', 'Utilities', CURRENT_DATE - INTERVAL '10 days', '1e8ccbdb-370a-4357-897a-08c020aaee3b', false, '1e8ccbdb-370a-4357-897a-08c020aaee3b'),
  ('30000000-0000-0000-0000-000000000007', 'friend', '20000000-0000-0000-0000-000000000003', 'Lunch at Pho restaurant', 180000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '2 days', '1e8ccbdb-370a-4357-897a-08c020aaee3b', false, '1e8ccbdb-370a-4357-897a-08c020aaee3b'),

  -- Friendship 4 expenses (User 3 & User 5)
  ('30000000-0000-0000-0000-000000000008', 'friend', '20000000-0000-0000-0000-000000000004', 'Shopping at Vincom', 1250000, 'VND', 'Shopping', CURRENT_DATE - INTERVAL '4 days', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),
  ('30000000-0000-0000-0000-000000000009', 'friend', '20000000-0000-0000-0000-000000000004', 'Taxi to airport', 250000, 'VND', 'Transportation', CURRENT_DATE - INTERVAL '6 days', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', false, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. EXPENSE_SPLITS
-- ============================================
-- Split each expense equally between the two friends
-- Ensure computed_amount sums match expense amount

INSERT INTO expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount)
VALUES
  -- Expense 1: Coffee (120,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 60000),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 60000),

  -- Expense 2: Grab ride (85,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 42500),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 42500),

  -- Expense 3: Korean BBQ (450,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 225000),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 225000),

  -- Expense 4: Movie tickets (320,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 160000),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000004', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 160000),

  -- Expense 5: Popcorn (150,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000005', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 75000),
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000005', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 75000),

  -- Expense 6: Internet bill (300,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 150000),
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000006', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 150000),

  -- Expense 7: Pho lunch (180,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000007', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 90000),
  ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000007', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'equal', NULL, 90000),

  -- Expense 8: Shopping (1,250,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000008', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 625000),
  ('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000008', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 625000),

  -- Expense 9: Taxi (250,000 VND) - Split equally
  ('40000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000009', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 125000),
  ('40000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000009', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'equal', NULL, 125000)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. PAYMENTS (Friend payments only)
-- ============================================
-- Settlement payments between friends

INSERT INTO payments (id, context_type, friendship_id, from_user, to_user, amount, currency, payment_date, note, created_by)
VALUES
  -- Payment 1: User 2 pays User 1 (settling coffee and grab expenses)
  ('50000000-0000-0000-0000-000000000001', 'friend', '20000000-0000-0000-0000-000000000001', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 102500, 'VND', CURRENT_DATE - INTERVAL '2 days', 'Settling coffee and grab expenses', '1e8ccbdb-370a-4357-897a-08c020aaee3b'),

  -- Payment 2: User 1 pays User 3 (settling movie expenses)
  ('50000000-0000-0000-0000-000000000002', 'friend', '20000000-0000-0000-0000-000000000002', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 85000, 'VND', CURRENT_DATE - INTERVAL '1 day', 'Settling movie ticket difference', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Payment 3: User 2 pays User 4 (settling internet and lunch)
  ('50000000-0000-0000-0000-000000000003', 'friend', '20000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 60000, 'VND', CURRENT_DATE, 'Settling shared expenses', '1e8ccbdb-370a-4357-897a-08c020aaee3b'),

  -- Payment 4: User 5 pays User 3 (settling shopping and taxi)
  ('50000000-0000-0000-0000-000000000004', 'friend', '20000000-0000-0000-0000-000000000004', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 500000, 'VND', CURRENT_DATE - INTERVAL '3 days', 'Partial payment for shopping', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ATTACHMENTS
-- ============================================
-- Receipt attachments for some expenses

INSERT INTO attachments (id, expense_id, storage_path, file_name, mime_type, file_size, created_by)
VALUES
  -- Attachment for Korean BBQ expense
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04/30000000-0000-0000-0000-000000000003/receipt.jpg', 'korean-bbq-receipt.jpg', 'image/jpeg', 245760, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Attachment for shopping expense
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04/30000000-0000-0000-0000-000000000008/invoice.pdf', 'vincom-invoice.pdf', 'application/pdf', 512000, 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Attachment for internet bill
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', '1e8ccbdb-370a-4357-897a-08c020aaee3b/30000000-0000-0000-0000-000000000006/bill.png', 'internet-bill.png', 'image/png', 189440, '1e8ccbdb-370a-4357-897a-08c020aaee3b')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================
-- Various notification types

INSERT INTO notifications (id, user_id, type, title, message, link, related_id, is_read, created_at)
VALUES
  -- Expense added notifications
  ('70000000-0000-0000-0000-000000000001', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'expense_added', 'New Expense', 'Alice added "Coffee at Highlands" expense', '/expenses/show/30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('70000000-0000-0000-0000-000000000002', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'expense_added', 'New Expense', 'Bob added "Grab ride to district 1" expense', '/expenses/show/30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', true, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('70000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b', 'expense_added', 'New Expense', 'Alice added "Dinner at Korean BBQ" expense', '/expenses/show/30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),

  -- Payment recorded notifications
  ('70000000-0000-0000-0000-000000000004', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'payment_recorded', 'Payment Recorded', 'Bob paid you 102,500 VND', '/friends/show/20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', true, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('70000000-0000-0000-0000-000000000005', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'payment_recorded', 'Payment Recorded', 'Alice paid you 85,000 VND', '/friends/show/20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),

  -- Friend request notifications
  ('70000000-0000-0000-0000-000000000006', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'friend_request', 'Friend Request', 'Bob sent you a friend request', '/friends', '20000000-0000-0000-0000-000000000005', false, CURRENT_TIMESTAMP - INTERVAL '4 days'),
  ('70000000-0000-0000-0000-000000000007', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'friend_request', 'Friend Request', 'Diana sent you a friend request', '/friends', '20000000-0000-0000-0000-000000000006', false, CURRENT_TIMESTAMP - INTERVAL '2 days'),

  -- Friend accepted notifications
  ('70000000-0000-0000-0000-000000000008', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04', 'friend_accepted', 'Friend Request Accepted', 'Bob accepted your friend request', '/friends/show/20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true, CURRENT_TIMESTAMP - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. RECURRING_EXPENSES
-- ============================================
-- Recurring expense templates for friendships
-- Note: template_expense_id must reference an existing expense

INSERT INTO recurring_expenses (id, template_expense_id, frequency, "interval", start_date, end_date, next_occurrence, last_created_at, is_active, notify_before_days, context_type, friendship_id, created_by)
VALUES
  -- Weekly coffee meetup (based on expense 1)
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'weekly', 1, CURRENT_DATE - INTERVAL '30 days', NULL, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE - INTERVAL '5 days', true, 1, 'friend', '20000000-0000-0000-0000-000000000001', 'c98b9f51-29ed-4bed-af92-0ce3dc4efe04'),

  -- Monthly internet bill (based on expense 6)
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'monthly', 1, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '180 days', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE - INTERVAL '10 days', true, 3, 'friend', '20000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b'),

  -- Inactive recurring expense (was weekly, now stopped)
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', 'weekly', 1, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '14 days', false, 1, 'friend', '20000000-0000-0000-0000-000000000003', '1e8ccbdb-370a-4357-897a-08c020aaee3b')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify data was inserted correctly

-- SELECT COUNT(*) as user_settings_count FROM user_settings;
-- SELECT COUNT(*) as friendships_count FROM friendships;
-- SELECT COUNT(*) as expenses_count FROM expenses WHERE context_type = 'friend';
-- SELECT COUNT(*) as expense_splits_count FROM expense_splits;
-- SELECT COUNT(*) as payments_count FROM payments WHERE context_type = 'friend';
-- SELECT COUNT(*) as attachments_count FROM attachments;
-- SELECT COUNT(*) as notifications_count FROM notifications;
-- SELECT COUNT(*) as recurring_expenses_count FROM recurring_expenses;
