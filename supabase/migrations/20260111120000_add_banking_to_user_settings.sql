-- Migration: Add banking payment fields to user_settings
-- Date: 2026-01-11
-- Purpose: Enable users to configure their banking information for receiving payments

-- Add bank_info column (JSONB) to store banking details
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS bank_info JSONB;

-- Add qr_code_image_url column (TEXT) to store QR code image URL
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS qr_code_image_url TEXT;

-- Add RLS policy to allow users to view payee settings in their expense splits
-- This enables payment dialogs to display the payee's banking information
CREATE POLICY "Users can view payee settings in their expense splits"
  ON user_settings FOR SELECT
  TO authenticated
  USING (
    -- Users can view settings for payees in their expense splits
    user_id IN (
      SELECT es.user_id
      FROM expense_splits es
      INNER JOIN expenses e ON e.id = es.expense_id
      WHERE 
        -- User is involved in the expense (either as payer or split participant)
        (e.paid_by_user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM expense_splits es2 
           WHERE es2.expense_id = e.id AND es2.user_id = auth.uid()
         ))
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN user_settings.bank_info IS 'Banking information for receiving payments (JSONB): {app, account, bank, accountName}';
COMMENT ON COLUMN user_settings.qr_code_image_url IS 'URL to QR code image for banking payments';
COMMENT ON POLICY "Users can view payee settings in their expense splits" ON user_settings IS 'Allows users to view banking settings of payees in their expense splits for payment dialogs';
