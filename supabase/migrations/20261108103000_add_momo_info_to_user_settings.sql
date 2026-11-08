-- Migration: Per-user MoMo receive settings (manual QR; no auto-confirm)
-- Date: 2026-11-08

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS momo_info JSONB;

COMMENT ON COLUMN user_settings.momo_info IS
  'MoMo wallet for receiving payments (JSONB): { accountName, phone, qrCodeImageUrl }';

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-settings', 'payment-settings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view payment settings images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'payment-settings');

CREATE POLICY "Users can upload own payment settings images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-settings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own payment settings images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-settings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'payment-settings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own payment settings images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-settings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
