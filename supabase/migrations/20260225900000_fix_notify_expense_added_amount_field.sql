-- =============================================
-- Fix: notify_expense_added() references NEW.amount which doesn't exist
-- on expense_splits table. The column is called computed_amount.
-- The COALESCE(NEW.computed_amount, NEW.amount) fallback causes:
--   "record 'new' has no field 'amount'"
-- Fix: Use NEW.computed_amount directly.
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
