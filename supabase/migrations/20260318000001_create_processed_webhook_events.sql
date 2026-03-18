-- Create processed_webhook_events table for webhook idempotency
-- Prevents duplicate processing of the same webhook event
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(provider, external_id)
);

-- Enable RLS (only service role should access this table)
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — only service_role key bypasses RLS
-- This ensures the table is only accessible from server-side webhook handlers

-- Index for fast lookups
CREATE INDEX idx_processed_webhook_events_provider_external_id
ON public.processed_webhook_events(provider, external_id);

-- Grant to service_role only (already implicit, but explicit for clarity)
GRANT ALL ON public.processed_webhook_events TO service_role;
