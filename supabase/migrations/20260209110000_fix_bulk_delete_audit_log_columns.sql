-- Fix bulk_delete_expenses: audit_logs column names mismatch
-- The function used 'operation' and 'changed_fields' but the table has 'action' and 'old_data'

CREATE OR REPLACE FUNCTION bulk_delete_expenses(p_expense_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_expense RECORD;
  v_can_delete BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Validate expense limit (max 50 at a time)
  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  -- Check permissions for each expense (skip if system admin)
  IF NOT v_is_system_admin THEN
    FOR v_expense IN
      SELECT e.*, gm.role as user_role
      FROM expenses e
      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id
      WHERE e.id = ANY(p_expense_ids)
    LOOP
      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');

      IF NOT v_can_delete THEN
        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;
      END IF;
    END LOOP;
  END IF;

  -- Log each deletion to audit_logs (using correct column names)
  INSERT INTO audit_logs (
    user_id,
    table_name,
    action,
    record_id,
    old_data
  )
  SELECT
    v_user_id,
    'expenses',
    'DELETE',
    e.id,
    jsonb_build_object(
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'friendship_id', e.friendship_id,
      'deleted_by_admin', v_is_system_admin
    )
  FROM expenses e
  WHERE e.id = ANY(p_expense_ids);

  -- Delete expense splits first
  DELETE FROM expense_splits
  WHERE expense_id = ANY(p_expense_ids);

  -- Delete expenses
  DELETE FROM expenses
  WHERE id = ANY(p_expense_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Deleted %s expense(s)', v_deleted_count)
  );
END;
$$;
