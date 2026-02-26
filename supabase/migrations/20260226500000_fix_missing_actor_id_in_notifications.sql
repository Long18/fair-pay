-- =============================================
-- Fix missing actor_id in notification INSERTs
--
-- Functions affected:
-- 1. add_expense_comment → comment_mention + comment_reply notifications
-- 2. toggle_reaction → comment_reaction notification
-- 3. notify_admins_on_join_request → group_join_request notification
--
-- Also wraps notification INSERTs in exception handlers for robustness.
-- =============================================

-- ============================================================
-- 1. Recreate add_expense_comment with actor_id + exception handlers
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
BEGIN
  -- Verify expense exists and user has access
  SELECT e.id, e.description
  INTO v_expense
  FROM expenses e
  LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = v_user_id
  LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = v_user_id OR f.user_b = v_user_id)
  WHERE e.id = p_expense_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL);

  IF v_expense.id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to comment on this expense';
  END IF;

  -- Enforce 1-level threading: parent must be a root comment
  IF p_parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM expense_comments WHERE id = p_parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot reply to a reply. Only 1-level threading is supported.';
    END IF;
  END IF;

  -- Insert comment
  INSERT INTO expense_comments (expense_id, user_id, parent_id, content)
  VALUES (p_expense_id, v_user_id, p_parent_id, p_content)
  RETURNING id INTO v_comment_id;

  -- Insert mentions
  IF array_length(p_mentioned_user_ids, 1) > 0 THEN
    INSERT INTO comment_mentions (comment_id, mentioned_user_id)
    SELECT v_comment_id, unnest(p_mentioned_user_ids)
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

  -- Create notifications for mentions (with actor_id)
  IF array_length(p_mentioned_user_ids, 1) > 0 THEN
    BEGIN
      INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
      SELECT
        uid,
        v_user_id,
        'comment_mention',
        'You were mentioned in a comment',
        (SELECT full_name FROM profiles WHERE id = v_user_id) || ' mentioned you on "' || v_expense.description || '"',
        '/expenses/show/' || p_expense_id,
        v_comment_id,
        FALSE,
        NOW()
      FROM unnest(p_mentioned_user_ids) AS uid
      WHERE uid != v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'add_expense_comment mention notification failed: %', SQLERRM;
    END;
  END IF;

  -- Notify parent comment author on reply (with actor_id)
  IF p_parent_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
      SELECT
        ec.user_id,
        v_user_id,
        'comment_reply',
        'Someone replied to your comment',
        (SELECT full_name FROM profiles WHERE id = v_user_id) || ' replied to your comment on "' || v_expense.description || '"',
        '/expenses/show/' || p_expense_id,
        v_comment_id,
        FALSE,
        NOW()
      FROM expense_comments ec
      WHERE ec.id = p_parent_id AND ec.user_id != v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'add_expense_comment reply notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN v_result;
END;
$fn$;


GRANT EXECUTE ON FUNCTION add_expense_comment(UUID, TEXT, UUID, UUID[]) TO authenticated;

-- ============================================================
-- 2. Recreate toggle_reaction with actor_id + exception handler
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
BEGIN
  -- Validate target_type
  IF p_target_type NOT IN ('expense', 'comment') THEN
    RAISE EXCEPTION 'Invalid target_type. Must be expense or comment.';
  END IF;

  -- Validate reaction type exists and is active
  IF NOT EXISTS (SELECT 1 FROM reaction_types WHERE id = p_reaction_type_id AND is_active = true) THEN
    RAISE EXCEPTION 'Reaction type not found or inactive';
  END IF;

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

  -- Check if reaction already exists
  SELECT id INTO v_existing_id
  FROM expense_reactions
  WHERE target_type = p_target_type
    AND target_id = p_target_id
    AND user_id = v_user_id
    AND reaction_type_id = p_reaction_type_id;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM expense_reactions WHERE id = v_existing_id;
    RETURN jsonb_build_object('action', 'removed', 'reaction_id', v_existing_id);
  ELSE
    INSERT INTO expense_reactions (target_type, target_id, user_id, reaction_type_id)
    VALUES (p_target_type, p_target_id, v_user_id, p_reaction_type_id)
    RETURNING id INTO v_existing_id;

    -- Notify target owner (comment author) if not self — with actor_id
    IF v_target_owner_id IS NOT NULL AND v_target_owner_id != v_user_id THEN
      BEGIN
        INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
        VALUES (
          v_target_owner_id,
          v_user_id,
          'comment_reaction',
          'Someone reacted to your comment',
          (SELECT full_name FROM profiles WHERE id = v_user_id) || ' reacted to your comment on "' || v_expense_desc || '"',
          '/expenses/show/' || v_expense_id,
          p_target_id,
          FALSE,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'toggle_reaction notification failed: %', SQLERRM;
      END;
    END IF;

    RETURN jsonb_build_object('action', 'added', 'reaction_id', v_existing_id);
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION toggle_reaction(TEXT, UUID, UUID) TO authenticated;

-- ============================================================
-- 3. Recreate notify_admins_on_join_request with actor_id + exception handler
-- ============================================================
CREATE OR REPLACE FUNCTION notify_admins_on_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_admin RECORD;
  v_requester_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Only fire for new pending requests
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester name
  SELECT COALESCE(full_name, email, 'Someone') INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  -- Get group name
  SELECT name INTO v_group_name
  FROM groups WHERE id = NEW.group_id;

  -- Notify each admin of the group
  FOR v_admin IN
    SELECT user_id FROM group_members
    WHERE group_id = NEW.group_id AND role = 'admin'
  LOOP
    IF should_send_notification(v_admin.user_id, 'group_invite') THEN
      BEGIN
        INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
        VALUES (
          v_admin.user_id,
          NEW.user_id,
          'group_join_request',
          'New Join Request',
          v_requester_name || ' wants to join ' || COALESCE(v_group_name, 'a group'),
          '/groups/show/' || NEW.group_id,
          NEW.group_id,
          FALSE,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_admins_on_join_request failed for admin %: %', v_admin.user_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$fn$;

GRANT ALL ON FUNCTION notify_admins_on_join_request() TO anon;
GRANT ALL ON FUNCTION notify_admins_on_join_request() TO authenticated;
GRANT ALL ON FUNCTION notify_admins_on_join_request() TO service_role;
