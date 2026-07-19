-- Content moderation queue (MVP) + soft ban flag on profiles.

-- ---------------------------------------------------------------------------
-- Soft ban flag (auth.users.banned_until remains the hard auth ban path)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_banned IS
  'Soft moderation ban flag. Does not revoke auth session by itself.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned
  ON public.profiles (is_banned)
  WHERE is_banned = true;

-- ---------------------------------------------------------------------------
-- content_reports
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'group')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  CONSTRAINT content_reports_reason_not_blank CHECK (length(btrim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON public.content_reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON public.content_reports (reporter_id, created_at DESC);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reports_select_own_or_staff
  ON public.content_reports;
CREATE POLICY content_reports_select_own_or_staff
  ON public.content_reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS content_reports_insert_own
  ON public.content_reports;
CREATE POLICY content_reports_insert_own
  ON public.content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS content_reports_update_staff
  ON public.content_reports;
CREATE POLICY content_reports_update_staff
  ON public.content_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

REVOKE ALL ON public.content_reports FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT UPDATE ON public.content_reports TO authenticated;

-- ---------------------------------------------------------------------------
-- Staff RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_content_reports(
  p_status TEXT DEFAULT 'open',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := COALESCE(NULLIF(btrim(p_status), ''), 'open');
  v_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STAFF_REQUIRED';
  END IF;

  IF v_status NOT IN ('open', 'resolved', 'dismissed', 'all') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STATUS';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.content_reports cr
  WHERE v_status = 'all' OR cr.status = v_status;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'reporter_id', cr.reporter_id,
      'reporter_name', rp.full_name,
      'reporter_email', rp.email,
      'target_type', cr.target_type,
      'target_id', cr.target_id,
      'target_label', CASE
        WHEN cr.target_type = 'user' THEN COALESCE(tp.full_name, tp.email, cr.target_id::text)
        WHEN cr.target_type = 'group' THEN COALESCE(g.name, cr.target_id::text)
        ELSE cr.target_id::text
      END,
      'target_banned', CASE
        WHEN cr.target_type = 'user' THEN COALESCE(tp.is_banned, false)
        ELSE false
      END,
      'reason', cr.reason,
      'status', cr.status,
      'created_at', cr.created_at,
      'resolved_by', cr.resolved_by,
      'resolver_name', rv.full_name,
      'notes', cr.notes
    ) AS row_data,
    cr.created_at
    FROM public.content_reports cr
    LEFT JOIN public.profiles rp ON rp.id = cr.reporter_id
    LEFT JOIN public.profiles tp
      ON cr.target_type = 'user' AND tp.id = cr.target_id
    LEFT JOIN public.groups g
      ON cr.target_type = 'group' AND g.id = cr.target_id
    LEFT JOIN public.profiles rv ON rv.id = cr.resolved_by
    WHERE v_status = 'all' OR cr.status = v_status
    ORDER BY cr.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) q;

  RETURN jsonb_build_object(
    'data', v_rows,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_action_content_report(
  p_report_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL,
  p_ban_target BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action TEXT := lower(btrim(COALESCE(p_action, '')));
  v_report public.content_reports%ROWTYPE;
  v_new_status TEXT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STAFF_REQUIRED';
  END IF;

  IF v_action NOT IN ('resolve', 'dismiss') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ACTION';
  END IF;

  SELECT * INTO v_report
  FROM public.content_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'REPORT_NOT_FOUND';
  END IF;

  IF v_report.status <> 'open' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'REPORT_NOT_OPEN';
  END IF;

  v_new_status := CASE WHEN v_action = 'resolve' THEN 'resolved' ELSE 'dismissed' END;

  UPDATE public.content_reports
  SET
    status = v_new_status,
    resolved_by = auth.uid(),
    notes = NULLIF(btrim(COALESCE(p_notes, '')), '')
  WHERE id = p_report_id;

  -- Soft ban only when resolving a user report and staff opts in.
  IF v_action = 'resolve'
     AND COALESCE(p_ban_target, false)
     AND v_report.target_type = 'user' THEN
    UPDATE public.profiles
    SET is_banned = true, updated_at = now()
    WHERE id = v_report.target_id;
  END IF;

  RETURN jsonb_build_object(
    'id', p_report_id,
    'status', v_new_status,
    'banned', COALESCE(p_ban_target, false) AND v_report.target_type = 'user' AND v_action = 'resolve'
  );
END;
$$;

COMMENT ON FUNCTION public.admin_list_content_reports(TEXT, INTEGER, INTEGER) IS
  'Staff-only list of content reports for the moderation queue.';
COMMENT ON FUNCTION public.admin_action_content_report(UUID, TEXT, TEXT, BOOLEAN) IS
  'Staff-only resolve/dismiss for open content reports; optional soft ban on user targets.';

REVOKE ALL ON FUNCTION public.admin_list_content_reports(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_action_content_report(UUID, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_content_reports(TEXT, INTEGER, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_action_content_report(UUID, TEXT, TEXT, BOOLEAN)
  TO authenticated;
