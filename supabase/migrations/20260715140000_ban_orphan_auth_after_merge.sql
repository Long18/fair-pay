-- Fix post-merge empty dashboard for secondary Google logins.
--
-- Root cause: admin_merge_profiles banned auth.users.id = source profile id,
-- but Google OAuth can leave a different auth.users row for the same email
-- (no profiles row after emails moved to the canonical target). That orphan
-- auth still signs in; getIdentity falls back to email-local-part; balances
-- and activity query the wrong uid → empty / debt-free UI.
--
-- Fix: ban every auth.users (and identity email) matching moved emails,
-- repair existing orphans, and expose a session check for the client.

BEGIN;

CREATE OR REPLACE FUNCTION public.ban_auth_users_for_emails(
  p_emails TEXT[],
  p_except_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_norm TEXT[];
  v_count INT := 0;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT lower(btrim(e))), '{}')
  INTO v_norm
  FROM unnest(COALESCE(p_emails, '{}'::text[])) AS e
  WHERE nullif(btrim(e), '') IS NOT NULL;

  IF COALESCE(array_length(v_norm, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE auth.users u
  SET banned_until = 'infinity',
      updated_at = NOW()
  WHERE (p_except_user_id IS NULL OR u.id IS DISTINCT FROM p_except_user_id)
    AND (u.banned_until IS NULL OR u.banned_until < NOW())
    AND (
      lower(u.email) = ANY (v_norm)
      OR EXISTS (
        SELECT 1
        FROM auth.identities i
        WHERE i.user_id = u.id
          AND lower(COALESCE(i.identity_data->>'email', '')) = ANY (v_norm)
      )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

COMMENT ON FUNCTION public.ban_auth_users_for_emails(TEXT[], UUID) IS
  'Ban auth.users whose email or identity email is in p_emails, except p_except_user_id. Used by merge and orphan repair.';

REVOKE ALL ON FUNCTION public.ban_auth_users_for_emails(TEXT[], UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_merge_profiles(p_source_user_id uuid, p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
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

  SELECT *
  INTO v_existing_merge
  FROM public.profile_merge_transactions pmt
  WHERE LEAST(pmt.source_user_id, pmt.target_user_id)
        = LEAST(p_source_user_id, p_target_user_id)
    AND GREATEST(pmt.source_user_id, pmt.target_user_id)
        = GREATEST(p_source_user_id, p_target_user_id)
  LIMIT 1;

  IF FOUND THEN
    UPDATE auth.users
    SET banned_until = 'infinity',
        updated_at = NOW()
    WHERE id = p_source_user_id
      AND (banned_until IS NULL OR banned_until < NOW());

    PERFORM public.ban_auth_users_for_emails(
      COALESCE(v_existing_merge.source_emails, '{}'::text[]),
      p_target_user_id
    );

    RETURN jsonb_build_object(
      'success', TRUE,
      'noop', TRUE,
      'source_user_id', p_source_user_id,
      'target_user_id', p_target_user_id,
      'merge_transaction_id', v_existing_merge.id,
      'moved_email_count', 0
    );
  END IF;

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

    UPDATE auth.users
    SET banned_until = 'infinity',
        updated_at = NOW()
    WHERE id = p_source_user_id
      AND (banned_until IS NULL OR banned_until < NOW());

    PERFORM public.ban_auth_users_for_emails(
      (
        SELECT COALESCE(array_agg(ue.email), '{}'::text[])
        FROM public.user_emails ue
        WHERE ue.user_id = p_target_user_id
      ),
      p_target_user_id
    );

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

  -- Ensure target primary email stays unique on profiles.email before delete
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND LOWER(BTRIM(p.email)) = LOWER(BTRIM(v_source.email))
  ) THEN
    NULL; -- already same primary — fine
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id <> p_target_user_id
      AND p.id <> p_source_user_id
      AND LOWER(BTRIM(p.email)) = LOWER(BTRIM(v_source.email))
  ) THEN
    RAISE EXCEPTION 'Source email is already used by another profile';
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

  -- balance_history UNIQUE (user_id, snapshot_date, currency)
  DELETE FROM public.balance_history bh
  WHERE bh.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.balance_history target
      WHERE target.user_id = p_target_user_id
        AND target.snapshot_date = bh.snapshot_date
        AND target.currency = bh.currency
    );

  UPDATE public.balance_history
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;

  -- push_subscriptions UNIQUE (user_id, endpoint)
  DELETE FROM public.push_subscriptions ps
  WHERE ps.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.push_subscriptions target
      WHERE target.user_id = p_target_user_id
        AND target.endpoint = ps.endpoint
    );

  UPDATE public.push_subscriptions
  SET user_id = p_target_user_id
  WHERE user_id = p_source_user_id;

  -- subscriptions UNIQUE (user_id) — keep target
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_target_user_id) THEN
    DELETE FROM public.subscriptions WHERE user_id = p_source_user_id;
  ELSE
    UPDATE public.subscriptions SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  END IF;

  -- user_attributions UNIQUE (user_id) — keep target
  IF EXISTS (SELECT 1 FROM public.user_attributions WHERE user_id = p_target_user_id) THEN
    DELETE FROM public.user_attributions WHERE user_id = p_source_user_id;
  ELSE
    UPDATE public.user_attributions SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  END IF;

  -- agent_idempotency_keys UNIQUE (idempotency_key, user_id)
  DELETE FROM public.agent_idempotency_keys aik
  WHERE aik.user_id = p_source_user_id
    AND EXISTS (
      SELECT 1
      FROM public.agent_idempotency_keys target
      WHERE target.user_id = p_target_user_id
        AND target.idempotency_key = aik.idempotency_key
    );

  UPDATE public.agent_idempotency_keys
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

  -- Drop duplicate friendship pairs created by the remap (keep oldest)
  DELETE FROM public.friendships a
  USING public.friendships b
  WHERE a.user_a = b.user_a
    AND a.user_b = b.user_b
    AND a.id > b.id;

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

  -- Remaining profile FKs: remapped with conflict-safe fallback
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
          (kcu.table_name = 'payment_events' AND kcu.column_name IN ('from_user_id', 'to_user_id', 'actor_user_id')) OR
          (kcu.table_name = 'balance_history' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'push_subscriptions' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'subscriptions' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'user_attributions' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'agent_idempotency_keys' AND kcu.column_name = 'user_id') OR
          (kcu.table_name = 'profile_merge_transactions')
        )
      )
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
        v_fk.table_schema,
        v_fk.table_name,
        v_fk.column_name,
        v_fk.column_name
      )
      USING p_target_user_id, p_source_user_id;
    EXCEPTION
      WHEN unique_violation THEN
        -- Drop source rows that conflict with an existing target row
        EXECUTE format(
          'DELETE FROM %I.%I WHERE %I = $1',
          v_fk.table_schema,
          v_fk.table_name,
          v_fk.column_name
        )
        USING p_source_user_id;
    END;
  END LOOP;

  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(BTRIM(v_target.full_name), ''), v_source.full_name),
    avatar_url = COALESCE(v_target.avatar_url, v_source.avatar_url),
    updated_at = NOW()
  WHERE id = p_target_user_id;

  DELETE FROM public.profiles
  WHERE id = p_source_user_id;

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

  PERFORM public.ban_auth_users_for_emails(v_source_emails, p_target_user_id);

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
  'Admin-only RPC to merge source into target. Dedupes unique-keyed rows, bans source auth and any other auth.users matching moved emails, records merge transactions. Idempotent remarge returns noop.';

