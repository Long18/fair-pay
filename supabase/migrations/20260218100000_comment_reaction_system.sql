-- Migration: Comment & Reaction System for Expenses
-- Date: 2026-02-18
-- Purpose: Add threaded comments, @mentions, reactions (emoji/image/GIF) to expenses

-- ============================================================
-- 1. REACTION TYPES TABLE (Admin-managed catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS reaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  emoji TEXT,
  image_url TEXT,
  media_type TEXT CHECK (media_type IN ('emoji', 'image', 'gif')) NOT NULL DEFAULT 'emoji',
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reaction_types_active ON reaction_types(is_active, sort_order);
CREATE TRIGGER update_reaction_types_updated_at
  BEFORE UPDATE ON reaction_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO reaction_types (code, emoji, media_type, label, sort_order) VALUES
  ('thumbs_up', '👍', 'emoji', 'Thumbs Up', 1),
  ('heart', '❤️', 'emoji', 'Heart', 2),
  ('laugh', '😂', 'emoji', 'Laugh', 3),
  ('wow', '😮', 'emoji', 'Wow', 4),
  ('sad', '😢', 'emoji', 'Sad', 5),
  ('angry', '😡', 'emoji', 'Angry', 6),
  ('fire', '🔥', 'emoji', 'Fire', 7),
  ('clap', '👏', 'emoji', 'Clap', 8),
  ('money', '💰', 'emoji', 'Money', 9),
  ('check', '✅', 'emoji', 'Check', 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. EXPENSE COMMENTS TABLE (Threaded, 1-level replies)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES expense_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON expense_comments(expense_id, created_at);
CREATE INDEX IF NOT EXISTS idx_expense_comments_parent ON expense_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_comments_user ON expense_comments(user_id);

CREATE TRIGGER update_expense_comments_updated_at
  BEFORE UPDATE ON expense_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. COMMENT MENTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES expense_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions(mentioned_user_id);

-- ============================================================
-- 4. EXPENSE REACTIONS TABLE (Polymorphic: expense or comment)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('expense', 'comment')),
  target_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type_id UUID NOT NULL REFERENCES reaction_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, user_id, reaction_type_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_reactions_target ON expense_reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_expense_reactions_user ON expense_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reactions_type ON expense_reactions(reaction_type_id);


-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE reaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- 6.1 reaction_types: everyone reads active, admin manages
CREATE POLICY "Anyone can view active reaction types"
  ON reaction_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anon can view active reaction types"
  ON reaction_types FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Admins can manage reaction types"
  ON reaction_types FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6.2 expense_comments: participants can CRUD
CREATE POLICY "Participants can view comments"
  ON expense_comments FOR SELECT
  TO authenticated
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
      LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
    )
  );

CREATE POLICY "Participants can create comments"
  ON expense_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND expense_id IN (
      SELECT e.id FROM expenses e
      LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
      LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
    )
  );

CREATE POLICY "Users can update own comments"
  ON expense_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON expense_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments"
  ON expense_comments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- 6.3 comment_mentions: participants can read, comment author creates
CREATE POLICY "Participants can view mentions"
  ON comment_mentions FOR SELECT
  TO authenticated
  USING (
    comment_id IN (
      SELECT ec.id FROM expense_comments ec
      JOIN expenses e ON ec.expense_id = e.id
      LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
      LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
    )
  );

