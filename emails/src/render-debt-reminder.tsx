import { render } from "@react-email/render";
import { DebtReminderEmailView } from "./debt-reminder-email";
import { buildReminderViewModel, formatReminderPlainText } from "./reminder-view-model";
import type { DebtReminderEmailInput, RenderedEmail, ReminderViewModel } from "./types";

export async function renderDebtReminderViewModel(vm: ReminderViewModel): Promise<RenderedEmail> {
  const html = await render(<DebtReminderEmailView vm={vm} />);
  return { subject: vm.subject, previewText: vm.preheader, html, text: formatReminderPlainText(vm) };
}

export async function renderDebtReminderEmail(input: DebtReminderEmailInput): Promise<RenderedEmail> {
  return renderDebtReminderViewModel(buildReminderViewModel(input));
}
