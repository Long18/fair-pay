-- Create user_journey_events table
--
-- Queried by AdminMarketing, AdminGrowth, AdminRetention admin pages for
-- share activity (share_*) and page-view streak analysis.
-- The table was referenced in frontend code but never had a migration.

CREATE TABLE IF NOT EXISTS public.user_journey_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  TEXT,
  event_type  TEXT        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_journey_events_user_id_idx
  ON public.user_journey_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_journey_events_event_type_idx
  ON public.user_journey_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS user_journey_events_created_at_idx
  ON public.user_journey_events (created_at DESC);

-- Full-text search on event_type (needed by .like("event_type", "share_%") queries)
CREATE INDEX IF NOT EXISTS user_journey_events_event_type_text_idx
  ON public.user_journey_events (event_type text_pattern_ops);

ALTER TABLE public.user_journey_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all events
DROP POLICY IF EXISTS "Admins can read journey events" ON public.user_journey_events;
CREATE POLICY "Admins can read journey events"
  ON public.user_journey_events
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Authenticated users can insert their own events
DROP POLICY IF EXISTS "Users can insert own journey events" ON public.user_journey_events;
CREATE POLICY "Users can insert own journey events"
  ON public.user_journey_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

COMMENT ON TABLE public.user_journey_events IS
  'Tracks user journey events (page views, share actions, etc.) for admin analytics.';
COMMENT ON COLUMN public.user_journey_events.event_type IS
  'Event name — e.g. page_view, share_zalo, share_facebook, share_copy, share_download';
COMMENT ON COLUMN public.user_journey_events.session_id IS
  'Anonymous session identifier for pre-auth tracking';
COMMENT ON COLUMN public.user_journey_events.metadata IS
  'Optional extra context (page path, referrer, etc.)';
