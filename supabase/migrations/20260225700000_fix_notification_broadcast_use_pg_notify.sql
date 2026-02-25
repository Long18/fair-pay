-- =============================================
-- Fix: Drop broken broadcast_notification trigger that uses realtime.send()
-- which doesn't exist on this Supabase instance.
--
-- Replace with pg_notify approach: use NOTIFY/LISTEN via Supabase Realtime
-- postgres_changes on a lightweight "notification_events" signal.
--
-- Actually, the simplest fix: just drop the broken trigger entirely.
-- The client will use postgres_changes (which works with REPLICA IDENTITY FULL
-- already applied) as the realtime mechanism.
-- =============================================

-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS trigger_broadcast_notification ON notifications;
DROP FUNCTION IF EXISTS broadcast_notification();