CREATE POLICY "Comment authors can create mentions"
  ON comment_mentions FOR INSERT
  TO authenticated
  WITH CHECK (
    comment_id IN (SELECT id FROM expense_comments WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage mentions"
  ON comment_mentions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6.4 expense_reactions: participants can read/toggle
CREATE POLICY "Participants can view reactions"
  ON expense_reactions FOR SELECT
  TO authenticated
  USING (
    (target_type = 'expense' AND target_id IN (
      SELECT e.id FROM expenses e
      LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
      LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
    ))
    OR
    (target_type = 'comment' AND target_id IN (
      SELECT ec.id FROM expense_comments ec
      JOIN expenses e ON ec.expense_id = e.id
      LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
      LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
    ))
  );

CREATE POLICY "Participants can add reactions"
  ON expense_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (target_type = 'expense' AND target_id IN (
        SELECT e.id FROM expenses e
        LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
        LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
        WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
      ))
      OR
      (target_type = 'comment' AND target_id IN (
        SELECT ec.id FROM expense_comments ec
        JOIN expenses e ON ec.expense_id = e.id
        LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
        LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
        WHERE gm.id IS NOT NULL OR f.id IS NOT NULL
      ))
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON expense_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage reactions"
  ON expense_reactions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================
-- 7. RPC FUNCTIONS
-- ============================================================

-- 7.1 Get comments for an expense (with replies, mentions, user profiles)
DROP FUNCTION IF EXISTS get_expense_comments(UUID);
CREATE OR REPLACE FUNCTION get_expense_comments(p_expense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is participant
  IF NOT EXISTS (
    SELECT 1 FROM expenses e
    LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = auth.uid()
    LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
    WHERE e.id = p_expense_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL)
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to view comments for this expense';
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
$$;


-- 7.2 Add a comment (with optional mentions)
DROP FUNCTION IF EXISTS add_expense_comment(UUID, TEXT, UUID, UUID[]);
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
AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID := auth.uid();
  v_expense RECORD;
  v_result JSONB;
BEGIN
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

  -- Create notifications for mentions
  IF array_length(p_mentioned_user_ids, 1) > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_id)
    SELECT
      uid,
      'comment_mention',
      'You were mentioned in a comment',
      (SELECT full_name FROM profiles WHERE id = v_user_id) || ' mentioned you on "' || v_expense.description || '"',
      '/expenses/show/' || p_expense_id,
      v_comment_id
    FROM unnest(p_mentioned_user_ids) AS uid
    WHERE uid != v_user_id;
  END IF;

  -- Notify parent comment author on reply
  IF p_parent_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_id)
    SELECT
      ec.user_id,
      'comment_reply',
      'Someone replied to your comment',
      (SELECT full_name FROM profiles WHERE id = v_user_id) || ' replied to your comment on "' || v_expense.description || '"',
      '/expenses/show/' || p_expense_id,
      v_comment_id
    FROM expense_comments ec
    WHERE ec.id = p_parent_id AND ec.user_id != v_user_id;
  END IF;

  RETURN v_result;
END;
$$;

-- 7.3 Update a comment
DROP FUNCTION IF EXISTS update_expense_comment(UUID, TEXT);
CREATE OR REPLACE FUNCTION update_expense_comment(
  p_comment_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only author can update
  IF NOT EXISTS (SELECT 1 FROM expense_comments WHERE id = p_comment_id AND user_id = auth.uid()) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to update this comment';
  END IF;

  UPDATE expense_comments
  SET content = p_content, is_edited = true, edited_at = NOW(), updated_at = NOW()
  WHERE id = p_comment_id;

  SELECT jsonb_build_object(
    'id', ec.id,
    'content', ec.content,
    'is_edited', ec.is_edited,
    'edited_at', ec.edited_at,
    'updated_at', ec.updated_at
  ) INTO v_result
  FROM expense_comments ec WHERE ec.id = p_comment_id;

  RETURN v_result;
END;
$$;

-- 7.4 Delete a comment
DROP FUNCTION IF EXISTS delete_expense_comment(UUID);
CREATE OR REPLACE FUNCTION delete_expense_comment(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM expense_comments WHERE id = p_comment_id AND user_id = auth.uid()) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this comment';
  END IF;

  DELETE FROM expense_comments WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', p_comment_id);
END;
$$;


-- 7.5 Toggle reaction (add or remove)
DROP FUNCTION IF EXISTS toggle_reaction(TEXT, UUID, UUID);
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_target_type TEXT,
  p_target_id UUID,
  p_reaction_type_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

    -- Notify target owner (comment author) if not self
    IF v_target_owner_id IS NOT NULL AND v_target_owner_id != v_user_id THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_id)
      VALUES (
        v_target_owner_id,
        'comment_reaction',
        'Someone reacted to your comment',
        (SELECT full_name FROM profiles WHERE id = v_user_id) || ' reacted to your comment on "' || v_expense_desc || '"',
        '/expenses/show/' || v_expense_id,
        p_target_id
      );
    END IF;

    RETURN jsonb_build_object('action', 'added', 'reaction_id', v_existing_id);
  END IF;
END;
$$;

-- 7.6 Get reactions for a target
DROP FUNCTION IF EXISTS get_reactions(TEXT, UUID);
CREATE OR REPLACE FUNCTION get_reactions(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(reaction_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'reaction_type_id', rt.id,
      'code', rt.code,
      'emoji', rt.emoji,
      'image_url', rt.image_url,
      'media_type', rt.media_type,
      'label', rt.label,
      'count', COUNT(er.id),
      'user_reacted', bool_or(er.user_id = auth.uid()),
      'users', jsonb_agg(jsonb_build_object(
        'user_id', er.user_id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      ) ORDER BY er.created_at ASC)
    ) AS reaction_data
    FROM expense_reactions er
    JOIN reaction_types rt ON er.reaction_type_id = rt.id
    JOIN profiles p ON er.user_id = p.id
    WHERE er.target_type = p_target_type AND er.target_id = p_target_id
    GROUP BY rt.id, rt.code, rt.emoji, rt.image_url, rt.media_type, rt.label
    ORDER BY COUNT(er.id) DESC, MIN(er.created_at) ASC
  ) sub;

  RETURN v_result;
END;
$$;

-- 7.7 Get all reactions for an expense (expense + all its comments)
DROP FUNCTION IF EXISTS get_expense_all_reactions(UUID);
CREATE OR REPLACE FUNCTION get_expense_all_reactions(p_expense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expense_reactions JSONB;
  v_comment_reactions JSONB;
BEGIN
  SELECT get_reactions('expense', p_expense_id) INTO v_expense_reactions;

  SELECT COALESCE(jsonb_object_agg(ec.id::text, get_reactions('comment', ec.id)), '{}'::jsonb)
  INTO v_comment_reactions
  FROM expense_comments ec
  WHERE ec.expense_id = p_expense_id;

  RETURN jsonb_build_object(
    'expense', v_expense_reactions,
    'comments', v_comment_reactions
  );
END;
$$;


-- ============================================================
-- 8. GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION get_expense_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_expense_comment(UUID, TEXT, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_expense_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_expense_comment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_reaction(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reactions(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_all_reactions(UUID) TO authenticated;

-- ============================================================
-- 9. REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE expense_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_reactions;

-- ============================================================
-- 10. EXTEND NOTIFICATION TYPES
-- ============================================================
-- The notifications table uses TEXT type column without enum constraint,
-- so new types (comment_mention, comment_reply, comment_reaction) work automatically.
-- Frontend NotificationType union will be extended in TypeScript.
