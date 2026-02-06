-- Fix notify_expense_added() to handle NULL user_id and correct schema mismatch
--
-- Root Causes Fixed:
-- 1. Function tried to INSERT NULL user_id when splits had pending_email participants
-- 2. Function used wrong column names: reference_id, reference_type instead of link
-- 3. Function incorrectly used NEW.id (expense_splits id) instead of NEW.expense_id
--
-- Changes:
-- - Add user_id IS NOT NULL check to skip pending email participants
-- - Replace reference_id/reference_type with link column
-- - Fetch expense details to get proper expense_id and created_by
-- - Recreate trigger to ensure it exists in production

CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_participant_id UUID;
  v_expense RECORD;
BEGIN
  -- Get expense details for notification
  -- NEW is expense_splits row, so we need to fetch the expense record
  SELECT id, description, created_by
  INTO v_expense
  FROM expenses
  WHERE id = NEW.expense_id;

  -- If expense not found, skip notification (shouldn't happen)
  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify all participants except the creator
  -- Skip NULL user_id (pending email participants who don't have accounts yet)
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.expense_id
      AND user_id IS NOT NULL              -- KEY FIX: Skip pending participants
      AND user_id != v_expense.created_by  -- Skip creator (don't notify about own expense)
  LOOP
    -- Only create notification if user has enabled this notification type
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,                               -- Use 'link' column (not reference_id/reference_type)
        is_read,
        created_at
      ) VALUES (
        v_participant_id,
        'expense_added',
        'New Expense Added',
        'A new expense "' || v_expense.description || '" was added',
        '/expenses/show/' || v_expense.id::text,  -- Proper link format
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update function ownership
ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";

-- Update function comment to reflect new behavior
COMMENT ON FUNCTION "public"."notify_expense_added"()
IS 'Trigger function to notify group members when expense is added. Skips pending email participants and expense creator.';

-- Ensure trigger is properly created (recreate if exists)
-- This handles cases where trigger might be missing from production
DROP TRIGGER IF EXISTS "trigger_notify_expense_added" ON "public"."expense_splits";

CREATE TRIGGER "trigger_notify_expense_added"
  AFTER INSERT ON "public"."expense_splits"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."notify_expense_added"();

-- Grant necessary permissions for RLS and security
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";
