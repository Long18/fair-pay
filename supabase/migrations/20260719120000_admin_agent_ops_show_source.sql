-- Agent Ops observability: surface which agent sent each activity.
--
-- 1. admin_list_agent_operations — include metadata.source (safe scalar).
-- 2. admin_list_external_agent_submissions — admin list of ChatGPT / external
--    proposals (source is a first-class column; never expose IP hashes).
-- 3. admin_get_external_agent_submission_metrics — lightweight counts.

CREATE INDEX IF NOT EXISTS idx_external_agent_submissions_status_created
  ON public.external_agent_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_agent_submissions_source_created
  ON public.external_agent_submissions (source, created_at DESC);

-- ---------------------------------------------------------------------------
-- Internal agent operations: expose source from metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_agent_operations(
  p_status    TEXT        DEFAULT NULL,
  p_user_id   UUID        DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to   TIMESTAMPTZ DEFAULT NULL,
  p_search    TEXT        DEFAULT NULL,
  p_limit     INTEGER     DEFAULT 20,
  p_offset    INTEGER     DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_limit  INTEGER;
  v_offset INTEGER;
  v_search TEXT;
  v_search_pattern TEXT;
  v_status TEXT;
  v_total  BIGINT;
  v_rows   JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  v_limit  := LEAST(GREATEST(COALESCE(p_limit,  20), 1), 100);
  v_offset := LEAST(GREATEST(COALESCE(p_offset, 0), 0), 100000);
  v_search := NULLIF(LEFT(BTRIM(p_search), 100), '');
  v_search_pattern := CASE WHEN v_search IS NULL THEN NULL ELSE
    '%' || REPLACE(REPLACE(REPLACE(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  END;
  v_status := NULLIF(BTRIM(p_status), '');

  IF v_status IS NOT NULL AND v_status NOT IN
       ('pending','previewed','confirmed','committed','failed','expired') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STATUS';
  END IF;
  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL
     AND (p_date_from > p_date_to OR p_date_to - p_date_from > interval '366 days') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DATE_RANGE';
  END IF;

  SELECT COUNT(*)
  INTO   v_total
  FROM   public.agent_operations ao
  LEFT   JOIN public.profiles p ON p.id = ao.user_id
  LEFT   JOIN public.agent_previews ap ON ap.id = ao.preview_id
  LEFT   JOIN public.groups g ON g.id = ap.group_id
  WHERE  (v_status   IS NULL OR ao.status    = v_status)
    AND  (p_user_id  IS NULL OR ao.user_id   = p_user_id)
    AND  (p_date_from IS NULL OR ao.created_at >= p_date_from)
    AND  (p_date_to   IS NULL OR ao.created_at <= p_date_to)
    AND  (v_search_pattern IS NULL
            OR p.full_name ILIKE v_search_pattern ESCAPE '\'
            OR p.email ILIKE v_search_pattern ESCAPE '\'
            OR g.name ILIKE v_search_pattern ESCAPE '\'
            OR ap.preview_data->>'description' ILIKE v_search_pattern ESCAPE '\'
            OR ao.metadata->>'source' ILIKE v_search_pattern ESCAPE '\'
            OR ao.id::TEXT ILIKE v_search_pattern ESCAPE '\');

  SELECT COALESCE(jsonb_agg(row_obj), '[]'::jsonb)
  INTO   v_rows
  FROM (
    SELECT jsonb_build_object(
      'operation_id',       ao.id,
      'user_id',            ao.user_id,
      'user_full_name',     p.full_name,
      'user_email',         p.email,
      'status',             ao.status,
      -- Agent channel that created this operation (safe scalar from metadata).
      'source',             NULLIF(LEFT(COALESCE(ao.metadata->>'source', ''), 100), ''),
      'preview_id',         ao.preview_id,
      'group_id',           ap.group_id,
      'group_name',         g.name,
      'description',        LEFT(COALESCE(ap.preview_data->>'description', ''), 200),
      'total_amount',       CASE WHEN ap.preview_data ? 'total_amount'
                                 THEN (ap.preview_data->>'total_amount')::BIGINT ELSE NULL END,
      'currency',           ap.preview_data->>'currency',
      'category',           LEFT(COALESCE(ap.preview_data->>'category', ''), 100),
      'expense_date',       ap.preview_data->>'expense_date',
      'split_method',       ap.preview_data->>'requested_split_method',
      'splits_count',       CASE WHEN jsonb_typeof(ap.preview_data->'splits') = 'array'
                                 THEN jsonb_array_length(ap.preview_data->'splits') ELSE NULL END,
      'payer_user_id',      NULLIF(ap.preview_data->>'payer_user_id', '')::UUID,
      'payer_full_name',    payer.full_name,
      'expense_id',
        CASE WHEN ao.status = 'committed'
             THEN (ao.result->>'expense_id')::UUID ELSE NULL END,
      'error_code',    NULLIF(LEFT(COALESCE(ao.error->>'code',    ''), 100), ''),
      'error_message', NULLIF(LEFT(COALESCE(ao.error->>'message', ''), 500), ''),
      'created_at',  ao.created_at,
      'updated_at',  ao.updated_at,
      'preview_expires_at',   ap.expires_at,
      'preview_is_consumed',  ap.is_consumed,
      'has_confirmation',     ac.id IS NOT NULL,
      'confirmation_used',    ac.is_used
    ) AS row_obj
    FROM   public.agent_operations ao
    LEFT   JOIN public.profiles      p  ON p.id  = ao.user_id
    LEFT   JOIN public.agent_previews ap ON ap.id = ao.preview_id
    LEFT   JOIN public.groups         g  ON g.id  = ap.group_id
    LEFT   JOIN public.profiles       payer ON payer.id = NULLIF(ap.preview_data->>'payer_user_id', '')::UUID
    LEFT   JOIN public.agent_confirmations ac ON ac.preview_id = ap.id
    WHERE  (v_status   IS NULL OR ao.status    = v_status)
      AND  (p_user_id  IS NULL OR ao.user_id   = p_user_id)
      AND  (p_date_from IS NULL OR ao.created_at >= p_date_from)
      AND  (p_date_to   IS NULL OR ao.created_at <= p_date_to)
      AND  (v_search_pattern IS NULL
              OR p.full_name ILIKE v_search_pattern ESCAPE '\'
              OR p.email ILIKE v_search_pattern ESCAPE '\'
              OR g.name ILIKE v_search_pattern ESCAPE '\'
              OR ap.preview_data->>'description' ILIKE v_search_pattern ESCAPE '\'
              OR ao.metadata->>'source' ILIKE v_search_pattern ESCAPE '\'
              OR ao.id::TEXT ILIKE v_search_pattern ESCAPE '\')
    ORDER  BY ao.created_at DESC, ao.id DESC
    LIMIT  v_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'data',   v_rows,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset
  );
END;
$$;

COMMENT ON FUNCTION public.admin_list_agent_operations(
  TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) IS 'Admin-only paginated list of agent operations. '
     'Includes metadata.source. Never exposes preview_hash, confirmation_id, '
     'idempotency_key, response_body, or raw preview_data.';

-- ---------------------------------------------------------------------------
-- External agent submissions (ChatGPT / no-key agents)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_external_agent_submissions(
  p_status    TEXT        DEFAULT NULL,
  p_source    TEXT        DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to   TIMESTAMPTZ DEFAULT NULL,
  p_search    TEXT        DEFAULT NULL,
  p_limit     INTEGER     DEFAULT 20,
  p_offset    INTEGER     DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_limit  INTEGER;
  v_offset INTEGER;
  v_search TEXT;
  v_search_pattern TEXT;
  v_status TEXT;
  v_source TEXT;
  v_total  BIGINT;
  v_rows   JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  v_limit  := LEAST(GREATEST(COALESCE(p_limit,  20), 1), 100);
  v_offset := LEAST(GREATEST(COALESCE(p_offset, 0), 0), 100000);
  v_search := NULLIF(LEFT(BTRIM(p_search), 100), '');
  v_search_pattern := CASE WHEN v_search IS NULL THEN NULL ELSE
    '%' || REPLACE(REPLACE(REPLACE(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  END;
  v_status := NULLIF(BTRIM(p_status), '');
  v_source := NULLIF(LEFT(BTRIM(COALESCE(p_source, '')), 100), '');

  IF v_status IS NOT NULL AND v_status NOT IN
       ('pending','approved','rejected','expired','failed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STATUS';
  END IF;
  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL
     AND (p_date_from > p_date_to OR p_date_to - p_date_from > interval '366 days') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DATE_RANGE';
  END IF;

  SELECT COUNT(*)
  INTO   v_total
  FROM   public.external_agent_submissions s
  WHERE  (v_status IS NULL OR (
            CASE
              WHEN s.status = 'pending' AND s.expires_at <= now() THEN 'expired'
              ELSE s.status
            END
          ) = v_status)
    AND  (v_source IS NULL OR s.source = v_source)
    AND  (p_date_from IS NULL OR s.created_at >= p_date_from)
    AND  (p_date_to   IS NULL OR s.created_at <= p_date_to)
    AND  (v_search_pattern IS NULL
            OR s.target_email ILIKE v_search_pattern ESCAPE '\'
            OR s.group_name ILIKE v_search_pattern ESCAPE '\'
            OR s.source ILIKE v_search_pattern ESCAPE '\'
            OR s.payload->>'description' ILIKE v_search_pattern ESCAPE '\'
            OR s.id::TEXT ILIKE v_search_pattern ESCAPE '\');

  SELECT COALESCE(jsonb_agg(row_obj), '[]'::jsonb)
  INTO   v_rows
  FROM (
    SELECT jsonb_build_object(
      'submission_id',  s.id,
      'source',         LEFT(s.source, 100),
      'status',         CASE
                          WHEN s.status = 'pending' AND s.expires_at <= now() THEN 'expired'
                          ELSE s.status
                        END,
      'target_email',   s.target_email,
      'group_id',       s.group_id,
      'group_name',     s.group_name,
      'description',    LEFT(COALESCE(s.payload->>'description', ''), 200),
      'total_amount',   CASE WHEN s.payload ? 'amount'
                             THEN (s.payload->>'amount')::BIGINT ELSE NULL END,
      'currency',       COALESCE(s.payload->>'currency', 'VND'),
      'category',       LEFT(COALESCE(s.payload->>'category', ''), 100),
      'split_method',   s.payload->>'split_method',
      'expense_id',     CASE WHEN s.status = 'approved'
                             THEN NULLIF(s.resolution->>'expense_id', '')::UUID ELSE NULL END,
      'reject_reason',  NULLIF(LEFT(COALESCE(s.reject_reason, ''), 500), ''),
      'error_code',     NULLIF(LEFT(COALESCE(s.error->>'code', ''), 100), ''),
      'error_message',  NULLIF(LEFT(COALESCE(s.error->>'message', ''), 500), ''),
      'approved_by',    s.approved_by,
      'approved_at',    s.approved_at,
      'rejected_by',    s.rejected_by,
      'rejected_at',    s.rejected_at,
      'expires_at',     s.expires_at,
      'created_at',     s.created_at,
      'updated_at',     s.updated_at
    ) AS row_obj
    FROM public.external_agent_submissions s
    WHERE  (v_status IS NULL OR (
              CASE
                WHEN s.status = 'pending' AND s.expires_at <= now() THEN 'expired'
                ELSE s.status
              END
            ) = v_status)
      AND  (v_source IS NULL OR s.source = v_source)
      AND  (p_date_from IS NULL OR s.created_at >= p_date_from)
      AND  (p_date_to   IS NULL OR s.created_at <= p_date_to)
      AND  (v_search_pattern IS NULL
              OR s.target_email ILIKE v_search_pattern ESCAPE '\'
              OR s.group_name ILIKE v_search_pattern ESCAPE '\'
              OR s.source ILIKE v_search_pattern ESCAPE '\'
              OR s.payload->>'description' ILIKE v_search_pattern ESCAPE '\'
              OR s.id::TEXT ILIKE v_search_pattern ESCAPE '\')
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT  v_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'data',   v_rows,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset
  );
END;
$$;

COMMENT ON FUNCTION public.admin_list_external_agent_submissions(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) IS 'Admin-only paginated list of external agent submissions (e.g. ChatGPT). '
     'Exposes source. Never exposes submitted_ip_hash, user_agent, or raw resolution blobs.';

CREATE OR REPLACE FUNCTION public.admin_get_external_agent_submission_metrics(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_total BIGINT;
  v_pending BIGINT;
  v_approved BIGINT;
  v_rejected BIGINT;
  v_by_source JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL
     AND (p_date_from > p_date_to OR p_date_to - p_date_from > interval '366 days') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DATE_RANGE';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE status = 'pending' AND expires_at > now()
    ),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO v_total, v_pending, v_approved, v_rejected
  FROM public.external_agent_submissions
  WHERE (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to   IS NULL OR created_at <= p_date_to);

  SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
  INTO   v_by_source
  FROM (
    SELECT source, COUNT(*) AS cnt
    FROM   public.external_agent_submissions
    WHERE  (p_date_from IS NULL OR created_at >= p_date_from)
      AND  (p_date_to   IS NULL OR created_at <= p_date_to)
    GROUP  BY source
  ) s;

  RETURN jsonb_build_object(
    'total', v_total,
    'pending', v_pending,
    'approved', v_approved,
    'rejected', v_rejected,
    'by_source', v_by_source
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_external_agent_submission_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
IS 'Admin-only aggregate metrics for external agent submissions.';

REVOKE ALL ON FUNCTION public.admin_list_external_agent_submissions(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_get_external_agent_submission_metrics(
  TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_external_agent_submissions(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_external_agent_submission_metrics(
  TIMESTAMPTZ, TIMESTAMPTZ
) TO authenticated;
