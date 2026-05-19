-- Referral codes: one per user
create table if not exists referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  code text unique not null,
  created_at timestamptz default now()
);

-- Referral events: track signup/activation per referral
create table if not exists referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references profiles(id) on delete set null,
  referred_user_id uuid references profiles(id) on delete cascade,
  event_type text not null check (event_type in ('signup', 'first_expense', 'active_30d')),
  created_at timestamptz default now()
);

-- RLS
alter table referral_codes enable row level security;
alter table referral_events enable row level security;

create policy "Users can view their own referral code" on referral_codes
  for select using (auth.uid() = user_id);

create policy "Users can insert their own referral code" on referral_codes
  for insert with check (auth.uid() = user_id);

create policy "Users can view their own referral events" on referral_events
  for select using (auth.uid() = referrer_id);
