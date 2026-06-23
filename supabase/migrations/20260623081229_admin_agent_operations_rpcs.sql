-- Admin-facing observability for FairPay Agent API operations.
--
-- Two SECURITY DEFINER RPCs guarded by public.is_admin():
--   * admin_list_agent_operations  — paginated, filterable list with safe fields only.
--   * admin_get_agent_operation_metrics — aggregate counts and rates.
--
-- Sensitive fields that MUST NOT be exposed:
--   preview_hash, confirmation_id, idempotency_key, response_body,
--   raw preview_data, JWT/session secrets.
--
-- The committed-result JSONB is whitelisted to (expense_id, total_amount,
-- currency, splits_count). The error JSONB is whitelisted to (code, message).
-- The preview row is exposed only through an explicit scalar summary allowlist
-- plus lifecycle flags — never hashes or the canonical preview_data blob.

CREATE INDEX agent_operations_status_created_idx
  ON public.agent_operations (status, created_at DESC);

CREATE FUNCTION public.admin_list_agent_operations(
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

  -- Total count (no LIMIT) for pagination metadata.
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
            OR ao.id::TEXT ILIKE v_search_pattern ESCAPE '\');

  -- Paginated rows — only whitelisted fields are included.
  SELECT COALESCE(jsonb_agg(row_obj), '[]'::jsonb)
  INTO   v_rows
  FROM (
    SELECT jsonb_build_object(
      'operation_id',       ao.id,
      'user_id',            ao.user_id,
      'user_full_name',     p.full_name,
      'user_email',         p.email,
      'status',             ao.status,
      'preview_id',         ao.preview_id,
      'group_id',           ap.group_id,
      'group_name',         g.name,
      -- Safe preview summary: explicit scalar allowlist, never the raw blob.
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
      -- Committed result: explicit key allowlist, never the raw result blob.
      'expense_id',
        CASE WHEN ao.status = 'committed'
             THEN (ao.result->>'expense_id')::UUID ELSE NULL END,
      -- error fields (truncated, whitelisted keys only)
      'error_code',    NULLIF(LEFT(COALESCE(ao.error->>'code',    ''), 100), ''),
      'error_message', NULLIF(LEFT(COALESCE(ao.error->>'message', ''), 500), ''),
      -- timestamps
      'created_at',  ao.created_at,
      'updated_at',  ao.updated_at,
      -- preview metadata (no hash, no preview_data)
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
     'Never exposes preview_hash, confirmation_id, idempotency_key, '
     'response_body, or raw preview_data.';

-- ---------------------------------------------------------------------------

CREATE FUNCTION public.admin_get_agent_operation_metrics(
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
  v_total             BIGINT;
  v_today             BIGINT;
  v_last_7d           BIGINT;
  v_last_30d          BIGINT;
  v_unique_users      BIGINT;
  v_avg_commit_secs   NUMERIC;
  v_median_commit_secs NUMERIC;
  v_p95_commit_secs   NUMERIC;
  v_completion_rate   NUMERIC;
  v_failure_rate      NUMERIC;
  v_active_previews   BIGINT;
  v_by_status         JSONB;
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
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days'),
    COUNT(DISTINCT user_id)
  INTO v_total, v_today, v_last_7d, v_last_30d, v_unique_users
  FROM public.agent_operations
  WHERE (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to   IS NULL OR created_at <= p_date_to);

  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO   v_by_status
  FROM (
    SELECT status, COUNT(*) AS cnt
    FROM   public.agent_operations
    WHERE  (p_date_from IS NULL OR created_at >= p_date_from)
      AND  (p_date_to   IS NULL OR created_at <= p_date_to)
    GROUP  BY status
  ) s;

  -- Average seconds from operation created_at to updated_at for committed ops.
  SELECT
    ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::NUMERIC, 1),
    ROUND((percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))
    ))::NUMERIC, 1),
    ROUND((percentile_cont(0.95) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))
    ))::NUMERIC, 1)
  INTO v_avg_commit_secs, v_median_commit_secs, v_p95_commit_secs
  FROM   public.agent_operations
  WHERE  status = 'committed'
    AND  (p_date_from IS NULL OR created_at >= p_date_from)
    AND  (p_date_to   IS NULL OR created_at <= p_date_to);

  v_completion_rate := CASE WHEN v_total = 0 THEN 0 ELSE ROUND(
    100.0 * COALESCE((v_by_status->>'committed')::NUMERIC, 0) / v_total, 1
  ) END;
  v_failure_rate := CASE WHEN v_total = 0 THEN 0 ELSE ROUND(
    100.0 * COALESCE((v_by_status->>'failed')::NUMERIC, 0) / v_total, 1
  ) END;

  SELECT COUNT(*) INTO v_active_previews
  FROM public.agent_previews ap
  JOIN public.agent_operations ao ON ao.id = ap.operation_id
  WHERE NOT ap.is_consumed AND ap.expires_at > now()
    AND ao.status IN ('previewed', 'confirmed')
    AND (p_date_from IS NULL OR ao.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ao.created_at <= p_date_to);

  RETURN jsonb_build_object(
    'total',              v_total,
    'by_status',          v_by_status,
    'ops_today',          v_today,
    'ops_last_7d',        v_last_7d,
    'ops_last_30d',       v_last_30d,
    'unique_users',       v_unique_users,
    'avg_commit_seconds', v_avg_commit_secs,
    'median_commit_seconds', v_median_commit_secs,
    'p95_commit_seconds', v_p95_commit_secs,
    'completion_rate', v_completion_rate,
    'failure_rate', v_failure_rate,
    'active_previews', v_active_previews
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_agent_operation_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
IS 'Admin-only aggregate metrics for agent operations. '
   'Never exposes per-operation sensitive fields.';

-- ---------------------------------------------------------------------------
-- Grant EXECUTE to authenticated (is_admin() enforces the real boundary);
-- revoke from anon and PUBLIC.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_list_agent_operations(
  TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_get_agent_operation_metrics(
  TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_agent_operations(
  TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, INTEGER
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_agent_operation_metrics(
  TIMESTAMPTZ, TIMESTAMPTZ
) TO authenticated;
