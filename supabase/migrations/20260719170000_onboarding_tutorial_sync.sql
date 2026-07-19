-- Phase 4C: persist onboarding tutorial progress on profiles (localStorage remains cache).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_tutorial jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.onboarding_tutorial IS
  'Tutorial shell progress (completed, lastStepIndex, etc.). Checklist steps remain in onboarding_steps.';
