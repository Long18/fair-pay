-- Migration: Attachments for expense receipts
-- Description: Add support for uploading and storing receipt images/files
-- Dependencies: 004_expenses.sql

-- Create attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Create indexes for performance
CREATE INDEX idx_attachments_expense_id ON public.attachments(expense_id);
CREATE INDEX idx_attachments_created_by ON public.attachments(created_by);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments

-- SELECT: Users can view attachments for expenses they can see
CREATE POLICY "Users can view attachments for their expenses"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = attachments.expense_id
      AND (
        -- Group expense: user is member
        (e.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = e.group_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Friend expense: user is involved
        (e.friendship_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.id = e.friendship_id
          AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
        ))
      )
    )
  );

-- INSERT: Users can add attachments to expenses they can see
CREATE POLICY "Users can add attachments to their expenses"
  ON public.attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = attachments.expense_id
      AND (
        -- Group expense: user is member
        (e.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = e.group_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Friend expense: user is involved
        (e.friendship_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.id = e.friendship_id
          AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
        ))
      )
    )
  );

-- DELETE: Only creator or expense creator can delete attachments
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = attachments.expense_id
      AND e.created_by = auth.uid()
    )
  );

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,  -- Not public, requires authentication
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for receipts bucket

-- SELECT: Users can view receipts for expenses they can see
DROP POLICY IF EXISTS "Users can view receipts for their expenses" ON storage.objects;
CREATE POLICY "Users can view receipts for their expenses"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      -- Check if user has access to the expense
      EXISTS (
        SELECT 1 FROM public.attachments a
        JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.storage_path = storage.objects.name
        AND (
          -- Group expense: user is member
          (e.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = e.group_id
            AND gm.user_id = auth.uid()
          ))
          OR
          -- Friend expense: user is involved
          (e.friendship_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.id = e.friendship_id
            AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
          ))
        )
      )
    )
  );

-- INSERT: Authenticated users can upload files
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text  -- Files must be in user's folder
  );

-- DELETE: Users can delete their own uploads
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
CREATE POLICY "Users can delete their own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Comments for documentation
COMMENT ON TABLE public.attachments IS 'Stores metadata for expense receipt attachments';
COMMENT ON COLUMN public.attachments.storage_path IS 'Path to file in Supabase Storage (receipts bucket)';
COMMENT ON COLUMN public.attachments.file_size IS 'File size in bytes';
