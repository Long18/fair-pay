-- Migration: 001_initial_schema.sql
-- Description: Complete FairPay database schema with all tables, RLS policies, functions, and indexes
-- Date: 2025-12-26
-- This is a consolidated migration that includes all features with fixes applied from the start

BEGIN;

-- ========================================
-- EXTENSIONS
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- HELPER FUNCTIONS (Reusable)
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 1: PROFILES TABLE
-- ========================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);

-- ========================================
-- PART 2: USER ROLES (RBAC)
-- ========================================

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ========================================
-- PART 3: GROUPS AND GROUP MEMBERS
-- ========================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  simplify_debts BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_user_id_group_id ON group_members(user_id, group_id);

-- RLS for groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "View own created groups"
  ON groups FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Helper function to check group membership (non-recursive)
CREATE OR REPLACE FUNCTION user_is_group_member(group_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = group_uuid
      AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_is_group_member(UUID) TO authenticated;

CREATE POLICY "View member groups"
  ON groups FOR SELECT
  TO authenticated
  USING (user_is_group_member(id));

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin())
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Group creator can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- Group members policies
CREATE POLICY "Users can view own membership"
  ON group_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Group creators can view members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Group members can view other members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Users can leave or creators can remove members"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Auto-add creator as admin member
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_admin();

-- ========================================
-- PART 4: FRIENDSHIPS
-- ========================================

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT different_users CHECK (user_a != user_b),
  CONSTRAINT ordered_users CHECK (user_a < user_b)
);

CREATE INDEX idx_friendships_user_a ON friendships(user_a);
CREATE INDEX idx_friendships_user_b ON friendships(user_b);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_user_a_status ON friendships(user_a, status) WHERE status = 'accepted';
CREATE INDEX idx_friendships_user_b_status ON friendships(user_b, status) WHERE status = 'accepted';
CREATE INDEX idx_friendships_users_status ON friendships(user_a, user_b, status) WHERE status = 'accepted';

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_a = auth.uid() OR user_b = auth.uid())
    AND created_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "Users can update their friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid() OR is_admin())
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid() OR is_admin());

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid() OR is_admin());

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
CREATE OR REPLACE FUNCTION get_friendship(user_id_1 UUID, user_id_2 UUID)
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM friendships
  WHERE (user_a = LEAST(user_id_1, user_id_2) AND user_b = GREATEST(user_id_1, user_id_2))
     OR (user_a = LEAST(user_id_2, user_id_1) AND user_b = GREATEST(user_id_2, user_id_1))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION are_friends(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_a = user_id_1 AND user_b = user_id_2) OR (user_a = user_id_2 AND user_b = user_id_1))
      AND status = 'accepted'
  );
$$;

-- ========================================
-- PART 5: EXPENSES AND SPLITS
-- ========================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('group', 'friend')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  category TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_payment BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT context_required CHECK (
    (context_type = 'group' AND group_id IS NOT NULL AND friendship_id IS NULL) OR
    (context_type = 'friend' AND friendship_id IS NOT NULL AND group_id IS NULL)
  )
);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'exact', 'percentage')),
  split_value DECIMAL(12, 2),
  computed_amount DECIMAL(12, 2) NOT NULL CHECK (computed_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Indexes
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_friendship_id ON expenses(friendship_id);
CREATE INDEX idx_expenses_paid_by_user_id ON expenses(paid_by_user_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_group_id_context ON expenses(group_id, context_type) WHERE context_type = 'group';
CREATE INDEX idx_expenses_friendship_id_context ON expenses(friendship_id, context_type) WHERE context_type = 'friend';
CREATE INDEX idx_expenses_expense_date_user ON expenses(expense_date DESC, paid_by_user_id);
CREATE INDEX idx_expenses_paid_by_user_amount ON expenses(paid_by_user_id, amount, is_payment) WHERE is_payment = false;
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_expense_user ON expense_splits(expense_id, user_id);
CREATE INDEX idx_expense_splits_user_computed ON expense_splits(user_id, computed_amount);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Participants can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    (context_type = 'group' AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
    OR
    (context_type = 'friend' AND friendship_id IN (
      SELECT id FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

CREATE POLICY "Group members or friends can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (context_type = 'group' AND group_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = expenses.group_id AND user_id = auth.uid()
        )
        OR is_admin()
      ))
      OR
      (context_type = 'friend' AND friendship_id IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM friendships
          WHERE id = expenses.friendship_id
          AND (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
        )
        OR is_admin()
      ))
    )
  );

