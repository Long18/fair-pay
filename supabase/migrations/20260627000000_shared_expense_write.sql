-- FairPay Financial Write Consolidation
--
-- Adds the canonical write primitive `write_group_expense_atomic` and rewires
-- both `commit_agent_expense` (internal Agent API) and
-- `approve_external_agent_submission` (external no-key Agent API approval) to
-- call it. This eliminates duplicated INSERT logic and fixes the payer
-- self-split settlement bug in the external approval path.
--
-- Settlement rule (single source of truth):
--   payer split:     is_settled=true,  settled_amount=split_amount, settled_at=now()
--   non-payer split: is_settled=false, settled_amount=0,            settled_at=NULL
--
-- All validation (group access, member existence, split-sum, duplicate
-- detection, idempotency, preview/confirmation consumption) remains in the
-- caller; this primitive only writes after the caller has resolved a
-- canonical payload.

-- ---------------------------------------------------------------------------
-- 1. Shared atomic write primitive
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.write_group_expense_atomic(
  p_group_id        UUID,
  p_payer_user_id   UUID,
  p_payer_member_id UUID,
  p_amount          BIGINT,
  p_description     TEXT,
  p_category        public.expense_category,
  p_expense_date    DATE,
  p_comment         TEXT,
  p_created_by      UUID,
  p_resolved_splits JSONB,  -- [{user_id, member_id, amount}]
  p_split_method    TEXT DEFAULT 'exact'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_expense_id   UUID;
  v_split        JSONB;
  v_split_count  INTEGER := 0;
BEGIN
  -- expense row
  INSERT INTO public.expenses (
    context_type,
    group_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    is_payment,
    created_by,
    comment
  ) VALUES (
    'group',
    p_group_id,
    p_description,
    p_amount,
    'VND',
    p_category,
    p_expense_date,
    p_payer_user_id,
    false,
    p_created_by,
    p_comment
  )
  RETURNING id INTO v_expense_id;

  -- split rows, with payer self-split immediately settled
  FOR v_split IN SELECT value FROM jsonb_array_elements(p_resolved_splits)
  LOOP
    INSERT INTO public.expense_splits (
      expense_id,
      user_id,
      split_method,
      split_value,
      computed_amount,
      is_settled,
      settled_amount,
      settled_at,
      pending_email,
      is_claimed
    ) VALUES (
      v_expense_id,
      (v_split->>'user_id')::UUID,
      p_split_method,
      (v_split->>'amount')::BIGINT,
      (v_split->>'amount')::BIGINT,
      (v_split->>'user_id')::UUID = p_payer_user_id,
      CASE WHEN (v_split->>'user_id')::UUID = p_payer_user_id
        THEN (v_split->>'amount')::BIGINT ELSE 0 END,
      CASE WHEN (v_split->>'user_id')::UUID = p_payer_user_id
        THEN now() ELSE NULL END,
      NULL,
      true
    );
    v_split_count := v_split_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expense_id',   v_expense_id,
    'splits_count', v_split_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.write_group_expense_atomic(
  UUID, UUID, UUID, BIGINT, TEXT, public.expense_category, DATE, TEXT, UUID, JSONB, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_group_expense_atomic(
  UUID, UUID, UUID, BIGINT, TEXT, public.expense_category, DATE, TEXT, UUID, JSONB, TEXT
) TO authenticated, service_role;

COMMENT ON FUNCTION public.write_group_expense_atomic IS
  'Canonical write primitive: inserts one expense + all expense_splits atomically. '
  'Payer self-split is immediately settled (is_settled=true, settled_amount=amount, settled_at=now()). '
  'Non-payer splits are unsettled. Both commit_agent_expense and '
  'approve_external_agent_submission MUST call this function — no other write path is permitted.';

-- ---------------------------------------------------------------------------
-- 2. Rewire commit_agent_expense to use the shared primitive
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.commit_agent_expense(
  p_preview_id UUID,
  p_preview_hash TEXT,
  p_confirmation_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_preview public.agent_previews%ROWTYPE;
  v_confirmation public.agent_confirmations%ROWTYPE;
  v_idempotency public.agent_idempotency_keys%ROWTYPE;
  v_data JSONB;
  v_group_id UUID;
  v_expense_id UUID;
  v_payer_member_id UUID;
  v_payer_user_id UUID;
  v_amount BIGINT;
  v_description TEXT;
  v_category public.expense_category;
  v_expense_date DATE;
  v_comment TEXT;
  v_splits JSONB;
  v_split JSONB;
  v_split_sum BIGINT := 0;
  v_split_count INTEGER := 0;
  v_write_result JSONB;
  v_result JSONB;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;
  IF p_idempotency_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_IDEMPOTENCY_KEY';
  END IF;

  INSERT INTO public.agent_idempotency_keys (
    idempotency_key, user_id, preview_id, preview_hash, confirmation_id
  )
  VALUES (p_idempotency_key, v_actor, p_preview_id, p_preview_hash, p_confirmation_id)
  ON CONFLICT (idempotency_key, user_id) DO NOTHING;

  SELECT * INTO v_idempotency FROM public.agent_idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND user_id = v_actor
  FOR UPDATE;
  IF v_idempotency.preview_id <> p_preview_id
     OR v_idempotency.preview_hash <> p_preview_hash
     OR v_idempotency.confirmation_id <> p_confirmation_id THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'IDEMPOTENCY_KEY_REUSED';
  END IF;
  IF v_idempotency.response_body IS NOT NULL THEN
    RETURN v_idempotency.response_body;
  END IF;

  SELECT * INTO v_preview FROM public.agent_previews
  WHERE id = p_preview_id FOR UPDATE;
  IF NOT FOUND OR v_preview.user_id <> v_actor THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PREVIEW_NOT_FOUND';
  END IF;
  IF v_preview.preview_hash <> p_preview_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'HASH_MISMATCH';
  END IF;
  IF v_preview.is_consumed THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PREVIEW_CONSUMED';
  END IF;
  IF v_preview.expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PREVIEW_EXPIRED';
  END IF;

  SELECT * INTO v_confirmation FROM public.agent_confirmations
  WHERE id = p_confirmation_id AND preview_id = p_preview_id FOR UPDATE;
  IF NOT FOUND OR v_confirmation.user_id <> v_actor THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'CONFIRMATION_NOT_FOUND';
  END IF;
  IF v_confirmation.preview_hash <> p_preview_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'HASH_MISMATCH';
  END IF;
  IF v_confirmation.is_used THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'CONFIRMATION_USED';
  END IF;

  v_data := v_preview.preview_data;
  IF v_data->>'actor_user_id' IS DISTINCT FROM v_actor::text
     OR v_data->>'group_id' IS DISTINCT FROM v_preview.group_id::text
     OR v_data->>'currency' IS DISTINCT FROM 'VND' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PREVIEW_CONTEXT';
  END IF;

  v_group_id := v_preview.group_id;
  v_amount := (v_data->>'total_amount')::BIGINT;
  v_description := btrim(v_data->>'description');
  v_category := COALESCE(NULLIF(v_data->>'category', '')::public.expense_category, 'Other');
  v_expense_date := COALESCE((v_data->>'expense_date')::DATE, CURRENT_DATE);
  v_comment := NULLIF(btrim(v_data->>'comment'), '');
  v_payer_member_id := (v_data->>'payer_member_id')::UUID;
  v_payer_user_id := (v_data->>'payer_user_id')::UUID;
  v_splits := v_data->'splits';

  IF v_amount <= 0 OR v_amount > 9999999999 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VND_AMOUNT';
  END IF;
  IF v_description IS NULL OR length(v_description) NOT BETWEEN 1 AND 200
     OR (v_comment IS NOT NULL AND length(v_comment) > 1000)
     OR jsonb_typeof(v_splits) <> 'array'
     OR jsonb_array_length(v_splits) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_EXPENSE_DATA';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.group_members actor ON actor.group_id = g.id AND actor.user_id = v_actor
    WHERE g.id = v_group_id AND NOT COALESCE(g.is_archived, false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'GROUP_NOT_ACCESSIBLE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.id = v_payer_member_id AND gm.group_id = v_group_id AND gm.user_id = v_payer_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYER_CHANGED';
  END IF;

  FOR v_split IN SELECT value FROM jsonb_array_elements(v_splits)
  LOOP
    IF (v_split->>'amount')::BIGINT <= 0
       OR NOT EXISTS (
         SELECT 1 FROM public.group_members gm
         WHERE gm.id = (v_split->>'member_id')::UUID
           AND gm.group_id = v_group_id
           AND gm.user_id = (v_split->>'user_id')::UUID
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PARTICIPANT_CHANGED';
    END IF;
    v_split_sum := v_split_sum + (v_split->>'amount')::BIGINT;
    v_split_count := v_split_count + 1;
  END LOOP;
  IF v_split_count <> (
    SELECT count(DISTINCT value->>'member_id') FROM jsonb_array_elements(v_splits)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DUPLICATE_PARTICIPANT';
  END IF;
  IF v_split_sum <> v_amount THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SPLIT_SUM_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.group_id = v_group_id
      AND e.amount = v_amount
      AND e.paid_by_user_id = v_payer_user_id
      AND e.expense_date = v_expense_date
      AND e.is_payment = false
      AND e.created_at >= now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'DUPLICATE_EXPENSE';
  END IF;

  -- Canonical write through the shared primitive.
  v_write_result := public.write_group_expense_atomic(
    v_group_id,
    v_payer_user_id,
    v_payer_member_id,
    v_amount,
    v_description,
    v_category,
    v_expense_date,
    v_comment,
    v_actor,
    v_splits,
    'exact'
  );
  v_expense_id := (v_write_result->>'expense_id')::UUID;
  v_split_count := (v_write_result->>'splits_count')::INTEGER;

  UPDATE public.agent_confirmations SET is_used = true, used_at = now()
  WHERE id = p_confirmation_id;
  UPDATE public.agent_previews SET is_consumed = true WHERE id = p_preview_id;

  v_result := jsonb_build_object(
    'success', true,
    'expense_id', v_expense_id,
    'preview_id', p_preview_id,
    'operation_id', v_preview.operation_id,
    'total_amount', v_amount,
    'currency', 'VND',
    'splits_count', v_split_count
  );
  UPDATE public.agent_operations
  SET status = 'committed', result = v_result, error = NULL, updated_at = now()
  WHERE id = v_preview.operation_id AND user_id = v_actor;
  UPDATE public.agent_idempotency_keys
  SET response_status = 200, response_body = v_result
  WHERE id = v_idempotency.id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_agent_expense(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commit_agent_expense(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Rewire approve_external_agent_submission to use the shared primitive
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_external_agent_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_email TEXT;
  v_submission public.external_agent_submissions%ROWTYPE;
  v_payload JSONB;
  v_group_id UUID;
  v_group_count INTEGER;
  v_is_owner BOOLEAN;
  v_is_admin BOOLEAN;
  v_amount BIGINT;
  v_description TEXT;
  v_category public.expense_category;
  v_expense_date DATE;
  v_comment TEXT;
  v_split_method TEXT;
  v_payer JSONB;
  v_payer_member_id UUID;
  v_payer_user_id UUID;
  v_payer_name TEXT;
  v_participant JSONB;
  v_ord INTEGER;
  v_match_count INTEGER;
  v_member_id UUID;
  v_user_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_seen UUID[] := ARRAY[]::UUID[];
  v_resolved JSONB := '[]'::JSONB;
  v_final_splits JSONB := '[]'::JSONB;
  v_count INTEGER := 0;
  v_fixed_sum BIGINT := 0;
  v_fixed_count INTEGER := 0;
  v_unfixed_count INTEGER := 0;
  v_unfixed_seen INTEGER := 0;
  v_base BIGINT;
  v_remainder BIGINT;
  v_alloc BIGINT;
  v_sum BIGINT := 0;
  v_split JSONB;
  v_expense_id UUID;
  v_split_count INTEGER := 0;
  v_write_result JSONB;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  SELECT lower(email) INTO v_actor_email
  FROM public.profiles
  WHERE id = v_actor;

  SELECT * INTO v_submission
  FROM public.external_agent_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'SUBMISSION_NOT_FOUND';
  END IF;

  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SUBMISSION_NOT_PENDING';
  END IF;

  IF v_submission.expires_at <= now() THEN
    UPDATE public.external_agent_submissions
    SET status = 'expired',
        error = jsonb_build_object('code', 'SUBMISSION_EXPIRED', 'message', 'Submission expired')
    WHERE id = p_submission_id;
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SUBMISSION_EXPIRED';
  END IF;

  v_payload := v_submission.payload;
  v_group_id := v_submission.group_id;

  IF v_group_id IS NULL THEN
    SELECT count(*)
    INTO v_group_count
    FROM public.groups g
    JOIN public.group_members target_member ON target_member.group_id = g.id
    JOIN public.profiles target_profile ON target_profile.id = target_member.user_id
    WHERE lower(g.name) = lower(v_submission.group_name)
      AND lower(target_profile.email) = v_submission.target_email
      AND COALESCE(g.is_archived, false) = false;

    IF v_group_count = 0 THEN
      UPDATE public.external_agent_submissions
      SET status = 'failed',
          error = jsonb_build_object('code', 'GROUP_UNRESOLVED', 'message', 'Could not resolve group from target email and group name')
      WHERE id = p_submission_id;
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'GROUP_UNRESOLVED';
    ELSIF v_group_count > 1 THEN
      UPDATE public.external_agent_submissions
      SET status = 'failed',
          error = jsonb_build_object('code', 'GROUP_AMBIGUOUS', 'message', 'Group name matches multiple groups for target email')
      WHERE id = p_submission_id;
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'GROUP_AMBIGUOUS';
    END IF;

    SELECT g.id
    INTO v_group_id
    FROM public.groups g
    JOIN public.group_members target_member ON target_member.group_id = g.id
    JOIN public.profiles target_profile ON target_profile.id = target_member.user_id
    WHERE lower(g.name) = lower(v_submission.group_name)
      AND lower(target_profile.email) = v_submission.target_email
      AND COALESCE(g.is_archived, false) = false
    LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = v_group_id AND COALESCE(g.is_archived, false) = false
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'GROUP_NOT_ACCESSIBLE';
  END IF;

  v_is_owner := v_submission.target_email = v_actor_email;
  v_is_admin := EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = v_group_id
      AND gm.user_id = v_actor
      AND gm.role = 'admin'
  );

  IF NOT (v_is_owner OR v_is_admin) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUBMISSION_NOT_ACCESSIBLE';
  END IF;

  v_amount := (v_payload->>'amount')::BIGINT;
  v_description := btrim(v_payload->>'description');
  v_category := COALESCE(NULLIF(v_payload->>'category', ''), 'Other')::public.expense_category;
  v_expense_date := COALESCE(NULLIF(v_payload->>'expense_date', '')::DATE, CURRENT_DATE);
  v_comment := NULLIF(v_payload->>'comment', '');
  v_split_method := v_payload->>'split_method';
  v_payer := v_payload->'payer';

  IF v_amount <= 0 OR v_amount > 9999999999 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VND_AMOUNT';
  END IF;

  IF v_payer ? 'email' THEN
    SELECT count(*)
    INTO v_match_count
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = v_group_id
      AND lower(p.email) = lower(v_payer->>'email');
  ELSE
    SELECT count(*)
    INTO v_match_count
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = v_group_id
      AND lower(p.full_name) = lower(v_payer->>'display_name');
  END IF;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYER_UNRESOLVED';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PAYER_AMBIGUOUS';
  END IF;

  IF v_payer ? 'email' THEN
    SELECT gm.id, gm.user_id, p.full_name
    INTO v_payer_member_id, v_payer_user_id, v_payer_name
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = v_group_id
      AND lower(p.email) = lower(v_payer->>'email')
    LIMIT 1;
  ELSE
    SELECT gm.id, gm.user_id, p.full_name
    INTO v_payer_member_id, v_payer_user_id, v_payer_name
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = v_group_id
      AND lower(p.full_name) = lower(v_payer->>'display_name')
    LIMIT 1;
  END IF;

  FOR v_participant, v_ord IN
    SELECT value, ordinality::INTEGER
    FROM jsonb_array_elements(v_payload->'participants') WITH ORDINALITY
  LOOP
    IF v_participant ? 'email' THEN
      SELECT count(*)
      INTO v_match_count
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      WHERE gm.group_id = v_group_id
        AND lower(p.email) = lower(v_participant->>'email');
    ELSE
      SELECT count(*)
      INTO v_match_count
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      WHERE gm.group_id = v_group_id
        AND lower(p.full_name) = lower(v_participant->>'display_name');
    END IF;

    IF v_match_count = 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PARTICIPANT_UNRESOLVED';
    ELSIF v_match_count > 1 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PARTICIPANT_AMBIGUOUS';
    END IF;

    IF v_participant ? 'email' THEN
      SELECT gm.id, gm.user_id, p.full_name, p.email
      INTO v_member_id, v_user_id, v_full_name, v_email
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      WHERE gm.group_id = v_group_id
        AND lower(p.email) = lower(v_participant->>'email')
      LIMIT 1;
    ELSE
      SELECT gm.id, gm.user_id, p.full_name, p.email
      INTO v_member_id, v_user_id, v_full_name, v_email
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      WHERE gm.group_id = v_group_id
        AND lower(p.full_name) = lower(v_participant->>'display_name')
      LIMIT 1;
    END IF;

    IF v_member_id = ANY(v_seen) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DUPLICATE_PARTICIPANT';
    END IF;

    v_seen := array_append(v_seen, v_member_id);
    v_count := v_count + 1;
    IF v_participant ? 'fixed_amount' THEN
      v_fixed_count := v_fixed_count + 1;
      v_fixed_sum := v_fixed_sum + (v_participant->>'fixed_amount')::BIGINT;
    ELSE
      v_unfixed_count := v_unfixed_count + 1;
    END IF;

    v_resolved := v_resolved || jsonb_build_array(jsonb_build_object(
      'ord', v_ord,
      'member_id', v_member_id,
      'user_id', v_user_id,
      'full_name', v_full_name,
      'email', v_email,
      'requested_amount', CASE WHEN v_participant ? 'amount' THEN (v_participant->>'amount')::BIGINT ELSE NULL END,
      'fixed_amount', CASE WHEN v_participant ? 'fixed_amount' THEN (v_participant->>'fixed_amount')::BIGINT ELSE NULL END
    ));
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'NO_PARTICIPANTS';
  END IF;

  IF v_split_method = 'equal' THEN
    v_base := v_amount / v_count;
    v_remainder := v_amount % v_count;
    FOR v_split IN SELECT value FROM jsonb_array_elements(v_resolved) ORDER BY (value->>'ord')::INTEGER LOOP
      v_alloc := v_base + CASE WHEN (v_split->>'ord')::INTEGER = v_count THEN v_remainder ELSE 0 END;
      v_final_splits := v_final_splits || jsonb_build_array(v_split || jsonb_build_object('amount', v_alloc));
      v_sum := v_sum + v_alloc;
    END LOOP;
  ELSIF v_split_method = 'exact' THEN
    FOR v_split IN SELECT value FROM jsonb_array_elements(v_resolved) ORDER BY (value->>'ord')::INTEGER LOOP
      v_alloc := (v_split->>'requested_amount')::BIGINT;
      IF v_alloc <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VND_AMOUNT';
      END IF;
      v_final_splits := v_final_splits || jsonb_build_array(v_split || jsonb_build_object('amount', v_alloc));
      v_sum := v_sum + v_alloc;
    END LOOP;
  ELSIF v_split_method = 'fixed_then_equal_remainder' THEN
    IF v_fixed_sum > v_amount THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SPLIT_SUM_MISMATCH';
    END IF;
    IF v_unfixed_count = 0 AND v_fixed_sum <> v_amount THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SPLIT_SUM_MISMATCH';
    END IF;
    v_base := CASE WHEN v_unfixed_count = 0 THEN 0 ELSE (v_amount - v_fixed_sum) / v_unfixed_count END;
    v_remainder := CASE WHEN v_unfixed_count = 0 THEN 0 ELSE (v_amount - v_fixed_sum) % v_unfixed_count END;
    FOR v_split IN SELECT value FROM jsonb_array_elements(v_resolved) ORDER BY (value->>'ord')::INTEGER LOOP
      IF v_split->>'fixed_amount' IS NOT NULL THEN
        v_alloc := (v_split->>'fixed_amount')::BIGINT;
      ELSE
        v_unfixed_seen := v_unfixed_seen + 1;
        v_alloc := v_base + CASE WHEN v_unfixed_seen = v_unfixed_count THEN v_remainder ELSE 0 END;
      END IF;
      v_final_splits := v_final_splits || jsonb_build_array(v_split || jsonb_build_object('amount', v_alloc));
      v_sum := v_sum + v_alloc;
    END LOOP;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SPLIT_METHOD';
  END IF;

  IF v_sum <> v_amount THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SPLIT_SUM_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.context_type = 'group'
      AND e.group_id = v_group_id
      AND e.paid_by_user_id = v_payer_user_id
      AND e.amount = v_amount
      AND lower(e.description) = lower(v_description)
      AND e.expense_date BETWEEN v_expense_date - interval '1 day' AND v_expense_date + interval '1 day'
      AND COALESCE(e.is_payment, false) = false
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'DUPLICATE_EXPENSE';
  END IF;

  -- Canonical write through the shared primitive.
  -- Persisted split_method is 'exact' since amounts are now fully resolved;
  -- the original split_method intent is preserved in the resolution JSON.
  v_write_result := public.write_group_expense_atomic(
    v_group_id,
    v_payer_user_id,
    v_payer_member_id,
    v_amount,
    v_description,
    v_category,
    v_expense_date,
    v_comment,
    v_actor,
    v_final_splits,
    'exact'
  );
  v_expense_id := (v_write_result->>'expense_id')::UUID;
  v_split_count := (v_write_result->>'splits_count')::INTEGER;

  UPDATE public.external_agent_submissions
  SET status = 'approved',
      approved_by = v_actor,
      approved_at = now(),
      group_id = v_group_id,
      resolution = jsonb_build_object(
        'expense_id', v_expense_id,
        'group_id', v_group_id,
        'payer_member_id', v_payer_member_id,
        'payer_user_id', v_payer_user_id,
        'payer_full_name', v_payer_name,
        'split_method', v_split_method,
        'splits', v_final_splits,
        'duplicate_warnings', '[]'::jsonb,
        'commit_source', 'external_agent'
      )
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'submission_id', p_submission_id,
    'status', 'approved',
    'expense_id', v_expense_id,
    'splits_count', v_split_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_external_agent_submission(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_external_agent_submission(UUID) TO authenticated;

COMMENT ON FUNCTION public.commit_agent_expense IS
  'Internal Agent API commit. Validates preview/confirmation/idempotency, then writes via write_group_expense_atomic.';

COMMENT ON FUNCTION public.approve_external_agent_submission IS
  'External Agent API approval. Resolves names to IDs, allocates splits, then writes via write_group_expense_atomic. Payer self-split is settled identically to the internal commit path.';
