-- Resolve external-agent payer/participants (and target actor) by any email on the
-- profile (profiles.email + user_emails), not only the primary profile email.

CREATE OR REPLACE FUNCTION public.profile_email_matches(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    lower(btrim(COALESCE(p_email, ''))) <> ''
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND lower(btrim(p.email)) = lower(btrim(p_email))
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_emails ue
        WHERE ue.user_id = p_user_id
          AND ue.normalized_email = lower(btrim(p_email))
      )
    );
$$;

COMMENT ON FUNCTION public.profile_email_matches(UUID, TEXT) IS
  'True when p_email matches the profile primary email or any row in user_emails for p_user_id.';

CREATE OR REPLACE FUNCTION public.approve_external_agent_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
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
    WHERE lower(g.name) = lower(v_submission.group_name)
      AND public.profile_email_matches(target_member.user_id, v_submission.target_email)
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
    WHERE lower(g.name) = lower(v_submission.group_name)
      AND public.profile_email_matches(target_member.user_id, v_submission.target_email)
      AND COALESCE(g.is_archived, false) = false
    LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = v_group_id AND COALESCE(g.is_archived, false) = false
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'GROUP_NOT_ACCESSIBLE';
  END IF;

  v_is_owner := public.profile_email_matches(v_actor, v_submission.target_email);
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
    WHERE gm.group_id = v_group_id
      AND public.profile_email_matches(gm.user_id, v_payer->>'email');
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
      AND public.profile_email_matches(gm.user_id, v_payer->>'email')
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
      WHERE gm.group_id = v_group_id
        AND public.profile_email_matches(gm.user_id, v_participant->>'email');
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
        AND public.profile_email_matches(gm.user_id, v_participant->>'email')
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
