-- Create storage bucket for expense receipts and bills
-- This bucket should have been created in the initial schema but was missing

-- Create the receipts bucket with public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts

-- Policy: Public can view receipts (for shared expense viewing)
CREATE POLICY "Public can view receipts"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'receipts');

-- Policy: Authenticated users can upload receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

-- Policy: Users can update their own uploaded receipts
CREATE POLICY "Users can update their own receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own uploaded receipts
CREATE POLICY "Users can delete their own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
