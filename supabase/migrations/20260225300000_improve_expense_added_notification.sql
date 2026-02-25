-- =============================================
-- Improve notify_expense_added() to include detailed information
--
-- Current: "A new expense "Lunch" was added"
-- New:     "Long Le added "Lunch" - 500,000 VND. You owe 125,000 VND"
--
-- Changes:
-- - Include creator name
-- - Include expense amount + currency
-- - Include how much the participant owes (from computed_amount)
-- =============================================

CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
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

COMMENT ON FUNCTION "public"."notify_expense_added"()
IS 'Notify participants when expense is added. Includes creator name, amount, and individual owed amount. Skips settlement payments.';

-- Ensure trigger exists
DROP TRIGGER IF EXISTS "trigger_notify_expense_added" ON "public"."expense_splits";

CREATE TRIGGER "trigger_notify_expense_added"
  AFTER INSERT ON "public"."expense_splits"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."notify_expense_added"();

GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";
