-- Fix: merged profiles split on re-login / remarge 409.
--
-- Root cause: admin_merge_profiles moved emails+FKs to the target and deleted
-- the source profiles row, but left source auth.users intact. Sign-in always
-- resolves by auth.uid() → profiles.id, so the source identity reappeared.
-- Remarge then hit unique constraints (HTTP 409). Separately, handle_new_user
-- could ON CONFLICT reassign user_emails.user_id and steal a merged secondary.
--
-- Fix:
-- 1. profile_merge_transactions for durable merge history / idempotency
-- 2. admin_merge_profiles bans source auth.users and returns noop on remarge
-- 3. handle_new_user refuses signup when the email is already owned by a live
--    (non-banned) account via user_emails, and never steals ownership

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Merge transaction audit / idempotency table
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_merge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  source_emails TEXT[] NOT NULL DEFAULT '{}',
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pair_low UUID GENERATED ALWAYS AS (LEAST(source_user_id, target_user_id)) STORED,
  pair_high UUID GENERATED ALWAYS AS (GREATEST(source_user_id, target_user_id)) STORED,
  CONSTRAINT profile_merge_transactions_distinct
    CHECK (source_user_id <> target_user_id),
  CONSTRAINT profile_merge_transactions_pair_key UNIQUE (pair_low, pair_high)
);

CREATE INDEX IF NOT EXISTS profile_merge_transactions_source_idx
  ON public.profile_merge_transactions (source_user_id);

CREATE INDEX IF NOT EXISTS profile_merge_transactions_target_idx
  ON public.profile_merge_transactions (target_user_id);

ALTER TABLE public.profile_merge_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_merge_transactions_admin_select
  ON public.profile_merge_transactions;
