-- =============================================
-- Add actor_id to notifications table
--
-- Purpose: Store the user who triggered the notification
-- so the frontend can display their avatar and name.
-- Existing notifications will have NULL actor_id (handled gracefully in UI).
-- =============================================

-- 1. Add actor_id column
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create index for actor lookups
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);

-- 3. Update notify_expense_added to include actor_id
CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_expense RECORD;
  v_creator_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id, e.description, e.amount, e.currency, e.created_by, e.is_payment
  INTO v_expense
  FROM expenses e
  WHERE e.id = NEW.expense_id;

  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_expense.is_payment THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  IF NOT should_send_notification(NEW.user_id, 'expense_added') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = v_expense.created_by;

  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    link,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    v_expense.created_by,
    'expense_added',
    'New Expense Added',
    COALESCE(v_creator_name, 'Someone') || ' added "' || v_expense.description || '" - ' ||
      to_char(v_expense.amount, 'FM999,999,999') || ' ' || v_expense.currency ||
      '. You owe ' || to_char(NEW.computed_amount, 'FM999,999,999') || ' ' || v_expense.currency,
    '/expenses/show/' || v_expense.id::text,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$fn$;

ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";
