-- Persist recurring/debt reminder preferences on user_settings.
-- Shape (JSONB): {
--   emailReminders: boolean,
--   email: string,
--   reminderDays: number,
--   dailyDigest: boolean,
--   weeklyDigest: boolean,
--   calendarSync: boolean,
--   calendarType: 'google' | 'apple' | 'outlook'
-- }

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS reminder_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN public.user_settings.reminder_preferences IS
  'User reminder preferences for recurring/debt emails (emailReminders, reminderDays, digests, calendar sync).';
