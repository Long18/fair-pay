-- Rollback: 026_revise_user_settings.sql
-- Restores theme and date_format columns, removes new columns

BEGIN;

-- ========================================
-- Part 1: Restore Removed Columns
-- ========================================

-- Restore theme column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system'
CHECK (theme IN ('light', 'dark', 'system'));

-- Restore date_format column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY';

-- ========================================
-- Part 2: Remove New Columns
-- ========================================

ALTER TABLE user_settings DROP COLUMN IF EXISTS preferred_language;
ALTER TABLE user_settings DROP COLUMN IF EXISTS timezone;

-- ========================================
-- Part 3: Restore Original Indexes
-- ========================================

-- Restore theme index
CREATE INDEX IF NOT EXISTS idx_user_settings_theme
  ON user_settings(theme);

-- Remove language index
DROP INDEX IF EXISTS idx_user_settings_language;

-- ========================================
-- Part 4: Drop New Functions
-- ========================================

DROP FUNCTION IF EXISTS get_user_settings(UUID);
DROP FUNCTION IF EXISTS should_send_notification(UUID, TEXT);

-- ========================================
-- Part 5: Restore Original Notification Functions
-- ========================================

-- Restore simple notification function without settings check
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_payment_recorded()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the person receiving the payment
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Part 6: Restore Original Comments
-- ========================================

COMMENT ON TABLE user_settings IS
  'User preferences and settings';

COMMENT ON COLUMN user_settings.theme IS
  'UI theme preference: light, dark, or system';

COMMENT ON COLUMN user_settings.date_format IS
  'Preferred date format for display (e.g., DD/MM/YYYY)';

COMMIT;

-- Note: After rollback:
-- - Theme and date_format are back in the database
-- - preferred_language and timezone are removed
-- - Notifications are sent to all users regardless of preferences
-- - Frontend localStorage approach is no longer needed