CREATE POLICY "Expense creator can update"
  ON expenses FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin())
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Expense creator can delete"
  ON expenses FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- Expense splits policies
CREATE POLICY "Can view splits for accessible expenses"
  ON expense_splits FOR SELECT
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE
        (context_type = 'group' AND group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ))
        OR
        (context_type = 'friend' AND friendship_id IN (
          SELECT id FROM friendships
          WHERE (user_a = auth.uid() OR user_b = auth.uid())
            AND status = 'accepted'
        ))
    )
  );

CREATE POLICY "Expense creator can add splits"
  ON expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Expense creator can update splits"
  ON expense_splits FOR UPDATE
  TO authenticated
  USING (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Expense creator can delete splits"
  ON expense_splits FOR DELETE
  TO authenticated
  USING (
    expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid())
    OR is_admin()
  );

-- ========================================
-- PART 6: PAYMENTS
-- ========================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('group', 'friend')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT context_required CHECK (
    (context_type = 'group' AND group_id IS NOT NULL AND friendship_id IS NULL) OR
    (context_type = 'friend' AND friendship_id IS NOT NULL AND group_id IS NULL)
  ),
  CONSTRAINT different_users CHECK (from_user != to_user)
);

CREATE INDEX idx_payments_group_id ON payments(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_payments_friendship_id ON payments(friendship_id) WHERE friendship_id IS NOT NULL;
CREATE INDEX idx_payments_from_user ON payments(from_user);
CREATE INDEX idx_payments_to_user ON payments(to_user);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_from_user_date ON payments(from_user, created_at DESC);
CREATE INDEX idx_payments_to_user_date ON payments(to_user, created_at DESC);
CREATE INDEX idx_payments_users ON payments(from_user, to_user);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved parties can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    (from_user = auth.uid() OR to_user = auth.uid())
    OR
    (context_type = 'group' AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
    OR
    (context_type = 'friend' AND friendship_id IN (
      SELECT id FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

CREATE POLICY "Users can record payments they make"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user = auth.uid()
    AND created_by = auth.uid()
    AND (
      (context_type = 'group' AND group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      ))
      OR
      (context_type = 'friend' AND friendship_id IN (
        SELECT id FROM friendships
        WHERE (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
      ))
    )
  );

CREATE POLICY "Payment creator can delete"
  ON payments FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- ========================================
-- PART 7: ATTACHMENTS
-- ========================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_attachments_expense_id ON attachments(expense_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their expenses"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE
        (context_type = 'group' AND group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ))
        OR
        (context_type = 'friend' AND friendship_id IN (
          SELECT id FROM friendships
          WHERE (user_a = auth.uid() OR user_b = auth.uid())
            AND status = 'accepted'
        ))
    )
  );

CREATE POLICY "Users can upload attachments to their expenses"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- ========================================
-- PART 8: NOTIFICATIONS
-- ========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread_created ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type_created ON notifications(type, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- PART 9: RECURRING EXPENSES
-- ========================================

CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  "interval" INT NOT NULL DEFAULT 1 CHECK ("interval" > 0),
  next_occurrence DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_recurring_expenses_template ON recurring_expenses(template_expense_id);
CREATE INDEX idx_recurring_expenses_active ON recurring_expenses(is_active, next_occurrence) WHERE is_active = true;

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring expenses for their expenses"
  ON recurring_expenses FOR SELECT
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring expenses for their expenses"
  ON recurring_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    template_expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their recurring expenses"
  ON recurring_expenses FOR UPDATE
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    template_expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their recurring expenses"
  ON recurring_expenses FOR DELETE
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function for calculating next occurrence
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_interval_value INT
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 day');
    WHEN 'weekly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 week');
    WHEN 'monthly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 month');
    WHEN 'yearly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 year');
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;
END;
$$;

