-- =============================================
-- Add notifications table to Supabase Realtime publication
-- This enables real-time push of new notifications to connected clients
-- =============================================

DO $$
BEGIN
  -- Check if notifications is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
