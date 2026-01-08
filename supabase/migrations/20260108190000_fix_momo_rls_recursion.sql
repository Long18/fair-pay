-- Fix infinite recursion in MoMo settings RLS policies
-- The policies were directly querying user_roles which has its own RLS policy,
-- causing infinite recursion. Use is_admin() function instead which is SECURITY DEFINER
-- and can bypass RLS.

BEGIN;

-- Only apply fixes if tables exist
DO $$
BEGIN
  -- Fix momo_settings update policy (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_settings') THEN
    DROP POLICY IF EXISTS "momo_settings_update_policy" ON momo_settings;
    CREATE POLICY "momo_settings_update_policy" ON momo_settings
        FOR UPDATE TO authenticated
        USING (is_admin());
  END IF;

  -- Fix momo_webhook_logs admin-only policy (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_webhook_logs') THEN
    DROP POLICY IF EXISTS "momo_webhook_logs_admin_only" ON momo_webhook_logs;
    CREATE POLICY "momo_webhook_logs_admin_only" ON momo_webhook_logs
        FOR ALL TO authenticated
        USING (is_admin());
  END IF;
END $$;

COMMIT;
