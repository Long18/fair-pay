-- Migration: Add simplify_debts setting to groups
-- Description: Allow groups to enable/disable automatic debt simplification
-- Dependencies: 002_groups.sql

-- Add simplify_debts column to groups table
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS simplify_debts BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.groups.simplify_debts IS 'When true, debts are automatically simplified to minimize number of transactions';

-- Update existing groups to have simplify_debts enabled (opt-in for existing groups)
-- Comment out if you want existing groups to default to false
-- UPDATE public.groups SET simplify_debts = true;

