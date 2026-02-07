-- Add missing notifications_enabled master toggle to user_settings
--
-- Root Cause: should_send_notification() function references notifications_enabled
-- column on user_settings, but the column was never added to the table.
-- This causes expense_splits INSERT to fail when the notify_expense_added
-- trigger fires and calls should_send_notification().
--
-- Fix: Add the column with DEFAULT true so existing users retain notifications.

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN user_settings.notifications_enabled
IS 'Master toggle for all notifications. When false, no notifications are sent regardless of individual settings.';
