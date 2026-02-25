-- =============================================
-- Fix notify_expense_added() RLS issue for normal users
--
-- Problem: When a normal user creates an expense, the trigger
-- notify_expense_added() fires and tries to INSERT INTO notifications
-- for OTHER users (participants). RLS on notifications only allows
-- user_id = auth.uid(), so the insert fails with:
-- "query would be affected by row-level security policy for table notifications"
--
-- Fix: Add SECURITY DEFINER so the function runs as the owner (postgres),
-- bypassing RLS. This is the same pattern used by notify_friend_request().
-- Also add SET search_path for security best practice.
-- =============================================

CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_participant RECORD;
  v_expense RECORD;
  v_creator_name TEXT;
BEGIN
  -- Get expense details including amount, currency, creator
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

  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = v_expense.created_by;

  -- Notify all participants except the creator
  FOR v_participant IN
    SELECT es.user_id, es.computed_amount
    FROM expense_splits es
    WHERE es.expense_id = NEW.expense_id
      AND es.user_id IS NOT NULL
      AND es.user_id != v_expense.created_by
  LOOP
    IF should_send_notification(v_participant.user_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        is_read,
        created_at
      ) VALUES (
        v_participant.user_id,
        'expense_added',
        'New Expense Added',
        COALESCE(v_creator_name, 'Someone') || ' added "' || v_expense.description || '" - ' ||
          to_char(v_expense.amount, 'FM999,999,999') || ' ' || v_expense.currency ||
          '. You owe ' || to_char(v_participant.computed_amount, 'FM999,999,999') || ' ' || v_expense.currency,
        '/expenses/show/' || v_expense.id::text,
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$fn$;

ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";
