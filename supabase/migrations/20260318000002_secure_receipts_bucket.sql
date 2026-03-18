-- Make receipts bucket private (no public access)
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- Remove the public viewing policy for receipts
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;

-- Ensure authenticated users can still view receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Authenticated users can view receipts'
  ) THEN
    CREATE POLICY "Authenticated users can view receipts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'receipts');
  END IF;
END $$;

-- Set allowed MIME types and max file size on receipts bucket
-- This enforces server-side validation regardless of client-side checks
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
],
file_size_limit = 5242880  -- 5MB in bytes
WHERE id = 'receipts';
