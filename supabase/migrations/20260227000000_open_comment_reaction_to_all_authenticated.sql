-- =============================================
-- Open comment & reaction to all authenticated users
--
-- Problem:
-- Users who can see an expense (e.g. group members) but are not
-- direct participants of a friend-context expense cannot comment
-- or react. The participation check in RPC functions and RLS
-- policies is too restrictive.
--
-- Fix:
-- 1. RLS policies: allow any authenticated user to view/create
--    comments and reactions (SECURITY DEFINER functions handle
--    the actual insert, so RLS INSERT is a safety net)
-- 2. RPC functions: remove participation check from
--    add_expense_comment and toggle_reaction — any authenticated
--    user can comment/react on any expense they know the ID of
-- =============================================

-- ============================================================
-- 1. Replace RLS policies on expense_comments
-- ============================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Participants can view comments" ON expense_comments;
DROP POLICY IF EXISTS "Participants can create comments" ON expense_comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON expense_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON expense_comments;

-- Any authenticated user can view comments
CREATE POLICY "Authenticated users can view comments"
  ON expense_comments FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can create comments (own user_id only)
CREATE POLICY "Authenticated users can create comments"
  ON expense_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. Replace RLS policies on expense_reactions
-- ============================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Participants can view reactions" ON expense_reactions;
DROP POLICY IF EXISTS "Participants can add reactions" ON expense_reactions;
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON expense_reactions;
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON expense_reactions;

-- Any authenticated user can view reactions
CREATE POLICY "Authenticated users can view reactions"
  ON expense_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can add reactions (own user_id only)
CREATE POLICY "Authenticated users can add reactions"
  ON expense_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. Replace RLS policies on comment_mentions
-- ============================================================

DROP POLICY IF EXISTS "Participants can view mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Authenticated users can view mentions" ON comment_mentions;

CREATE POLICY "Authenticated users can view mentions"
  ON comment_mentions FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- 4. Recreate add_expense_comment WITHOUT participation check
