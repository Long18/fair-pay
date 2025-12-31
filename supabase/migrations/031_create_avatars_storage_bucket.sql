-- Migration: Create avatars storage bucket
-- Description: Creates a dedicated storage bucket for user profile avatars
-- Date: 2025-01-01

-- Create the avatars bucket with public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- No need to run ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all avatars" ON storage.objects;

-- Policy: Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access to all avatars
CREATE POLICY "Public can view all avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Note: Permissions on storage.objects are already configured by Supabase
-- No need to manually GRANT permissions
