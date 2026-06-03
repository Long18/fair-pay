BEGIN;

-- Allow merging any two profiles regardless of auth account status.
-- The source profile is fully deleted; its emails are moved to the target
-- via user_emails, so both email addresses remain attached to the target.
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can merge profiles';
  END IF;

  IF p_source_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Source and target profiles must be different';
  END IF;

  SELECT *
  INTO v_source
  FROM public.profiles
  WHERE id = p_source_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source profile not found';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  SET LOCAL row_security = off;

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

  RETURN jsonb_build_object(
    'success', TRUE,
    'source_user_id', p_source_user_id,
    'target_user_id', p_target_user_id,
    'moved_email_count', v_merge_count
  );
END;
$fn$;

COMMENT ON FUNCTION public.admin_merge_profiles(UUID, UUID) IS
  'Admin-only RPC to merge any source profile into a target profile. All data and emails are moved to the target; the source profile is deleted.';

COMMIT;
