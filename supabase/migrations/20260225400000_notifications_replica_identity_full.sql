-- =============================================
-- Set REPLICA IDENTITY FULL on notifications table
-- 
-- Required for Supabase Realtime postgres_changes to work with
-- row-level filters (e.g., filter: `user_id=eq.xxx`).
-- Without FULL, Realtime only receives primary key columns,
-- so the user_id filter never matches and events are silently dropped.
-- =============================================

ALTER TABLE notifications REPLICA IDENTITY FULL;