CREATE POLICY profile_merge_transactions_admin_select
  ON public.profile_merge_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.profile_merge_transactions IS
  'Audit of profile merges. One row per ordered identity pair; used for idempotent remarge.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Idempotent admin_merge_profiles (ban source auth, record merge)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_merge_profiles(
  p_source_user_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_source public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_fk RECORD;
  v_merge_count INT := 0;
  v_row_count INT := 0;
  v_source_emails TEXT[] := '{}';
  v_existing_merge public.profile_merge_transactions%ROWTYPE;
  v_source_has_auth BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can merge profiles';
  END IF;

  IF p_source_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Source and target profiles must be different';
  END IF;

  SET LOCAL row_security = off;

  -- Idempotent path: prior merge recorded for this pair (source may already be gone)
  SELECT *
  INTO v_existing_merge
  FROM public.profile_merge_transactions pmt
  WHERE LEAST(pmt.source_user_id, pmt.target_user_id)
        = LEAST(p_source_user_id, p_target_user_id)
    AND GREATEST(pmt.source_user_id, pmt.target_user_id)
        = GREATEST(p_source_user_id, p_target_user_id)
  LIMIT 1;

  IF FOUND THEN
    -- Ensure source auth stays banned if it still exists
    UPDATE auth.users
    SET banned_until = 'infinity',
        updated_at = NOW()
    WHERE id = p_source_user_id
      AND (banned_until IS NULL OR banned_until < NOW());

    RETURN jsonb_build_object(
      'success', TRUE,
      'noop', TRUE,
      'source_user_id', p_source_user_id,
      'target_user_id', p_target_user_id,
      'merge_transaction_id', v_existing_merge.id,
      'moved_email_count', 0
    );
  END IF;

  -- Also noop if source profile is already gone but emails live on target
  SELECT *
  INTO v_source
  FROM public.profiles
  WHERE id = p_source_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT *
    INTO v_target
    FROM public.profiles
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target profile not found';
    END IF;

    -- Soft idempotency: source gone, target alive — treat as already merged
    UPDATE auth.users
    SET banned_until = 'infinity',
        updated_at = NOW()
    WHERE id = p_source_user_id
      AND (banned_until IS NULL OR banned_until < NOW());

    INSERT INTO public.profile_merge_transactions (
      source_user_id,
      target_user_id,
      source_emails,
      merged_at
    )
    VALUES (
      p_source_user_id,
      p_target_user_id,
      '{}',
      NOW()
    )
    ON CONFLICT ON CONSTRAINT profile_merge_transactions_pair_key DO NOTHING;

    RETURN jsonb_build_object(
      'success', TRUE,
      'noop', TRUE,
      'source_user_id', p_source_user_id,
      'target_user_id', p_target_user_id,
      'moved_email_count', 0
    );
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  SELECT COALESCE(array_agg(ue.email ORDER BY ue.email), '{}')
  INTO v_source_emails
  FROM public.user_emails ue
  WHERE ue.user_id = p_source_user_id;

  IF COALESCE(array_length(v_source_emails, 1), 0) = 0
     AND v_source.email IS NOT NULL
     AND BTRIM(v_source.email) <> '' THEN
    v_source_emails := ARRAY[LOWER(BTRIM(v_source.email))];
  END IF;

  INSERT INTO public.user_emails (
    user_id,
    email,
    is_primary,
    receives_notifications,
    is_verified,
    source,
    created_at,
    updated_at
  )
  SELECT
    p_target_user_id,
    ue.email,
    FALSE,
    ue.receives_notifications,
    ue.is_verified,
    'merge',
    ue.created_at,
    NOW()
  FROM public.user_emails ue
  WHERE ue.user_id = p_source_user_id
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    user_id = CASE
      WHEN public.user_emails.user_id = p_source_user_id THEN EXCLUDED.user_id
      ELSE public.user_emails.user_id
    END,
    is_primary = CASE
      WHEN public.user_emails.user_id = p_source_user_id THEN FALSE
      ELSE public.user_emails.is_primary
    END,
    receives_notifications = public.user_emails.receives_notifications OR EXCLUDED.receives_notifications,
    is_verified = public.user_emails.is_verified OR EXCLUDED.is_verified,
    source = CASE
      WHEN public.user_emails.user_id = p_source_user_id THEN 'merge'
      ELSE public.user_emails.source
    END,
    updated_at = NOW()
  WHERE public.user_emails.user_id IN (p_source_user_id, p_target_user_id);

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_merge_count := v_merge_count + v_row_count;

  DELETE FROM public.user_emails
  WHERE user_id = p_source_user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.user_id = p_target_user_id
      AND ue.is_primary = TRUE
  ) THEN
    PERFORM public.add_user_email(v_target.email, p_target_user_id, TRUE);
  END IF;

  DELETE FROM public.friendships
  WHERE (user_a = LEAST(p_source_user_id, p_target_user_id)
         AND user_b = GREATEST(p_source_user_id, p_target_user_id))
     OR (user_a = user_b AND user_a IN (p_source_user_id, p_target_user_id));

  DELETE FROM public.payments
  WHERE (from_user = p_source_user_id AND to_user = p_target_user_id)
     OR (from_user = p_target_user_id AND to_user = p_source_user_id);

  DELETE FROM public.payment_events
  WHERE (from_user_id = p_source_user_id AND to_user_id = p_target_user_id)
     OR (from_user_id = p_target_user_id AND to_user_id = p_source_user_id);

  DELETE FROM public.group_members gm
  WHERE gm.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.group_members target
      WHERE target.group_id = gm.group_id
        AND target.user_id = p_target_user_id
    );

  UPDATE public.group_members
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;

  WITH duplicate_splits AS (
    SELECT source.id AS source_id, target.id AS target_id
    FROM public.expense_splits source
    JOIN public.expense_splits target
      ON target.expense_id = source.expense_id
     AND target.user_id = p_target_user_id
    WHERE source.user_id = p_source_user_id
  )
  UPDATE public.expense_splits target
  SET
    computed_amount = target.computed_amount + source.computed_amount,
    split_value = CASE
      WHEN target.split_method = 'exact' AND source.split_method = 'exact'
        THEN COALESCE(target.split_value, 0) + COALESCE(source.split_value, 0)
      ELSE target.split_value
    END,
    settled_amount = COALESCE(target.settled_amount, 0) + COALESCE(source.settled_amount, 0),
    is_settled = (
      COALESCE(target.settled_amount, 0) + COALESCE(source.settled_amount, 0)
    ) >= (target.computed_amount + source.computed_amount),
    settled_at = GREATEST(target.settled_at, source.settled_at)
  FROM duplicate_splits d
  JOIN public.expense_splits source ON source.id = d.source_id
  WHERE target.id = d.target_id;

  DELETE FROM public.expense_splits source
  WHERE source.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.expense_splits target
      WHERE target.expense_id = source.expense_id
        AND target.user_id = p_target_user_id
    );

  UPDATE public.expense_splits
  SET user_id = p_target_user_id,
      pending_email = NULL,
      is_claimed = TRUE
  WHERE user_id = p_source_user_id;

  UPDATE public.member_prepaid_balances target
  SET
    balance_amount = target.balance_amount + source.balance_amount,
    monthly_share_amount = GREATEST(target.monthly_share_amount, source.monthly_share_amount),
    updated_at = NOW()
  FROM public.member_prepaid_balances source
  WHERE source.user_id = p_source_user_id
    AND target.user_id = p_target_user_id
    AND target.recurring_expense_id = source.recurring_expense_id;

  DELETE FROM public.member_prepaid_balances source
  WHERE source.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.member_prepaid_balances target
      WHERE target.recurring_expense_id = source.recurring_expense_id
        AND target.user_id = p_target_user_id
    );

  UPDATE public.member_prepaid_balances
  SET user_id = p_target_user_id,
      updated_at = NOW()
  WHERE user_id = p_source_user_id;

  DELETE FROM public.comment_mentions cm
  WHERE cm.mentioned_user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.comment_mentions target
      WHERE target.comment_id = cm.comment_id
        AND target.mentioned_user_id = p_target_user_id
    );

  UPDATE public.comment_mentions
  SET mentioned_user_id = p_target_user_id
  WHERE mentioned_user_id = p_source_user_id;

  DELETE FROM public.expense_reactions cr
  WHERE cr.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.expense_reactions target
      WHERE target.target_type = cr.target_type
        AND target.target_id = cr.target_id
        AND target.reaction_type_id = cr.reaction_type_id
        AND target.user_id = p_target_user_id
    );

  UPDATE public.expense_reactions
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;

  DELETE FROM public.group_join_requests gjr
  WHERE gjr.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.group_join_requests target
      WHERE target.group_id = gjr.group_id
        AND target.status = gjr.status
        AND target.user_id = p_target_user_id
    );

  UPDATE public.group_join_requests
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;

  IF EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = p_target_user_id) THEN
    DELETE FROM public.user_settings WHERE user_id = p_source_user_id;
  ELSE
    UPDATE public.user_settings SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id) THEN
    DELETE FROM public.user_roles WHERE user_id = p_source_user_id;
  ELSE
    UPDATE public.user_roles SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_tracking_ignored_users WHERE user_id = p_target_user_id) THEN
    DELETE FROM public.user_tracking_ignored_users WHERE user_id = p_source_user_id;
  ELSE
    UPDATE public.user_tracking_ignored_users SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  END IF;

  UPDATE public.friendships
  SET
    user_a = LEAST(
      CASE WHEN user_a = p_source_user_id THEN p_target_user_id ELSE user_a END,
      CASE WHEN user_b = p_source_user_id THEN p_target_user_id ELSE user_b END
    ),
    user_b = GREATEST(
      CASE WHEN user_a = p_source_user_id THEN p_target_user_id ELSE user_a END,
      CASE WHEN user_b = p_source_user_id THEN p_target_user_id ELSE user_b END
    ),
    created_by = CASE WHEN created_by = p_source_user_id THEN p_target_user_id ELSE created_by END,
    updated_at = NOW()
  WHERE user_a = p_source_user_id
     OR user_b = p_source_user_id
     OR created_by = p_source_user_id;

  DELETE FROM public.friendships
  WHERE user_a = user_b;

  UPDATE public.payments
  SET
    from_user = CASE WHEN from_user = p_source_user_id THEN p_target_user_id ELSE from_user END,
    to_user = CASE WHEN to_user = p_source_user_id THEN p_target_user_id ELSE to_user END,
    created_by = CASE WHEN created_by = p_source_user_id THEN p_target_user_id ELSE created_by END
  WHERE from_user = p_source_user_id
     OR to_user = p_source_user_id
     OR created_by = p_source_user_id;

  UPDATE public.payment_events
  SET
    from_user_id = CASE WHEN from_user_id = p_source_user_id THEN p_target_user_id ELSE from_user_id END,
    to_user_id = CASE WHEN to_user_id = p_source_user_id THEN p_target_user_id ELSE to_user_id END,
    actor_user_id = CASE WHEN actor_user_id = p_source_user_id THEN p_target_user_id ELSE actor_user_id END
  WHERE from_user_id = p_source_user_id
     OR to_user_id = p_source_user_id
     OR actor_user_id = p_source_user_id;

  FOR v_fk IN
    SELECT
      kcu.table_schema,
      kcu.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name
     AND ccu.constraint_schema = rc.unique_constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
      AND NOT (
        kcu.table_schema = 'public'
        AND (
          (kcu.table_name = 'user_emails' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'user_settings' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'user_roles' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'user_tracking_ignored_users' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'group_members' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'expense_splits' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'member_prepaid_balances' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'comment_mentions' AND kcu.column_name = 'mentioned_user_id') OR
          (kcu.table_name = 'expense_reactions' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'group_join_requests' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'friendships' AND kcu.column_name IN ('user_a', 'user_b')) OR
          (kcu.table_name = 'payments' AND kcu.column_name IN ('from_user', 'to_user')) OR
          (kcu.table_name = 'payment_events' AND kcu.column_name IN ('from_user_id', 'to_user_id', 'actor_user_id'))
        )
      )
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      v_fk.table_schema,
      v_fk.table_name,
      v_fk.column_name,
      v_fk.column_name
    )
    USING p_target_user_id, p_source_user_id;
  END LOOP;

  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(BTRIM(v_target.full_name), ''), v_source.full_name),
    avatar_url = COALESCE(v_target.avatar_url, v_source.avatar_url),
    updated_at = NOW()
  WHERE id = p_target_user_id;

  DELETE FROM public.profiles
  WHERE id = p_source_user_id;

  -- Ban source auth so Email A cannot sign in as a split identity and remains
  -- occupied (prevents fresh signup recreating a second profile). Prefer ban
  -- over delete to avoid handle_deleted_user side effects.
  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_source_user_id
  )
  INTO v_source_has_auth;

  IF v_source_has_auth THEN
    UPDATE auth.users
    SET banned_until = 'infinity',
        updated_at = NOW()
    WHERE id = p_source_user_id;
  END IF;

  INSERT INTO public.profile_merge_transactions (
    source_user_id,
    target_user_id,
    source_emails,
    merged_at
  )
  VALUES (
    p_source_user_id,
    p_target_user_id,
    v_source_emails,
    NOW()
  )
  ON CONFLICT ON CONSTRAINT profile_merge_transactions_pair_key DO NOTHING;

  RETURN jsonb_build_object(
    'success', TRUE,
    'noop', FALSE,
    'source_user_id', p_source_user_id,
    'target_user_id', p_target_user_id,
    'moved_email_count', v_merge_count,
    'source_auth_banned', v_source_has_auth
  );
