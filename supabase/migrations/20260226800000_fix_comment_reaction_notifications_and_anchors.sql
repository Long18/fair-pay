-- =============================================
-- Fix comment & reaction notifications for all expense participants
-- + Add #comment-{id} anchors to notification links
--
-- Problems:
-- 1. Regular comments only notify @mentions and replies, NOT all expense participants
-- 2. Reactions only notify comment author, NOT all expense participants
-- 3. Notification links don't include comment anchors for scroll-to-comment
-- 4. Missing actor_id in notification INSERTs from older migration (20260225100000)
--
-- Fix:
-- 1. add_expense_comment: notify all expense participants on every comment
--    (excluding commenter, deduplicating with mention/reply recipients)
--    + add #comment-{id} anchor to all notification links
-- 2. toggle_reaction: notify all expense participants on reaction
--    + add #comment-{id} anchor to notification links
-- =============================================

-- ============================================================
-- 1. Recreate add_expense_comment with all-participant notifications
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

  -- Verify caller is participant
  SELECT e.id, e.description, e.context_type, e.group_id, e.friendship_id
  INTO v_expense
  FROM expenses e
  LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = v_user_id
  LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = v_user_id OR f.user_b = v_user_id)
  WHERE e.id = p_expense_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL);

  IF v_expense.id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to comment on this expense';
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
      -- Track who got mention notifications
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
      -- Skip if already notified via mention or reply
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
-- 2. Recreate toggle_reaction with all-participant notifications + anchors
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

  -- Resolve expense_id and verify participation
  IF p_target_type = 'expense' THEN
    SELECT e.id, e.description INTO v_expense_id, v_expense_desc
    FROM expenses e
    LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = v_user_id
    LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = v_user_id OR f.user_b = v_user_id)
    WHERE e.id = p_target_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL);

    v_target_owner_id := NULL;
  ELSE
    SELECT ec.expense_id, e.description, ec.user_id INTO v_expense_id, v_expense_desc, v_target_owner_id
    FROM expense_comments ec
    JOIN expenses e ON ec.expense_id = e.id
    LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = v_user_id
    LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = v_user_id OR f.user_b = v_user_id)
    WHERE ec.id = p_target_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL);
  END IF;

  IF v_expense_id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to react on this target';
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