-- ============================================================
CREATE OR REPLACE FUNCTION add_expense_comment(
  p_expense_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL,
  p_mentioned_user_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_id UUID;
  v_expense RECORD;
  v_result JSONB;
  v_commenter_name TEXT;
  v_all_participants UUID[];
  v_resolved_mention_ids UUID[];
  v_reply_target_id UUID;
  v_all_sentinel UUID := '00000000-0000-0000-0000-000000000001';
  v_here_sentinel UUID := '00000000-0000-0000-0000-000000000002';
  v_has_all BOOLEAN;
  v_has_here BOOLEAN;
  v_participant_ids UUID[];
  v_commenter_ids UUID[];
  v_uid UUID;
  v_notified_ids UUID[] := '{}';
BEGIN
  -- Get commenter name
  SELECT full_name INTO v_commenter_name FROM profiles WHERE id = v_user_id;

  -- Verify expense exists (no participation check — any authenticated user can comment)
  SELECT e.id, e.description, e.context_type, e.group_id, e.friendship_id
  INTO v_expense
  FROM expenses e
  WHERE e.id = p_expense_id;

  IF v_expense.id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Enforce 1-level threading
  IF p_parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM expense_comments WHERE id = p_parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot reply to a reply. Only 1-level threading is supported.';
    END IF;
  END IF;

  -- Insert comment
  INSERT INTO expense_comments (expense_id, user_id, parent_id, content)
  VALUES (p_expense_id, v_user_id, p_parent_id, p_content)
  RETURNING id INTO v_comment_id;

  -- Resolve all expense participants (payer + split users), excluding commenter
  SELECT ARRAY(
    SELECT DISTINCT uid FROM (
      SELECT e.paid_by_user_id AS uid FROM expenses e WHERE e.id = p_expense_id
      UNION
      SELECT es.user_id AS uid FROM expense_splits es WHERE es.expense_id = p_expense_id AND es.user_id IS NOT NULL
    ) sub
    WHERE uid IS NOT NULL AND uid != v_user_id
  ) INTO v_all_participants;

  -- Resolve @all / @here sentinels
  v_has_all := v_all_sentinel = ANY(p_mentioned_user_ids);
  v_has_here := v_here_sentinel = ANY(p_mentioned_user_ids);

  IF v_has_all THEN
    v_participant_ids := v_all_participants;
  ELSE
    v_participant_ids := '{}';
  END IF;

  IF v_has_here THEN
    SELECT ARRAY(
      SELECT DISTINCT ec.user_id
      FROM expense_comments ec
      WHERE ec.expense_id = p_expense_id AND ec.user_id != v_user_id
    ) INTO v_commenter_ids;
  ELSE
    v_commenter_ids := '{}';
  END IF;

  -- Build resolved mention list (sentinels expanded + direct mentions, excluding sentinels)
  SELECT ARRAY(
    SELECT DISTINCT uid FROM (
      SELECT unnest(v_participant_ids) AS uid
      UNION
      SELECT unnest(v_commenter_ids) AS uid
      UNION
      SELECT unnest(
        ARRAY(SELECT unnest(p_mentioned_user_ids) EXCEPT SELECT v_all_sentinel EXCEPT SELECT v_here_sentinel)
      ) AS uid
    ) sub
    WHERE uid != v_user_id
  ) INTO v_resolved_mention_ids;

  -- Insert mentions
  IF array_length(v_resolved_mention_ids, 1) > 0 THEN
    INSERT INTO comment_mentions (comment_id, mentioned_user_id)
    SELECT v_comment_id, unnest(v_resolved_mention_ids)
    ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
  END IF;

  -- Build result
  SELECT jsonb_build_object(
    'id', ec.id,
    'expense_id', ec.expense_id,
    'user_id', ec.user_id,
    'parent_id', ec.parent_id,
    'content', ec.content,
    'is_edited', ec.is_edited,
    'created_at', ec.created_at,
    'user', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    )
  ) INTO v_result
  FROM expense_comments ec
  JOIN profiles p ON ec.user_id = p.id
  WHERE ec.id = v_comment_id;

  -- ========================================
  -- NOTIFICATIONS (with deduplication)
  -- Priority: mention > reply > general comment
  -- ========================================

  -- A) Notify @mentioned users
  IF array_length(v_resolved_mention_ids, 1) > 0 THEN
    BEGIN
      INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
      SELECT
        uid,
        v_user_id,
        'comment_mention',
        'You were mentioned in a comment',
        v_commenter_name || ' mentioned you on "' || v_expense.description || '"',
        '/expenses/show/' || p_expense_id || '#comment-' || v_comment_id,
        v_comment_id,
        FALSE,
        NOW()
      FROM unnest(v_resolved_mention_ids) AS uid
      WHERE uid != v_user_id
        AND should_send_notification(uid, 'expense_added');
      v_notified_ids := v_resolved_mention_ids;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'add_expense_comment mention notification failed: %', SQLERRM;
    END;
  END IF;

  -- B) Notify parent comment author on reply (if not already notified via mention)
  IF p_parent_id IS NOT NULL THEN
    SELECT user_id INTO v_reply_target_id
    FROM expense_comments WHERE id = p_parent_id;

    IF v_reply_target_id IS NOT NULL
       AND v_reply_target_id != v_user_id
       AND NOT (v_reply_target_id = ANY(v_notified_ids))
    THEN
      BEGIN
        IF should_send_notification(v_reply_target_id, 'expense_added') THEN
          INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
          VALUES (
            v_reply_target_id,
            v_user_id,
            'comment_reply',
            'Someone replied to your comment',
            v_commenter_name || ' replied to your comment on "' || v_expense.description || '"',
            '/expenses/show/' || p_expense_id || '#comment-' || v_comment_id,
            v_comment_id,
            FALSE,
            NOW()
          );
          v_notified_ids := array_append(v_notified_ids, v_reply_target_id);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'add_expense_comment reply notification failed: %', SQLERRM;
      END;
    END IF;
  END IF;

  -- C) Notify remaining expense participants (general comment notification)
  IF array_length(v_all_participants, 1) > 0 THEN
    FOREACH v_uid IN ARRAY v_all_participants
    LOOP
      IF v_uid = ANY(v_notified_ids) THEN
        CONTINUE;
      END IF;

      IF should_send_notification(v_uid, 'expense_added') THEN
        BEGIN
          INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
          VALUES (
            v_uid,
            v_user_id,
            'expense_comment',
            'New comment on expense',
            v_commenter_name || ' commented on "' || v_expense.description || '"',
            '/expenses/show/' || p_expense_id || '#comment-' || v_comment_id,
            v_comment_id,
            FALSE,
            NOW()
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'add_expense_comment participant notification failed for %: %', v_uid, SQLERRM;
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN v_result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION add_expense_comment(UUID, TEXT, UUID, UUID[]) TO authenticated;


-- ============================================================
-- 5. Recreate toggle_reaction WITHOUT participation check
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_target_type TEXT,
  p_target_id UUID,
  p_reaction_type_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_expense_id UUID;
  v_expense_desc TEXT;
  v_target_owner_id UUID;
  v_reactor_name TEXT;
  v_reaction_emoji TEXT;
  v_all_participants UUID[];
  v_uid UUID;
  v_link TEXT;
BEGIN
  -- Validate target_type
  IF p_target_type NOT IN ('expense', 'comment') THEN
    RAISE EXCEPTION 'Invalid target_type. Must be expense or comment.';
  END IF;

  -- Validate reaction type exists and is active
  IF NOT EXISTS (SELECT 1 FROM reaction_types WHERE id = p_reaction_type_id AND is_active = true) THEN
    RAISE EXCEPTION 'Reaction type not found or inactive';
  END IF;

  -- Get reactor name and reaction emoji
  SELECT full_name INTO v_reactor_name FROM profiles WHERE id = v_user_id;
  SELECT emoji INTO v_reaction_emoji FROM reaction_types WHERE id = p_reaction_type_id;

  -- Resolve expense_id (no participation check — any authenticated user can react)
  IF p_target_type = 'expense' THEN
    SELECT e.id, e.description INTO v_expense_id, v_expense_desc
    FROM expenses e
    WHERE e.id = p_target_id;

    v_target_owner_id := NULL;
  ELSE
    SELECT ec.expense_id, e.description, ec.user_id INTO v_expense_id, v_expense_desc, v_target_owner_id
    FROM expense_comments ec
    JOIN expenses e ON ec.expense_id = e.id
    WHERE ec.id = p_target_id;
  END IF;

  IF v_expense_id IS NULL THEN
    RAISE EXCEPTION 'Target not found';
  END IF;

  -- Build notification link with anchor
  IF p_target_type = 'comment' THEN
    v_link := '/expenses/show/' || v_expense_id || '#comment-' || p_target_id;
  ELSE
    v_link := '/expenses/show/' || v_expense_id;
  END IF;

  -- Check if reaction already exists
  SELECT id INTO v_existing_id
  FROM expense_reactions
  WHERE target_type = p_target_type
    AND target_id = p_target_id
    AND user_id = v_user_id
    AND reaction_type_id = p_reaction_type_id;

  IF v_existing_id IS NOT NULL THEN
    -- Remove reaction — no notification needed
    DELETE FROM expense_reactions WHERE id = v_existing_id;
    RETURN jsonb_build_object('action', 'removed', 'reaction_id', v_existing_id);
  ELSE
    -- Add reaction
    INSERT INTO expense_reactions (target_type, target_id, user_id, reaction_type_id)
    VALUES (p_target_type, p_target_id, v_user_id, p_reaction_type_id)
    RETURNING id INTO v_existing_id;

    -- Resolve all expense participants (payer + split users), excluding reactor
    SELECT ARRAY(
      SELECT DISTINCT uid FROM (
        SELECT e.paid_by_user_id AS uid FROM expenses e WHERE e.id = v_expense_id
        UNION
        SELECT es.user_id AS uid FROM expense_splits es WHERE es.expense_id = v_expense_id AND es.user_id IS NOT NULL
      ) sub
      WHERE uid IS NOT NULL AND uid != v_user_id
    ) INTO v_all_participants;

    -- Notify all expense participants
    IF array_length(v_all_participants, 1) > 0 THEN
      FOREACH v_uid IN ARRAY v_all_participants
      LOOP
        IF should_send_notification(v_uid, 'expense_added') THEN
          BEGIN
            IF p_target_type = 'comment' THEN
              INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
              VALUES (
                v_uid,
                v_user_id,
                'comment_reaction',
                'New reaction on a comment',
                v_reactor_name || ' reacted ' || COALESCE(v_reaction_emoji, '') || ' to a comment on "' || v_expense_desc || '"',
                v_link,
                p_target_id,
                FALSE,
                NOW()
              );
            ELSE
              INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
              VALUES (
                v_uid,
                v_user_id,
                'comment_reaction',
                'New reaction on expense',
                v_reactor_name || ' reacted ' || COALESCE(v_reaction_emoji, '') || ' on "' || v_expense_desc || '"',
                v_link,
                p_target_id,
                FALSE,
                NOW()
              );
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'toggle_reaction notification failed for %: %', v_uid, SQLERRM;
          END;
        END IF;
      END LOOP;
    END IF;

    RETURN jsonb_build_object('action', 'added', 'reaction_id', v_existing_id);
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION toggle_reaction(TEXT, UUID, UUID) TO authenticated;


-- ============================================================
-- 6. Recreate get_expense_comments WITHOUT participation check
-- ============================================================
CREATE OR REPLACE FUNCTION get_expense_comments(p_expense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify expense exists (no participation check)
  IF NOT EXISTS (SELECT 1 FROM expenses WHERE id = p_expense_id) THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  SELECT COALESCE(jsonb_agg(comment_data ORDER BY (comment_data->>'created_at')::timestamptz ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', ec.id,
      'expense_id', ec.expense_id,
      'user_id', ec.user_id,
      'parent_id', ec.parent_id,
      'content', ec.content,
      'is_edited', ec.is_edited,
      'edited_at', ec.edited_at,
      'created_at', ec.created_at,
      'updated_at', ec.updated_at,
      'user', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      ),
      'mentions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', cm.mentioned_user_id,
          'full_name', mp.full_name
        ))
        FROM comment_mentions cm
        JOIN profiles mp ON cm.mentioned_user_id = mp.id
        WHERE cm.comment_id = ec.id
      ), '[]'::jsonb),
      'replies', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id,
          'expense_id', r.expense_id,
          'user_id', r.user_id,
          'parent_id', r.parent_id,
          'content', r.content,
          'is_edited', r.is_edited,
          'edited_at', r.edited_at,
          'created_at', r.created_at,
          'updated_at', r.updated_at,
          'user', jsonb_build_object(
            'id', rp.id,
            'full_name', rp.full_name,
            'avatar_url', rp.avatar_url
          ),
          'mentions', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'user_id', rcm.mentioned_user_id,
              'full_name', rmp.full_name
            ))
            FROM comment_mentions rcm
            JOIN profiles rmp ON rcm.mentioned_user_id = rmp.id
            WHERE rcm.comment_id = r.id
          ), '[]'::jsonb)
        ) ORDER BY r.created_at ASC)
        FROM expense_comments r
        JOIN profiles rp ON r.user_id = rp.id
        WHERE r.parent_id = ec.id
      ), '[]'::jsonb)
    ) AS comment_data
    FROM expense_comments ec
    JOIN profiles p ON ec.user_id = p.id
    WHERE ec.expense_id = p_expense_id AND ec.parent_id IS NULL
  ) sub;

  RETURN v_result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_expense_comments(UUID) TO authenticated;
