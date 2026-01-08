-- Fix infinite recursion in RLS policies for momo_settings and momo_webhook_logs
-- The policies were directly querying user_roles table, which caused infinite recursion
-- Solution: Use is_admin() function which is SECURITY DEFINER and bypasses RLS

DO $$
BEGIN
  -- Fix momo_settings update policy (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_settings') THEN
    DROP POLICY IF EXISTS "momo_settings_update_policy" ON momo_settings;
    CREATE POLICY "momo_settings_update_policy" ON momo_settings
        FOR UPDATE TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin());

    -- Add INSERT policy for admins (needed when no settings exist)
    DROP POLICY IF EXISTS "momo_settings_insert_policy" ON momo_settings;
    CREATE POLICY "momo_settings_insert_policy" ON momo_settings
        FOR INSERT TO authenticated
        WITH CHECK (is_admin());
  END IF;

  -- Fix momo_webhook_logs admin-only policy (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_webhook_logs') THEN
    DROP POLICY IF EXISTS "momo_webhook_logs_admin_only" ON momo_webhook_logs;
    CREATE POLICY "momo_webhook_logs_admin_only" ON momo_webhook_logs
        FOR ALL TO authenticated
        USING (is_admin());
  END IF;
END $$;
