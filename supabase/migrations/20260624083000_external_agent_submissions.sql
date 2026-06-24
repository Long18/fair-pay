-- External agent submission inbox.
-- Public agents can create pending proposals without auth; FairPay users approve in-app.

CREATE TABLE IF NOT EXISTS public.external_agent_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_email TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  group_name TEXT,
  source TEXT NOT NULL DEFAULT 'external_agent',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'failed')),
  payload JSONB NOT NULL,
  resolution JSONB,
  error JSONB,
  reject_reason TEXT,
  submitted_ip_hash TEXT,
  user_agent TEXT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_agent_submissions_target_pending
  ON public.external_agent_submissions (target_email, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_agent_submissions_group_pending
  ON public.external_agent_submissions (group_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_agent_submissions_ip_recent
  ON public.external_agent_submissions (submitted_ip_hash, created_at DESC);

ALTER TABLE public.external_agent_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_agent_submissions_select_visible
  ON public.external_agent_submissions;

CREATE POLICY external_agent_submissions_select_visible
  ON public.external_agent_submissions
  FOR SELECT
  TO authenticated
  USING (
    target_email = (
      SELECT lower(p.email)
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_members admin_member
      JOIN public.groups g ON g.id = admin_member.group_id
      LEFT JOIN public.profiles target_profile
        ON lower(target_profile.email) = external_agent_submissions.target_email
      LEFT JOIN public.group_members target_member
        ON target_member.group_id = g.id
       AND target_member.user_id = target_profile.id
      WHERE admin_member.user_id = auth.uid()
        AND admin_member.role = 'admin'
        AND COALESCE(g.is_archived, false) = false
        AND (
          external_agent_submissions.group_id = g.id
          OR (
            external_agent_submissions.group_id IS NULL
            AND lower(g.name) = lower(external_agent_submissions.group_name)
            AND target_member.id IS NOT NULL
          )
        )
    )
  );

REVOKE ALL ON public.external_agent_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.external_agent_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_external_agent_submission_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_external_agent_submissions_touch
  ON public.external_agent_submissions;

CREATE TRIGGER trg_external_agent_submissions_touch
  BEFORE UPDATE ON public.external_agent_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_external_agent_submission_updated_at();

CREATE OR REPLACE FUNCTION public.create_external_agent_submission(
  p_payload JSONB,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_target_email TEXT := lower(btrim(p_payload->>'target_email'));
  v_group_id UUID := NULLIF(p_payload->>'group_id', '')::UUID;
  v_group_name TEXT := NULLIF(btrim(p_payload->>'group_name'), '');
  v_source TEXT := COALESCE(NULLIF(btrim(p_payload->>'source'), ''), 'external_agent');
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_target_email IS NULL OR v_target_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TARGET_EMAIL';
  END IF;

  IF v_group_id IS NULL AND v_group_name IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'GROUP_HINT_REQUIRED';
  END IF;

  IF COALESCE((p_payload->>'amount')::BIGINT, 0) <= 0
     OR (p_payload->>'amount')::BIGINT > 9999999999 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VND_AMOUNT';
  END IF;

  IF COALESCE(p_payload->>'currency', 'VND') <> 'VND' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CURRENCY_NOT_VND';
  END IF;

  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*)
    FROM public.external_agent_submissions
    WHERE submitted_ip_hash = p_ip_hash
      AND created_at > now() - interval '10 minutes'
  ) >= 20 THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'RATE_LIMIT_EXCEEDED';
  END IF;

  IF (
    SELECT count(*)
    FROM public.external_agent_submissions
    WHERE target_email = v_target_email
      AND created_at > now() - interval '10 minutes'
  ) >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'RATE_LIMIT_EXCEEDED';
  END IF;

  IF (
    SELECT count(*)
    FROM public.external_agent_submissions
    WHERE target_email = v_target_email
      AND status = 'pending'
      AND COALESCE(group_id::TEXT, lower(group_name)) = COALESCE(v_group_id::TEXT, lower(v_group_name))
  ) >= 20 THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PENDING_LIMIT_EXCEEDED';
  END IF;

  INSERT INTO public.external_agent_submissions (
    target_email,
    group_id,
    group_name,
    source,
    payload,
    submitted_ip_hash,
    user_agent
  )
  VALUES (
    v_target_email,
    v_group_id,
    v_group_name,
    left(v_source, 100),
    jsonb_set(p_payload, '{target_email}', to_jsonb(v_target_email), true),
    p_ip_hash,
    left(p_user_agent, 500)
  )
  RETURNING id, expires_at INTO v_id, v_expires_at;

  RETURN jsonb_build_object(
    'submission_id', v_id,
    'status', 'pending',
    'expires_at', v_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_external_agent_submissions()
RETURNS TABLE (
  submission_id UUID,
  target_email TEXT,
  group_id UUID,
  group_name TEXT,
  source TEXT,
  status TEXT,
  payload JSONB,
  resolution JSONB,
  error JSONB,
  reject_reason TEXT,
  visibility TEXT,
  duplicate_warnings JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_email TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  SELECT lower(email) INTO v_actor_email
  FROM public.profiles
  WHERE id = v_actor;

  RETURN QUERY
  SELECT
    s.id,
    s.target_email,
    s.group_id,
    s.group_name,
    s.source,
    CASE
      WHEN s.status = 'pending' AND s.expires_at <= now() THEN 'expired'
      ELSE s.status
    END AS status,
    s.payload,
    s.resolution,
    s.error,
    s.reject_reason,
    CASE WHEN s.target_email = v_actor_email THEN 'target_email' ELSE 'group_admin' END,
    COALESCE(s.resolution->'duplicate_warnings', '[]'::jsonb),
    s.created_at,
    s.expires_at
  FROM public.external_agent_submissions s
  WHERE s.status = 'pending'
    AND s.expires_at > now()
    AND (
      s.target_email = v_actor_email
      OR EXISTS (
        SELECT 1
        FROM public.group_members admin_member
        JOIN public.groups g ON g.id = admin_member.group_id
        LEFT JOIN public.profiles target_profile ON lower(target_profile.email) = s.target_email
        LEFT JOIN public.group_members target_member
          ON target_member.group_id = g.id
         AND target_member.user_id = target_profile.id
        WHERE admin_member.user_id = v_actor
          AND admin_member.role = 'admin'
          AND COALESCE(g.is_archived, false) = false
          AND (
            s.group_id = g.id
            OR (
              s.group_id IS NULL
              AND lower(g.name) = lower(s.group_name)
              AND target_member.id IS NOT NULL
            )
          )
      )
    )
  ORDER BY s.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_external_agent_submission(
  p_submission_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_visible BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.list_external_agent_submissions() visible
    WHERE visible.submission_id = p_submission_id
  )
  INTO v_visible;

  IF NOT v_visible THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUBMISSION_NOT_ACCESSIBLE';
  END IF;

  UPDATE public.external_agent_submissions
  SET status = 'rejected',
      reject_reason = NULLIF(left(COALESCE(p_reason, ''), 500), ''),
      rejected_by = v_actor,
      rejected_at = now()
  WHERE id = p_submission_id
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SUBMISSION_NOT_PENDING';
  END IF;

  RETURN jsonb_build_object('submission_id', p_submission_id, 'status', 'rejected');
END;
$$;

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
  )
  VALUES (
    'group',
    v_group_id,
    v_description,
    v_amount,
    'VND',
    v_category,
    v_expense_date,
    v_payer_user_id,
    false,
    v_actor,
    v_comment
  )
  RETURNING id INTO v_expense_id;

  FOR v_split IN SELECT value FROM jsonb_array_elements(v_final_splits) LOOP
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
    )
    VALUES (
      v_expense_id,
      (v_split->>'user_id')::UUID,
      v_split_method,
      (v_split->>'amount')::NUMERIC,
      (v_split->>'amount')::NUMERIC,
      false,
      0,
      NULL,
      NULL,
      true
    );
    v_split_count := v_split_count + 1;
  END LOOP;

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
        'splits', v_final_splits,
        'duplicate_warnings', '[]'::jsonb
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

REVOKE ALL ON FUNCTION public.touch_external_agent_submission_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_external_agent_submission(JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_external_agent_submissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_external_agent_submission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_external_agent_submission(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_external_agent_submission(JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.list_external_agent_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_external_agent_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_external_agent_submission(UUID) TO authenticated;

COMMENT ON TABLE public.external_agent_submissions IS
  'No-key external agent expense proposals. Rows require authenticated FairPay approval before creating expenses.';
