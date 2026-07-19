-- Phase 3 stickiness: budgets, custom expense categories, expense templates.

-- ---------------------------------------------------------------------------
-- budgets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  period TEXT NOT NULL DEFAULT 'month' CHECK (period = 'month'),
  year_month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budgets_year_month_format CHECK (year_month ~ '^\d{4}-\d{2}$'),
  CONSTRAINT budgets_category_not_blank CHECK (length(btrim(category)) > 0),
  CONSTRAINT budgets_user_category_month_unique UNIQUE (user_id, category, year_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_year_month
  ON public.budgets (user_id, year_month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budgets_select_own ON public.budgets;
CREATE POLICY budgets_select_own
  ON public.budgets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_insert_own ON public.budgets;
CREATE POLICY budgets_insert_own
  ON public.budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_update_own ON public.budgets;
CREATE POLICY budgets_update_own
  ON public.budgets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_delete_own ON public.budgets;
CREATE POLICY budgets_delete_own
  ON public.budgets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.budgets FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;

-- ---------------------------------------------------------------------------
-- expense_categories (system defaults: user_id IS NULL)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT expense_categories_user_name_unique UNIQUE (user_id, name)
);

-- Partial unique for system defaults (user_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_system_name_unique
  ON public.expense_categories (name)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_categories_user
  ON public.expense_categories (user_id);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_select_visible ON public.expense_categories;
CREATE POLICY expense_categories_select_visible
  ON public.expense_categories
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS expense_categories_insert_own ON public.expense_categories;
CREATE POLICY expense_categories_insert_own
  ON public.expense_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS expense_categories_update_own ON public.expense_categories;
CREATE POLICY expense_categories_update_own
  ON public.expense_categories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS expense_categories_delete_own ON public.expense_categories;
CREATE POLICY expense_categories_delete_own
  ON public.expense_categories
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.expense_categories FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;

-- Seed system defaults (idempotent)
INSERT INTO public.expense_categories (user_id, name, icon)
SELECT NULL, v.name, v.icon
FROM (
  VALUES
    ('Food & Drink', 'utensils'),
    ('Transportation', 'car'),
    ('Accommodation', 'home'),
    ('Entertainment', 'film'),
    ('Shopping', 'shopping-cart'),
    ('Utilities', 'zap'),
    ('Healthcare', 'heart'),
    ('Education', 'briefcase'),
    ('Other', 'more-horizontal')
) AS v(name, icon)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expense_categories ec
  WHERE ec.user_id IS NULL AND ec.name = v.name
);

-- ---------------------------------------------------------------------------
-- expense_templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  split_hint JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_templates_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT expense_templates_category_not_blank CHECK (length(btrim(category)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_expense_templates_user
  ON public.expense_templates (user_id, created_at DESC);

ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_templates_select_own ON public.expense_templates;
CREATE POLICY expense_templates_select_own
  ON public.expense_templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS expense_templates_insert_own ON public.expense_templates;
CREATE POLICY expense_templates_insert_own
  ON public.expense_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS expense_templates_update_own ON public.expense_templates;
CREATE POLICY expense_templates_update_own
  ON public.expense_templates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS expense_templates_delete_own ON public.expense_templates;
CREATE POLICY expense_templates_delete_own
  ON public.expense_templates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.expense_templates FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_templates TO authenticated;