END;
$fn$;

COMMENT ON FUNCTION public.admin_merge_profiles(UUID, UUID) IS
  'Admin-only RPC to merge any source profile into a target. Moves data and emails, bans source auth.users, records profile_merge_transactions. Idempotent remarge returns noop success.';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Harden handle_new_user: never steal merged secondary emails
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  old_profile_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_claim_result JSONB;
  v_owned_by UUID;
  fk RECORD;
BEGIN
  SET LOCAL row_security = off;

  PERFORM set_config('fairpay.skip_email_sync', 'on', TRUE);

  v_email := LOWER(BTRIM(NEW.email));
  v_full_name := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'full_name'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'name'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'user_name'), ''),
    split_part(v_email, '@', 1),
    'User'
  );
  v_avatar_url := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'avatar_url'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'picture'), '')
  );

  -- Block signup that would steal an email already attached to a live account
  -- (e.g. merged secondary email on the canonical profile).
  SELECT ue.user_id
  INTO v_owned_by
  FROM public.user_emails ue
  WHERE ue.normalized_email = v_email
    AND ue.user_id <> NEW.id
  LIMIT 1;

  IF v_owned_by IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = v_owned_by
        AND (u.banned_until IS NULL OR u.banned_until < NOW())
    ) THEN
      RAISE EXCEPTION
        'Email is already linked to an existing account. Sign in with your primary email instead.';
    END IF;

    -- Email owned by a placeholder / banned-auth profile → claim that profile
    -- even when profiles.email no longer matches (secondary / merge edge cases).
    IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_owned_by) THEN
      old_profile_id := v_owned_by;
    END IF;
  END IF;

  IF old_profile_id IS NULL THEN
    SELECT p.id
    INTO old_profile_id
    FROM public.profiles p
    WHERE LOWER(p.email) = v_email
    ORDER BY (p.id = NEW.id) DESC, p.created_at ASC
    LIMIT 1
    FOR UPDATE;
  ELSE
    SELECT p.id
    INTO old_profile_id
    FROM public.profiles p
    WHERE p.id = old_profile_id
    FOR UPDATE;
  END IF;

  IF old_profile_id IS NOT NULL AND old_profile_id != NEW.id THEN
    -- Never claim a profile whose auth account is still active (non-banned)
    IF EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = old_profile_id
        AND (u.banned_until IS NULL OR u.banned_until < NOW())
    ) THEN
      RAISE EXCEPTION
        'Email is already linked to an existing account. Sign in with your primary email instead.';
    END IF;

    UPDATE public.profiles
    SET email = v_email || '.old.' || old_profile_id::text,
        updated_at = NOW()
    WHERE id = old_profile_id;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_avatar_url,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();

    UPDATE public.friendships
    SET
      user_a = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN NEW.id ELSE user_b END
        WHEN user_b = old_profile_id THEN CASE WHEN user_a < NEW.id THEN user_a ELSE NEW.id END
        ELSE user_a
      END,
      user_b = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN user_b ELSE NEW.id END
        WHEN user_b = old_profile_id THEN CASE WHEN user_a < NEW.id THEN NEW.id ELSE user_a END
        ELSE user_b
      END,
      created_by = CASE WHEN created_by = old_profile_id THEN NEW.id ELSE created_by END
    WHERE user_a = old_profile_id
       OR user_b = old_profile_id
       OR created_by = old_profile_id;

    FOR fk IN
      SELECT
        kcu.table_schema,
        kcu.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
       AND ccu.constraint_schema = rc.unique_constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
        AND NOT (
          kcu.table_schema = 'public'
          AND kcu.table_name = 'friendships'
          AND kcu.column_name IN ('user_a', 'user_b')
        )
    LOOP
      EXECUTE format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
        fk.table_schema,
        fk.table_name,
        fk.column_name,
        fk.column_name
      )
      USING NEW.id, old_profile_id;
    END LOOP;

    DELETE FROM public.profiles WHERE id = old_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_avatar_url,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
  END IF;

  UPDATE public.user_emails
  SET is_primary = FALSE,
      updated_at = NOW()
  WHERE user_id = NEW.id
    AND normalized_email <> v_email
    AND is_primary = TRUE;

  -- Only take ownership when the row already belongs to NEW.id or the claimed
  -- placeholder. Never reassign another profile's email (merged secondaries).
  INSERT INTO public.user_emails (
    user_id,
    email,
    is_primary,
    receives_notifications,
    is_verified,
    source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    TRUE,
    TRUE,
    NEW.email_confirmed_at IS NOT NULL,
    'auth',
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    user_id = NEW.id,
    is_primary = TRUE,
    receives_notifications = TRUE,
    is_verified = public.user_emails.is_verified OR EXCLUDED.is_verified,
    updated_at = NOW()
  WHERE public.user_emails.user_id IN (NEW.id, COALESCE(old_profile_id, NEW.id));

  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.user_emails ue
    WHERE ue.normalized_email = v_email AND ue.user_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'Email is already linked to an existing account. Sign in with your primary email instead.';
  END IF;

  PERFORM set_config('fairpay.skip_email_sync', 'off', TRUE);

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    v_claim_result := public.claim_pending_email_splits(NEW.id, v_email);

    IF (v_claim_result->>'claimed_count')::int > 0 THEN
      RAISE NOTICE 'Claimed % pending email split(s) for user % (%)',
        v_claim_result->>'claimed_count', NEW.id, v_email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'claim_pending_email_splits failed for user % (%): %', NEW.id, v_email, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles auth signup. Claims placeholders, never steals emails owned by live accounts, maintains user_emails with skip_email_sync during surgery.';

COMMIT;
