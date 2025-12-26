-- Enable public read access for leaderboard and stats
-- This allows unauthenticated users to view data on the public dashboard
-- Write operations still require authentication

-- Profiles: Public read access
CREATE POLICY "profiles_public_read"
ON profiles FOR SELECT
TO anon
USING (true);

-- Groups: Public read access
CREATE POLICY "groups_public_read"
ON groups FOR SELECT
TO anon
USING (true);

-- Group Members: Public read access
CREATE POLICY "group_members_public_read"
ON group_members FOR SELECT
TO anon
USING (true);

-- Expenses: Public read access
CREATE POLICY "expenses_public_read"
ON expenses FOR SELECT
TO anon
USING (true);

-- Expense Splits: Public read access
CREATE POLICY "expense_splits_public_read"
ON expense_splits FOR SELECT
TO anon
USING (true);

-- Payments: Public read access
CREATE POLICY "payments_public_read"
ON payments FOR SELECT
TO anon
USING (true);

-- Note: Write operations (INSERT, UPDATE, DELETE) still require authentication
-- These policies only allow SELECT for anonymous users
