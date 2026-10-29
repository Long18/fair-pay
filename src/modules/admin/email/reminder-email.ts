import { renderDebtReminderEmail, type DebtReminderEmailInput, type RenderedEmail } from "@fairpay/emails";
import { ensureEmailRenderReady } from "./ensure-render-ready";

export type {
  ReminderDebtBreakdownItem,
  ReminderDebtTransaction,
  ReminderGroupBreakdownItem,
} from "@fairpay/emails";

export type ReminderEmailPreviewInput = DebtReminderEmailInput;
export type ReminderEmailPreview = RenderedEmail;

export async function buildReminderEmailPreview(input: ReminderEmailPreviewInput): Promise<ReminderEmailPreview> {
  await ensureEmailRenderReady();
  return renderDebtReminderEmail(input);
}