-- ========================================
-- PART 10: USER SETTINGS
-- ========================================

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_currency TEXT DEFAULT 'VND',
  number_format TEXT DEFAULT 'vi-VN',
  email_notifications BOOLEAN DEFAULT TRUE,
  notify_on_expense_added BOOLEAN DEFAULT TRUE,
  notify_on_payment_received BOOLEAN DEFAULT TRUE,
  notify_on_friend_request BOOLEAN DEFAULT TRUE,
  notify_on_group_invite BOOLEAN DEFAULT TRUE,
  allow_friend_requests BOOLEAN DEFAULT TRUE,
  allow_group_invites BOOLEAN DEFAULT TRUE,
  profile_visibility TEXT DEFAULT 'friends' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- PART 11: AUDIT LOGS
-- ========================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- ========================================
-- PART 12: BALANCE CALCULATION FUNCTIONS
-- ========================================

-- Function to calculate user's global balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_owed_to_me NUMERIC,
  total_i_owe NUMERIC,
  net_balance NUMERIC
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_owed_to_me NUMERIC := 0;
  v_i_owe NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN e.paid_by_user_id = p_user_id THEN
        e.amount - COALESCE((
          SELECT computed_amount
          FROM expense_splits
          WHERE expense_id = e.id AND user_id = p_user_id
        ), 0)
      ELSE 0
    END
  ), 0) INTO v_owed_to_me
  FROM expenses e
  WHERE e.is_payment = false
    AND (
      e.paid_by_user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = p_user_id
      )
    );

  SELECT COALESCE(SUM(es.computed_amount), 0) INTO v_i_owe
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.paid_by_user_id != p_user_id
    AND e.is_payment = false;

  v_owed_to_me := v_owed_to_me - COALESCE((
    SELECT SUM(amount) FROM payments WHERE from_user = p_user_id
  ), 0);

  v_i_owe := v_i_owe - COALESCE((
    SELECT SUM(amount) FROM payments WHERE to_user = p_user_id
  ), 0);

  RETURN QUERY SELECT
    GREATEST(v_owed_to_me, 0),
    GREATEST(v_i_owe, 0),
    v_owed_to_me - v_i_owe;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_balance(UUID) TO authenticated;

-- Function to simplify debts within a group
CREATE OR REPLACE FUNCTION simplify_group_debts(p_group_id UUID)
RETURNS TABLE (
  from_user_id UUID,
  to_user_id UUID,
  amount NUMERIC
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH balances AS (
    SELECT
      es.user_id,
      SUM(es.computed_amount) - COALESCE((
        SELECT SUM(e2.amount)
        FROM expenses e2
        WHERE e2.group_id = p_group_id
          AND e2.paid_by_user_id = es.user_id
          AND e2.is_payment = false
      ), 0) as net_balance
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND e.is_payment = false
    GROUP BY es.user_id
  ),
  debtors AS (
    SELECT user_id, ABS(net_balance) as amount
    FROM balances
    WHERE net_balance > 0
    ORDER BY amount DESC
  ),
  creditors AS (
    SELECT user_id, ABS(net_balance) as amount
    FROM balances
    WHERE net_balance < 0
    ORDER BY amount DESC
  )
  SELECT
    d.user_id as from_user_id,
    c.user_id as to_user_id,
    LEAST(d.amount, c.amount) as amount
  FROM debtors d
  CROSS JOIN creditors c
  WHERE d.amount > 0 AND c.amount > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION simplify_group_debts(UUID) TO authenticated;

-- Function to get aggregated debts for a user
CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  amount NUMERIC,
  i_owe_them BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH debt_calculations AS (
    SELECT
      CASE
        WHEN owes_user = p_user_id THEN owed_user
        WHEN owed_user = p_user_id THEN owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN owes_user = p_user_id THEN amount_owed
        WHEN owed_user = p_user_id THEN -amount_owed
        ELSE 0
      END as signed_amount
    FROM user_debts_summary
    WHERE owes_user = p_user_id OR owed_user = p_user_id
  )
  SELECT
    dc.other_user_id,
    p.full_name,
    ABS(dc.signed_amount),
    dc.signed_amount > 0 as i_owe_them
  FROM debt_calculations dc
  JOIN profiles p ON p.id = dc.other_user_id
  WHERE dc.other_user_id IS NOT NULL
    AND dc.signed_amount != 0
  ORDER BY ABS(dc.signed_amount) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;

-- Function to get leaderboard data (public stats)
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_limit INTEGER DEFAULT 5,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  top_debtors JSONB,
  top_creditors JSONB,
  stats JSONB
)
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_top_debtors JSONB;
  v_top_creditors JSONB;
  v_stats JSONB;
