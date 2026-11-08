-- Local bootstrap only: types/objects present on remote but missing from baseline.sql.
-- Safe to run repeatedly (idempotent). Not applied on production via this path.

DO $$
BEGIN
  CREATE TYPE public.expense_category AS ENUM (
    'Food & Drink',
    'Transportation',
    'Accommodation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Education',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

COMMENT ON TYPE public.expense_category IS
  'Valid expense categories synchronized with frontend (local bootstrap gap fill).';
