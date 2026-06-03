BEGIN;

-- Multiple email addresses per profile. profiles.email remains the
-- compatibility primary email used by older joins and display code.
CREATE TABLE IF NOT EXISTS public.user_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  normalized_email TEXT GENERATED ALWAYS AS (LOWER(BTRIM(email))) STORED,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  receives_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'user'
    CHECK (source IN ('auth', 'profile', 'admin', 'user', 'merge')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_emails_email_format
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS user_emails_normalized_email_key
  ON public.user_emails (normalized_email);

CREATE UNIQUE INDEX IF NOT EXISTS user_emails_one_primary_per_user
  ON public.user_emails (user_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS user_emails_user_id_idx
  ON public.user_emails (user_id, is_primary DESC, created_at ASC);

ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own emails" ON public.user_emails;
CREATE POLICY "Users can view own emails"
  ON public.user_emails
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can insert own emails" ON public.user_emails;
CREATE POLICY "Users can insert own emails"
  ON public.user_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can update own emails" ON public.user_emails;
CREATE POLICY "Users can update own emails"
  ON public.user_emails
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR (SELECT public.is_admin()))
  WITH CHECK (user_id = auth.uid() OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can delete own secondary emails" ON public.user_emails;
CREATE POLICY "Users can delete own secondary emails"
  ON public.user_emails
  FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid() AND is_primary = FALSE) OR (SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_emails TO authenticated;

COMMENT ON TABLE public.user_emails IS
  'Email addresses attached to a FairPay profile. Exactly one primary email is used for default outbound notifications.';
COMMENT ON COLUMN public.user_emails.is_primary IS
  'Primary recipient email for default FairPay email delivery. Synced to profiles.email for backward compatibility.';
COMMENT ON COLUMN public.user_emails.receives_notifications IS
  'Reserved per-address delivery flag. Default workers use the primary email unless an admin explicitly targets addresses.';

-- Seed the table from existing profile/auth email data.
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
  p.id,
  LOWER(BTRIM(p.email)),
  TRUE,
  TRUE,
  TRUE,
  'profile',
  COALESCE(p.created_at, NOW()),
  NOW()
FROM public.profiles p
WHERE p.email IS NOT NULL
  AND BTRIM(p.email) <> ''
  AND p.email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
ON CONFLICT (normalized_email) DO NOTHING;

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
  p.id,
  LOWER(BTRIM(u.email)),
  NOT EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.user_id = p.id
      AND ue.is_primary = TRUE
  ),
  TRUE,
  u.email_confirmed_at IS NOT NULL,
  'auth',
  COALESCE(u.created_at, NOW()),
  NOW()
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IS NOT NULL
  AND BTRIM(u.email) <> ''
  AND u.email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
ON CONFLICT (normalized_email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_profile_primary_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.email IS NULL OR BTRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  v_email := LOWER(BTRIM(NEW.email));

  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.normalized_email = v_email
      AND ue.user_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Email is already attached to another profile';
  END IF;

  UPDATE public.user_emails
  SET is_primary = FALSE,
      updated_at = NOW()
  WHERE user_id = NEW.id
    AND normalized_email <> v_email
    AND is_primary = TRUE;

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
    TRUE,
    'profile',
    NOW(),
    NOW()
  )
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    email = EXCLUDED.email,
    is_primary = TRUE,
    receives_notifications = TRUE,
    is_verified = public.user_emails.is_verified OR EXCLUDED.is_verified,
    updated_at = NOW();

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS sync_profile_primary_email_on_profiles ON public.profiles;
CREATE TRIGGER sync_profile_primary_email_on_profiles
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_primary_email();

CREATE OR REPLACE FUNCTION public.add_user_email(
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_make_primary BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_email_id UUID;
  v_make_primary BOOLEAN;
  v_row JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can manage another user email';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id) THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_email := LOWER(NULLIF(BTRIM(p_email), ''));

  IF v_email IS NULL OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.normalized_email = v_email
      AND ue.user_id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'Email is already attached to another profile';
  END IF;

  v_make_primary := p_make_primary OR NOT EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.user_id = v_user_id
      AND ue.is_primary = TRUE
  );

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
    v_user_id,
    v_email,
    v_make_primary,
    TRUE,
    public.is_admin(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'user' END,
    NOW(),
    NOW()
  )
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    receives_notifications = TRUE,
    updated_at = NOW()
  RETURNING id INTO v_email_id;

  IF v_make_primary THEN
    UPDATE public.user_emails
    SET is_primary = FALSE,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    UPDATE public.user_emails
    SET is_primary = TRUE,
        receives_notifications = TRUE,
        updated_at = NOW()
    WHERE id = v_email_id;

    UPDATE public.profiles
    SET email = v_email,
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  SELECT to_jsonb(ue)
  INTO v_row
  FROM public.user_emails ue
  WHERE ue.id = v_email_id;

  RETURN v_row;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_primary_user_email(
  p_email_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_email public.user_emails%ROWTYPE;
  v_row JSONB;
BEGIN
  SELECT *
  INTO v_email
  FROM public.user_emails
  WHERE id = p_email_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not found';
  END IF;

  IF v_email.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the owner or an administrator can set the primary email';
  END IF;

  UPDATE public.user_emails
  SET is_primary = FALSE,
      updated_at = NOW()
  WHERE user_id = v_email.user_id;

  UPDATE public.user_emails
  SET is_primary = TRUE,
      receives_notifications = TRUE,
      updated_at = NOW()
  WHERE id = v_email.id;

  UPDATE public.profiles
  SET email = v_email.email,
      updated_at = NOW()
  WHERE id = v_email.user_id;

  SELECT to_jsonb(ue)
  INTO v_row
  FROM public.user_emails ue
  WHERE ue.id = v_email.id;

  RETURN v_row;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.remove_user_email(
  p_email_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_email public.user_emails%ROWTYPE;
BEGIN
  SELECT *
  INTO v_email
  FROM public.user_emails
  WHERE id = p_email_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not found';
  END IF;

  IF v_email.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the owner or an administrator can remove an email';
  END IF;

  IF v_email.is_primary THEN
    RAISE EXCEPTION 'Primary email cannot be removed';
  END IF;

  DELETE FROM public.user_emails
  WHERE id = p_email_id;

  RETURN jsonb_build_object('success', TRUE, 'email_id', p_email_id);
END;
$fn$;

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
  v_source_has_auth BOOLEAN;
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

  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_source_user_id
  )
  INTO v_source_has_auth;

  IF v_source_has_auth THEN
    RAISE EXCEPTION 'Cannot merge an authenticated source profile; choose a placeholder profile as source';
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

REVOKE ALL ON FUNCTION public.add_user_email(TEXT, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_primary_user_email(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_user_email(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_merge_profiles(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_user_email(TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_profiles(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.add_user_email(TEXT, UUID, BOOLEAN) IS
  'Owner/admin RPC to attach an email address to a profile, optionally making it the primary delivery email.';
COMMENT ON FUNCTION public.set_primary_user_email(UUID) IS
  'Owner/admin RPC to choose the primary delivery email and sync profiles.email.';
COMMENT ON FUNCTION public.remove_user_email(UUID) IS
  'Owner/admin RPC to remove a non-primary profile email.';
COMMENT ON FUNCTION public.admin_merge_profiles(UUID, UUID) IS
  'Admin-only RPC to merge a placeholder source profile into a target profile and move dependent profile data.';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_emails TEXT[];

COMMENT ON COLUMN public.notifications.recipient_emails IS
  'Optional admin-selected recipient emails for this notification. When NULL, email workers use the user primary email.';

DROP FUNCTION IF EXISTS public.get_email_notification_queue(UUID[], BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_email_notification_queue(
  p_notification_ids UUID[] DEFAULT NULL,
  p_include_recent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  notification_id   UUID,
  user_id           UUID,
  user_email        TEXT,
  user_name         TEXT,
  has_auth_account  BOOLEAN,
  notification_type TEXT,
  title             TEXT,
  message           TEXT,
  link              TEXT,
  created_at        TIMESTAMPTZ,
  email_context     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    n.id                                   AS notification_id,
    n.user_id,
    recipient.user_email                  AS user_email,
    p.full_name                            AS user_name,
    (u.id IS NOT NULL)                     AS has_auth_account,
    n.type                                 AS notification_type,
    n.title,
    n.message,
    n.link,
    n.created_at,
    n.email_context
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN auth.users u ON u.id = n.user_id
  LEFT JOIN public.user_settings us ON us.user_id = n.user_id
  LEFT JOIN LATERAL (
    SELECT ARRAY(
      SELECT DISTINCT ue.email
      FROM unnest(COALESCE(n.recipient_emails, ARRAY[]::TEXT[])) AS requested(email)
      JOIN public.user_emails ue
        ON ue.user_id = n.user_id
       AND ue.normalized_email = LOWER(BTRIM(requested.email))
      WHERE requested.email IS NOT NULL
        AND BTRIM(requested.email) <> ''
        AND ue.receives_notifications = TRUE
      ORDER BY ue.email
    ) AS emails
  ) requested ON TRUE
  LEFT JOIN LATERAL (
    SELECT ue.email
    FROM public.user_emails ue
    WHERE ue.user_id = n.user_id
      AND ue.is_primary = TRUE
      AND ue.receives_notifications = TRUE
    ORDER BY ue.updated_at DESC
    LIMIT 1
  ) primary_email ON TRUE
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN COALESCE(array_length(requested.emails, 1), 0) > 0 THEN requested.emails
      ELSE ARRAY[COALESCE(primary_email.email, NULLIF(p.email, ''), u.email)]
    END
  ) AS recipient(user_email)
  WHERE n.email_sent_at IS NULL
    AND (p_notification_ids IS NULL OR n.id = ANY(p_notification_ids))
    AND (p_include_recent OR n.created_at < now() - interval '2 minutes')
    AND recipient.user_email IS NOT NULL
    AND recipient.user_email <> ''
    AND (us.email_notifications IS NULL OR us.email_notifications = true)
  ORDER BY n.user_id, recipient.user_email, n.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) IS
  'Service-role email queue reader. Uses notification recipient_emails when admin-selected, otherwise uses the user primary email.';

COMMIT;
