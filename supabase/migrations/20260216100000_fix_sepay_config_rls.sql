-- Fix: Re-add RLS policy for reading payee's sepay_config
-- The previous "Users can view payee sepay config" was dropped in fix_sepay_rls_recursion.
-- The existing "Users can view payee settings in their expense splits" policy
-- only covers split participants, not the expense payer directly.
-- This new policy allows any authenticated user to read sepay_config
-- of users they share expenses with (as payer or participant).

DROP POLICY IF EXISTS "Users can view payee sepay config for payment" ON user_settings;

CREATE POLICY "Users can view payee sepay config for payment"
  ON user_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM expenses e
      WHERE (
        -- Current user has a split in an expense paid by this user
        e.paid_by_user_id = user_settings.user_id
        AND EXISTS (
          SELECT 1 FROM expense_splits es
          WHERE es.expense_id = e.id
            AND es.user_id = auth.uid()
            AND es.is_settled = false
        )
      )
    )
  );

COMMENT ON POLICY "Users can view payee sepay config for payment" ON user_settings
  IS 'Allows users to read settings of payees they owe money to (unsettled splits)';
