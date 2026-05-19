-- Add onboarding progress tracking to profiles
alter table profiles
  add column if not exists onboarding_steps jsonb default '{}'::jsonb,
  add column if not exists onboarding_completed boolean default false;