-- Client-facing: detect orphan sessions after merge (JWT may still be valid
-- until refresh even when the user is newly banned).
CREATE OR REPLACE FUNCTION public.get_login_account_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_owner UUID;
  v_primary TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid) THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', TRUE);
  END IF;

  SELECT lower(btrim(u.email))
  INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', FALSE);
  END IF;

  SELECT ue.user_id
  INTO v_owner
  FROM public.user_emails ue
  WHERE ue.normalized_email = v_email
  LIMIT 1;

  IF v_owner IS NULL OR v_owner = v_uid THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', FALSE);
  END IF;

  SELECT p.email
  INTO v_primary
  FROM public.profiles p
  WHERE p.id = v_owner;

  UPDATE auth.users
  SET banned_until = 'infinity',
      updated_at = NOW()
  WHERE id = v_uid
    AND (banned_until IS NULL OR banned_until < NOW());

  RETURN jsonb_build_object(
    'ok', FALSE,
    'reason', 'merged_into_other_account',
    'canonical_user_id', v_owner,
    'primary_email', v_primary
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_login_account_status() IS
  'Returns whether the current auth session maps to a live profile, or was merged into another account.';

GRANT EXECUTE ON FUNCTION public.get_login_account_status() TO authenticated;

-- Repair existing orphans: unbanned auth whose email is owned by a different profile
DO $repair$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT u.email, ue.user_id AS keep_id
    FROM auth.users u
    JOIN public.user_emails ue ON ue.normalized_email = lower(btrim(u.email))
    WHERE ue.user_id IS DISTINCT FROM u.id
      AND (u.banned_until IS NULL OR u.banned_until < NOW())
  LOOP
    PERFORM public.ban_auth_users_for_emails(ARRAY[r.email]::text[], r.keep_id);
  END LOOP;
END;
$repair$;

COMMIT;
