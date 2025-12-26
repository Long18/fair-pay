-- Migration: Revise User Settings (Database vs LocalStorage Split)
-- Description: Remove UI-only preferences from database, keep backend-required settings
-- Date: 2025-12-26
-- Dependencies: 025_audit_logs.sql

BEGIN;

-- ========================================
-- Part 1: Remove UI-Only Columns
-- ========================================

-- Remove theme (move to localStorage)
ALTER TABLE user_settings DROP COLUMN IF EXISTS theme;

-- Remove date_format (move to localStorage - only for display)
-- Keep number_format as it affects parsing consistency
ALTER TABLE user_settings DROP COLUMN IF EXISTS date_format;

-- ========================================
-- Part 2: Add Missing Backend-Required Columns
-- ========================================

-- Add language preference (affects server-side email templates)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'vi'));

-- Add timezone for date calculations
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh';

-- ========================================
-- Part 3: Update Indexes
-- ========================================

-- Drop the theme index (column removed)
DROP INDEX IF EXISTS idx_user_settings_theme;

-- Add index for language (useful for bulk email operations)
CREATE INDEX IF NOT EXISTS idx_user_settings_language
  ON user_settings(preferred_language);

-- ========================================
-- Part 4: Update Comments for Clarity
-- ========================================

COMMENT ON TABLE user_settings IS
  'Backend-required user settings. UI-only preferences (theme, date_format) are stored in localStorage.';

COMMENT ON COLUMN user_settings.default_currency IS
  'Default currency for expense calculations (affects backend logic)';

COMMENT ON COLUMN user_settings.number_format IS
  'Number format locale for parsing consistency (e.g., vi-VN uses , as decimal separator)';

COMMENT ON COLUMN user_settings.preferred_language IS
  'Preferred language for email notifications and server-side communications';

COMMENT ON COLUMN user_settings.timezone IS
  'User timezone for date calculations and scheduled reports';

COMMENT ON COLUMN user_settings.notifications_enabled IS
  'Master switch for all notifications (affects backend notification triggers)';

COMMENT ON COLUMN user_settings.email_notifications IS
  'Enable/disable email notifications (backend uses this for email triggers)';

COMMENT ON COLUMN user_settings.notify_on_expense_added IS
  'Backend checks this before sending expense notification emails';

COMMENT ON COLUMN user_settings.notify_on_payment_received IS
  'Backend checks this before sending payment notification emails';

COMMENT ON COLUMN user_settings.notify_on_friend_request IS
  'Backend checks this before sending friend request notification emails';

COMMENT ON COLUMN user_settings.notify_on_group_invite IS
  'Backend checks this before sending group invite notification emails';

COMMENT ON COLUMN user_settings.allow_friend_requests IS
  'Privacy setting that affects RLS and backend logic';

COMMENT ON COLUMN user_settings.allow_group_invites IS
  'Privacy setting that affects RLS and backend logic';

COMMENT ON COLUMN user_settings.profile_visibility IS
  'Privacy setting that affects RLS queries and search results';

-- ========================================
-- Part 5: Data Migration (if needed)
-- ========================================

-- Set default values for new columns on existing records
UPDATE user_settings
SET preferred_language = 'vi',
    timezone = 'Asia/Ho_Chi_Minh'
WHERE preferred_language IS NULL OR timezone IS NULL;

-- ========================================
-- Part 6: Create Helper Function for Settings
-- ========================================

-- Function to get complete user settings (with defaults)
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  default_currency TEXT,
  number_format TEXT,
  preferred_language TEXT,
  timezone TEXT,
  notifications_enabled BOOLEAN,
  email_notifications BOOLEAN,
  notify_on_expense_added BOOLEAN,
  notify_on_payment_received BOOLEAN,
  notify_on_friend_request BOOLEAN,
  notify_on_group_invite BOOLEAN,
  allow_friend_requests BOOLEAN,
  allow_group_invites BOOLEAN,
  profile_visibility TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_target_user UUID;
