-- Comprehensive Seed Data for FairPay Database
-- Auto-generated with 10-50 entries per table
-- Date: 2025-12-25
-- Profiles used: 2

-- ============================================
-- 1. USER_SETTINGS (2 entries)
-- ============================================

INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme, notifications_enabled, email_notifications, notify_on_expense_added, notify_on_payment_received, notify_on_friend_request, notify_on_group_invite, allow_friend_requests, allow_group_invites, profile_visibility)
VALUES
  ('7e2e1689-5d8d-45db-8c64-f0f18210742b', 'VND', 'DD/MM/YYYY', 'vi-VN', 'light', false, false, true, true, true, true, true, true, 'friends'),
  ('927eec99-18e3-440c-bd69-f1ab35bfd005', 'VND', 'MM/DD/YYYY', 'vi-VN', 'dark', true, true, true, true, true, true, true, true, 'public')
ON CONFLICT (user_id) DO UPDATE SET
  default_currency = EXCLUDED.default_currency,
  theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================
-- 2. FRIENDSHIPS (20 entries)
-- ============================================
-- Create multiple friendships between available users

INSERT INTO friendships (user_a, user_b, status, created_by)
VALUES
  ('7e2e1689-5d8d-45db-8c64-f0f18210742b', '927eec99-18e3-440c-bd69-f1ab35bfd005', 'pending', '7e2e1689-5d8d-45db-8c64-f0f18210742b')
