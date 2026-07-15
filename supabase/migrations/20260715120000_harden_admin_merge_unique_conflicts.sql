-- Harden admin_merge_profiles against unique_violation (HTTP 409).
-- Root cause: the generic FK remapping loop updated user FKs on tables with
-- UNIQUE(user_id, …) such as balance_history, push_subscriptions,
-- subscriptions, user_attributions, agent_idempotency_keys — colliding when
-- both source and target already had a row for the same key.

BEGIN;

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
  'Admin-only RPC to merge source into target. Dedupes unique-keyed rows before remap, bans source auth, records merge transactions. Idempotent remarge returns noop.';

COMMIT;
