-- FairPay Agent API Phase 1A: immutable previews and atomic expense commits.

CREATE TABLE public.agent_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'previewed', 'confirmed', 'committed', 'failed', 'expired')),
  result JSONB,
  error JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL UNIQUE REFERENCES public.agent_operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  preview_data JSONB NOT NULL,
  preview_hash TEXT NOT NULL CHECK (preview_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  is_consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_operations
  ADD CONSTRAINT agent_operations_preview_id_fkey
  FOREIGN KEY (preview_id) REFERENCES public.agent_previews(id) ON DELETE SET NULL;

CREATE TABLE public.agent_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID NOT NULL UNIQUE REFERENCES public.agent_previews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_hash TEXT NOT NULL CHECK (preview_hash ~ '^[0-9a-f]{64}$'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preview_id UUID NOT NULL REFERENCES public.agent_previews(id) ON DELETE CASCADE,
  preview_hash TEXT NOT NULL CHECK (preview_hash ~ '^[0-9a-f]{64}$'),
  confirmation_id UUID NOT NULL REFERENCES public.agent_confirmations(id) ON DELETE CASCADE,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key, user_id)
);

CREATE INDEX agent_operations_user_created_idx
  ON public.agent_operations (user_id, created_at DESC);
CREATE INDEX agent_previews_user_expiry_idx
  ON public.agent_previews (user_id, expires_at);
CREATE INDEX agent_confirmations_user_idx
  ON public.agent_confirmations (user_id);
CREATE INDEX agent_idempotency_user_idx
  ON public.agent_idempotency_keys (user_id, created_at DESC);

ALTER TABLE public.agent_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_previews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_confirmations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_idempotency_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY agent_operations_select_own ON public.agent_operations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY agent_previews_select_own ON public.agent_previews
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY agent_confirmations_select_own ON public.agent_confirmations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY agent_idempotency_select_own ON public.agent_idempotency_keys
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.agent_operations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.agent_previews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.agent_confirmations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.agent_idempotency_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_operations TO authenticated;
GRANT SELECT ON public.agent_previews TO authenticated;
GRANT SELECT ON public.agent_confirmations TO authenticated;
GRANT SELECT ON public.agent_idempotency_keys TO authenticated;

CREATE FUNCTION public.prevent_agent_preview_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF OLD.preview_data IS DISTINCT FROM NEW.preview_data
     OR OLD.preview_hash IS DISTINCT FROM NEW.preview_hash
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.group_id IS DISTINCT FROM NEW.group_id
     OR OLD.operation_id IS DISTINCT FROM NEW.operation_id
     OR OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PREVIEW_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_agent_preview_mutation
  BEFORE UPDATE ON public.agent_previews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agent_preview_mutation();

