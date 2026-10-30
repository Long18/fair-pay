// Bundled by scripts/bundle-transactional-emails.mjs into
// supabase/functions/_shared/transactional-email.bundle.mjs for the Deno runtime.
export { renderInviteEmail } from "./render-invite";
export { renderDebtReminderEmail } from "./render-debt-reminder";
export { buildReminderViewModel, defaultDebtReminderCopy, formatReminderPlainText } from "./reminder-view-model";
export type {
  BuildReminderViewModelInput,
  DebtReminderCopy,
  DebtReminderEmailInput,
  InviteEmailInput,
  ReminderContextInput,
  ReminderDebtBreakdownItem,
  ReminderGroupBreakdownItem,
  ReminderViewModel,
  RenderedEmail,
} from "./types";
