-- =============================================
-- Fix duplicate notifications on expense creation
--
-- Problem: notify_expense_added() fires FOR EACH ROW on expense_splits INSERT.
-- Inside the function, it loops through ALL splits and notifies ALL participants.
-- When an expense has N splits, the trigger fires N times, each time notifying
-- all N-1 non-creator participants → each participant gets N duplicate notifications.
-- This flood of rapid INSERTs also kills the Supabase Realtime subscription
-- (client only receives the first event, subsequent ones are lost).
--
-- Fix: Instead of looping through all splits, only notify NEW.user_id
-- (the user of the current split row being inserted). Each split INSERT
-- triggers exactly one notification for that split's user.
-- =============================================

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
  -- Skip if this split has no user (pending email participant)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get expense details
  SELECT e.id, e.description, e.amount, e.currency, e.created_by, e.is_payment
  INTO v_expense
  FROM expenses e
  WHERE e.id = NEW.expense_id;

  -- If expense not found, skip
  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip notifications for settlement payments
  IF v_expense.is_payment THEN
    RETURN NEW;
  END IF;

  -- Skip if this split belongs to the creator (don't notify about own expense)
  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  -- Check notification preferences
  IF NOT should_send_notification(NEW.user_id, 'expense_added') THEN
    RETURN NEW;
  END IF;

  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = v_expense.created_by;

  -- Insert exactly ONE notification for this split's user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
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
