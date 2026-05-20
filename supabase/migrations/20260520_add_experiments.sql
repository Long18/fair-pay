create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  variants jsonb not null default '["control","treatment"]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists experiment_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null,
  variant text not null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, experiment_key)
);

alter table experiment_assignments enable row level security;
create policy "Users can read own assignments" on experiment_assignments for select using (auth.uid() = user_id);
create policy "Users can insert own assignments" on experiment_assignments for insert with check (auth.uid() = user_id);

alter table experiments enable row level security;
create policy "Anyone can read active experiments" on experiments for select using (is_active = true);

-- seed initial experiments
insert into experiments (key, description, variants) values
  ('onboarding_invite_copy', 'CTA copy in referral card', '["control","treatment"]'),
  ('share_prompt_timing', 'When to show share prompt', '["control","treatment"]')
on conflict (key) do nothing;