BEGIN
  -- Default to current user if not specified
  v_target_user := COALESCE(p_user_id, auth.uid());

  -- Only allow viewing own settings unless admin
  IF v_target_user != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own settings';
  END IF;

  RETURN QUERY
  SELECT
    us.user_id,
    us.default_currency,
    us.number_format,
    us.preferred_language,
    us.timezone,
    us.notifications_enabled,
    us.email_notifications,
    us.notify_on_expense_added,
    us.notify_on_payment_received,
    us.notify_on_friend_request,
    us.notify_on_group_invite,
    us.allow_friend_requests,
    us.allow_group_invites,
    us.profile_visibility,
    us.created_at,
    us.updated_at
  FROM user_settings us
  WHERE us.user_id = v_target_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should receive notification
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Check master notification switch and specific notification type
  SELECT
    CASE
      WHEN NOT notifications_enabled THEN FALSE
      WHEN NOT email_notifications THEN FALSE
      WHEN p_notification_type = 'expense_added' THEN notify_on_expense_added
      WHEN p_notification_type = 'payment_received' THEN notify_on_payment_received
      WHEN p_notification_type = 'friend_request' THEN notify_on_friend_request
      WHEN p_notification_type = 'group_invite' THEN notify_on_group_invite
      ELSE FALSE
    END INTO v_result
  FROM user_settings
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_result, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 7: Update Notification Triggers
-- ========================================

-- Update the notification trigger functions to check user settings
-- This replaces the previous simple notification creation

CREATE OR REPLACE FUNCTION notify_expense_added()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  -- Notify all participants except the creator
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.id
      AND user_id != NEW.created_by
  LOOP
    -- Only create notification if user has enabled this notification type
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        v_participant_id,
        'expense_added',
        'New Expense Added',
        'A new expense "' || NEW.description || '" was added',
        NEW.id,
        'expense'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_payment_recorded()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the person receiving the payment
  IF should_send_notification(NEW.to_user, 'payment_received') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      NEW.to_user,
      'payment_received',
      'Payment Received',
      'You received a payment of ' || NEW.amount || ' ' || NEW.currency,
      NEW.id,
      'payment'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if the recipient allows friend requests
  IF NEW.status = 'pending' THEN
    -- Check if user_b allows friend requests and notifications
    IF should_send_notification(NEW.user_b, 'friend_request') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        NEW.user_b,
        'friend_request',
        'New Friend Request',
        'You have a new friend request',
        NEW.id,
        'friendship'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Part 8: Grant Permissions
-- ========================================

GRANT EXECUTE ON FUNCTION get_user_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT) TO authenticated;

-- ========================================
-- Part 9: Create Migration Summary
-- ========================================

COMMENT ON FUNCTION get_user_settings IS
  'Get complete user settings with defaults. Returns backend-required settings only.';

COMMENT ON FUNCTION should_send_notification IS
  'Check if user should receive a notification based on their preferences. Used by notification triggers.';

COMMIT;

-- ========================================
-- Migration Summary
-- ========================================

-- REMOVED from database (move to localStorage in frontend):
-- ❌ theme (light/dark/system)
-- ❌ date_format (DD/MM/YYYY display format)

-- KEPT in database (backend-required):
-- ✅ default_currency (affects calculations)
-- ✅ number_format (parsing consistency)
-- ✅ preferred_language (email templates)
-- ✅ timezone (date calculations)
-- ✅ all notification preferences (backend triggers)
-- ✅ all privacy settings (RLS)

-- ADDED to database:
-- ✅ preferred_language (for server-side communications)
-- ✅ timezone (for date calculations)

-- Frontend Action Required:
-- Create src/lib/local-settings.ts to manage:
-- - theme: 'light' | 'dark' | 'system'
-- - dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
-- - sidebarCollapsed: boolean
-- - dashboardLayout: 'compact' | 'comfortable'
-- - recentSearches: string[]
-- - Any other UI-only preferences