CREATE FUNCTION public.create_agent_expense_preview(
  p_group_id UUID,
  p_preview_data JSONB,
  p_preview_hash TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_operation_id UUID;
  v_preview_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;
  IF p_preview_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PREVIEW_HASH';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text, 0));
  IF (SELECT count(*) FROM public.agent_operations
      WHERE user_id = v_actor AND created_at >= now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'RATE_LIMIT_EXCEEDED';
  END IF;
  IF p_preview_data->>'actor_user_id' IS DISTINCT FROM v_actor::text
     OR p_preview_data->>'group_id' IS DISTINCT FROM p_group_id::text
     OR p_preview_data->>'currency' IS DISTINCT FROM 'VND' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PREVIEW_CONTEXT';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.group_members gm ON gm.group_id = g.id
    WHERE g.id = p_group_id AND gm.user_id = v_actor AND NOT COALESCE(g.is_archived, false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'GROUP_NOT_ACCESSIBLE';
  END IF;

  INSERT INTO public.agent_operations (user_id, status, metadata)
  VALUES (v_actor, 'previewed', COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_operation_id;

  INSERT INTO public.agent_previews (
    operation_id, user_id, group_id, preview_data, preview_hash
  ) VALUES (
    v_operation_id, v_actor, p_group_id, p_preview_data, p_preview_hash
  ) RETURNING id, expires_at INTO v_preview_id, v_expires_at;

  UPDATE public.agent_operations SET preview_id = v_preview_id WHERE id = v_operation_id;

  RETURN jsonb_build_object(
    'operation_id', v_operation_id,
    'preview_id', v_preview_id,
    'expires_at', v_expires_at
  );
END;
$$;

CREATE FUNCTION public.confirm_agent_preview(
  p_preview_id UUID,
  p_preview_hash TEXT
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
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
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
  WHERE preview_id = p_preview_id FOR UPDATE;
  IF FOUND THEN
    IF v_confirmation.is_used THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'CONFIRMATION_USED';
    END IF;
  ELSE
    INSERT INTO public.agent_confirmations (preview_id, user_id, preview_hash)
    VALUES (p_preview_id, v_actor, p_preview_hash)
    RETURNING * INTO v_confirmation;
  END IF;

  UPDATE public.agent_operations
  SET status = 'confirmed', updated_at = now()
  WHERE id = v_preview.operation_id AND user_id = v_actor;

  RETURN jsonb_build_object(
    'confirmation_id', v_confirmation.id,
    'preview_id', p_preview_id,
    'preview_hash', p_preview_hash,
    'expires_at', v_preview.expires_at
  );
END;
$$;

CREATE FUNCTION public.commit_agent_expense(
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
      AND lower(btrim(e.description)) = lower(v_description)
      AND e.paid_by_user_id = v_payer_user_id
      AND e.expense_date = v_expense_date
      AND e.is_payment = false
      AND e.created_at >= now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'DUPLICATE_EXPENSE';
  END IF;

  INSERT INTO public.expenses (
    context_type, group_id, description, amount, currency, category,
    expense_date, paid_by_user_id, is_payment, created_by, comment
  ) VALUES (
    'group', v_group_id, v_description, v_amount, 'VND', v_category,
    v_expense_date, v_payer_user_id, false, v_actor, v_comment
  ) RETURNING id INTO v_expense_id;

  FOR v_split IN SELECT value FROM jsonb_array_elements(v_splits)
  LOOP
    INSERT INTO public.expense_splits (
      expense_id, user_id, split_method, split_value, computed_amount,
      is_settled, settled_amount, settled_at, pending_email, is_claimed
    ) VALUES (
      v_expense_id, (v_split->>'user_id')::UUID, 'exact',
      (v_split->>'amount')::BIGINT, (v_split->>'amount')::BIGINT,
      (v_split->>'user_id')::UUID = v_payer_user_id,
      CASE WHEN (v_split->>'user_id')::UUID = v_payer_user_id THEN (v_split->>'amount')::BIGINT ELSE 0 END,
      CASE WHEN (v_split->>'user_id')::UUID = v_payer_user_id THEN now() ELSE NULL END,
      NULL, true
    );
  END LOOP;

  UPDATE public.agent_confirmations SET is_used = true, used_at = now()
  WHERE id = p_confirmation_id;
  UPDATE public.agent_previews SET is_consumed = true WHERE id = p_preview_id;

  v_result := jsonb_build_object(
    'success', true, 'expense_id', v_expense_id, 'preview_id', p_preview_id,
    'operation_id', v_preview.operation_id, 'total_amount', v_amount,
    'currency', 'VND', 'splits_count', v_split_count
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

CREATE FUNCTION public.mark_agent_operation_terminal(
  p_preview_id UUID,
  p_status TEXT,
  p_error_code TEXT,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;
  IF p_status NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TERMINAL_STATUS';
  END IF;

  UPDATE public.agent_operations op
  SET status = p_status,
      error = jsonb_build_object('code', left(p_error_code, 100), 'message', left(p_error_message, 500)),
      updated_at = now()
  FROM public.agent_previews preview
  WHERE preview.id = p_preview_id
    AND preview.operation_id = op.id
    AND preview.user_id = v_actor
    AND op.user_id = v_actor
    AND op.status IN ('pending', 'previewed', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'OPERATION_NOT_FOUND';
  END IF;
END;
$$;

CREATE FUNCTION public.expire_agent_previews()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.agent_operations op
  SET status = 'expired', updated_at = now(),
      error = jsonb_build_object('code', 'PREVIEW_EXPIRED', 'message', 'Preview expired without commit')
  FROM public.agent_previews p
  WHERE p.operation_id = op.id AND p.expires_at <= now() AND NOT p.is_consumed
    AND op.status IN ('pending', 'previewed', 'confirmed');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_agent_preview_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_agent_expense_preview(UUID, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_agent_preview(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.commit_agent_expense(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_agent_operation_terminal(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_agent_previews() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_expense_preview(UUID, JSONB, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_agent_preview(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_agent_expense(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_agent_operation_terminal(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_agent_previews() TO service_role;

COMMENT ON FUNCTION public.commit_agent_expense(UUID, TEXT, UUID, TEXT) IS
  'Atomically consumes an immutable confirmed preview and writes one group expense plus all splits.';
