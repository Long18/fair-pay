export interface ReferralStats {
  totalCodes: number;
  totalSignups: number;
  totalClicks: number;
  activeReferrers: number;
}

export interface ShareDataPoint {
  date: string;
  label: string;
  zalo: number;
  facebook: number;
  copy: number;
  download: number;
}

export interface TopReferrer {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  invite_count: number;
  signup_count: number;
}

export interface OnboardingSteps {
  profile?: boolean;
  friend?: boolean;
  group?: boolean;
  expense?: boolean;
  settle?: boolean;
}

export interface OnboardingRow {
  onboarding_steps: OnboardingSteps | null;
  onboarding_completed: boolean | null;
}

export interface OnboardingFunnelStep {
  key: keyof OnboardingSteps;
  labelKey: string;
  count: number;
  total: number;
  pct: number;
}

export interface StreakBucket {
  label: string;
  bucket: string;
  users: number;
}

export interface DebtAgingSummary {
  usersWithOldDebt: number;
  totalPendingDebt: number;
  remindersSent: number;
}

export interface ActivationFunnel {
  cohort_days: number;
  signups: number;
  first_expense: number;
  active_7d: number;
  signup_to_expense_rate: number;
  signup_to_active_rate: number;
  expense_to_active_rate: number;
}

export interface TrackingHealthEventCount {
  event_name: string;
  count: number;
}

export interface TrackingHealthHourlyBucket {
  hour: string;
  label: string;
  count: number;
}

export interface TrackingHealthTrend {
  hourly: TrackingHealthHourlyBucket[];
  current_total_events: number;
  prior_total_events: number;
  delta_absolute: number;
  delta_percent: number | null;
}

export interface TrackingHealth {
  window_hours: number;
  total_events: number;
  distinct_events: number;
  events: TrackingHealthEventCount[];
}

export interface EmailStats {
  totalSent: number;
  sentLast7Days: number;
  pending: number;
}

export interface SentEmail {
  id: string;
  user_id: string;
  type: string;
  email_sent_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface UserEmailGroup {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  emails: SentEmail[];
  lastSent: string;
}

export interface TypeEmailGroup {
  type: string;
  count: number;
  lastSent: string;
}

export interface DayEmailPoint {
  date: string;
  label: string;
  count: number;
}

export interface SubscriptionStats {
  freeUsers: number;
  proUsers: number;
}

export interface Experiment {
  id: string;
  key: string;
  description: string | null;
  variants: string[];
  is_active: boolean;
  created_at: string;
}

export interface ExperimentAssignment {
  experiment_key: string;
  variant: string;
}
