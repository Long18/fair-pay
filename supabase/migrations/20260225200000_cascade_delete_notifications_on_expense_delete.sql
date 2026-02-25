-- =============================================
-- Cascade delete notifications when an expense is deleted
--
-- Problem:
--   notifications table has no FK to expenses, so when an expense
--   is deleted (hard delete via bulk_delete_expenses), related
--   notifications (comments, mentions, reactions) become orphaned.
--
-- Solution:
--   BEFORE DELETE trigger on expenses that removes all notifications
--   whose link matches '/expenses/show/{expense_id}'.
-- =============================================

CREATE OR REPLACE FUNCTION delete_expense_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM notifications
  WHERE link LIKE '/expenses/show/' || OLD.id::text || '%';

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_expense_notifications ON expenses;
CREATE TRIGGER trigger_delete_expense_notifications
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION delete_expense_notifications();
