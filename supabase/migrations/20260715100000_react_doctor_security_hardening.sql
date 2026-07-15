-- React Doctor security hardening (2026-07-15)
-- 1. Enable RLS on app_build_counters (service_role / SECURITY DEFINER only).
-- 2. Tighten audit_logs INSERT so authenticated clients cannot forge rows.
-- 3. Constrain group_members.role on INSERT and default new rows to 'member'.

-- ---------------------------------------------------------------------------
-- app_build_counters: table had grants revoked but never enabled RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_build_counters ENABLE ROW LEVEL SECURITY;

-- No client policies: only service_role / postgres and SECURITY DEFINER RPCs
-- (allocate_app_build_version) should touch this table.

-- ---------------------------------------------------------------------------
-- audit_logs: INSERT WITH CHECK (true) allowed any authenticated forge
-- Triggers that write audit rows are SECURITY DEFINER and bypass RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "No direct client inserts on audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- group_members: creators could previously insert role = 'admin'
-- ---------------------------------------------------------------------------
ALTER TABLE public.group_members
  ALTER COLUMN role SET DEFAULT 'member';

DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;

CREATE POLICY "Group creators can add members"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      group_id IN (
        SELECT groups.id
        FROM public.groups
        WHERE groups.created_by = auth.uid()
      )
      AND role = 'member'
    )
    OR public.is_admin()
  );