BEGIN
  -- Get top debtors (people who owe the most)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.full_name,
      'avatar_url', p.avatar_url,
      'balance', COALESCE(balance_agg.total_debt, 0)
    ) ORDER BY balance_agg.total_debt DESC
  ), '[]'::jsonb)
  INTO v_top_debtors
  FROM profiles p
  INNER JOIN (
    SELECT es.user_id, SUM(es.computed_amount) as total_debt
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id != e.paid_by_user_id
    GROUP BY es.user_id
    HAVING SUM(es.computed_amount) > 0
  ) balance_agg ON p.id = balance_agg.user_id
  ORDER BY balance_agg.total_debt DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Get top creditors (people owed the most)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.full_name,
      'avatar_url', p.avatar_url,
      'balance', COALESCE(balance_agg.total_credit, 0)
    ) ORDER BY balance_agg.total_credit DESC
  ), '[]'::jsonb)
  INTO v_top_creditors
  FROM profiles p
  INNER JOIN (
    SELECT e.paid_by_user_id as user_id,
           SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) as total_credit
    FROM expenses e
    LEFT JOIN expense_splits es ON e.id = es.expense_id
    GROUP BY e.paid_by_user_id
    HAVING SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) > 0
  ) balance_agg ON p.id = balance_agg.user_id
  ORDER BY balance_agg.total_credit DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'total_transactions', (SELECT COUNT(*) FROM expenses) + (SELECT COUNT(*) FROM payments),
    'total_amount_tracked', COALESCE((SELECT SUM(amount) FROM expenses), 0),
    'generated_at', NOW()
  ) INTO v_stats;

  RETURN QUERY SELECT v_top_debtors, v_top_creditors, v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_data(INTEGER, INTEGER) TO anon;

-- ========================================
-- PART 13: REPORTING VIEWS
-- ========================================

-- View for user debts summary
CREATE OR REPLACE VIEW user_debts_summary AS
SELECT
  es.user_id as owes_user,
  e.paid_by_user_id as owed_user,
  SUM(es.computed_amount) as amount_owed
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
GROUP BY es.user_id, e.paid_by_user_id
HAVING SUM(es.computed_amount) > 0;

-- ========================================
-- FINAL VERIFICATION
-- ========================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f';

  RAISE NOTICE '✓ Database schema created successfully';
  RAISE NOTICE '  - Tables: %', table_count;
  RAISE NOTICE '  - RLS Policies: %', policy_count;
  RAISE NOTICE '  - Functions: %', function_count;
END $$;

COMMIT;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE user_roles IS 'RBAC role assignments (admin/user)';
COMMENT ON TABLE groups IS 'Expense groups for organizing shared expenses';
COMMENT ON TABLE group_members IS 'Many-to-many relationship between groups and users';
COMMENT ON TABLE friendships IS '1-on-1 friend connections between users';
COMMENT ON TABLE expenses IS 'Expenses shared among group members or friends';
COMMENT ON TABLE expense_splits IS 'How an expense is split among participants';
COMMENT ON TABLE payments IS 'Settlement payments between users to clear debts';
COMMENT ON TABLE attachments IS 'File attachments (receipts) for expenses';
COMMENT ON TABLE notifications IS 'User notifications for various events';
COMMENT ON TABLE recurring_expenses IS 'Recurring expense templates and schedules';
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON TABLE audit_logs IS 'Audit trail for data changes';
