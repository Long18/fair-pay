import { RecurringExpense } from "@/modules/expenses/types/recurring";
import { format } from "date-fns";

/**
 * Generate ICS (iCalendar) file for recurring expenses
 * Compatible with Google Calendar, Apple Calendar, Outlook
 */

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  rrule?: string;
  categories?: string[];
  location?: string;
}

/**
 * Convert RecurringExpense to ICS RRULE format
 */
function getRecurrenceRule(expense: RecurringExpense): string {
  let freq = "";

  switch (expense.frequency) {
    case "weekly":
      freq = "WEEKLY";
      break;
    case "bi_weekly":
      freq = "WEEKLY";
      break;
    case "monthly":
      freq = "MONTHLY";
      break;
    case "quarterly":
      freq = "MONTHLY";
      break;
    case "yearly":
      freq = "YEARLY";
      break;
    default:
      freq = "MONTHLY";
  }

  let rrule = `FREQ=${freq}`;

  // Add interval
  if (expense.frequency === "bi_weekly") {
    rrule += ";INTERVAL=2";
  } else if (expense.frequency === "quarterly") {
    rrule += ";INTERVAL=3";
  } else if (expense.interval && expense.interval > 1) {
    rrule += `;INTERVAL=${expense.interval}`;
  }

  // Add end date if specified
  if (expense.end_date) {
    const endDate = new Date(expense.end_date);
    const until = formatICSDate(endDate);
    rrule += `;UNTIL=${until}`;
  }

  return rrule;
}

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Fold long lines to 75 characters per RFC 5545
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;

  const lines = [];
  let start = 0;

  while (start < line.length) {
    if (start === 0) {
      lines.push(line.substring(0, 75));
      start = 75;
    } else {
      lines.push(" " + line.substring(start, start + 74));
      start += 74;
    }
  }

  return lines.join("\r\n");
}

/**
 * Generate ICS content for a single event
 */
function generateICSEvent(event: ICSEvent): string {
  const lines: string[] = [];

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${event.uid}@fairpay.app`);
  lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
  lines.push(`DTSTART:${formatICSDate(event.start)}`);
  lines.push(`DTEND:${formatICSDate(event.end)}`);
  lines.push(`SUMMARY:${escapeICSText(event.summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`);
  }

  if (event.categories && event.categories.length > 0) {
    lines.push(`CATEGORIES:${event.categories.map(escapeICSText).join(",")}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  lines.push("STATUS:CONFIRMED");
  lines.push("TRANSP:TRANSPARENT");
  lines.push("END:VEVENT");

  return lines.map(foldLine).join("\r\n");
}

/**
 * Generate full ICS file for multiple events
 */
function generateICSFile(events: ICSEvent[]): string {
  const lines: string[] = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//FairPay//Recurring Expenses//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:FairPay Recurring Expenses");
  lines.push("X-WR-TIMEZONE:UTC");
  lines.push("X-WR-CALDESC:Automated recurring expense reminders");

  events.forEach(event => {
    lines.push(generateICSEvent(event));
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Convert recurring expense to ICS event
 */
export function recurringExpenseToICSEvent(expense: RecurringExpense): ICSEvent {
  const template = expense.template_expense || expense.expenses;
  const startDate = new Date(expense.next_occurrence);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const summary = template?.description || "Recurring Expense";
  const amount = template?.amount || 0;
  const currency = template?.currency || "VND";

  const description = `Amount: ${new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
  }).format(amount)}\\nFrequency: ${expense.frequency}\\nInterval: Every ${expense.interval} ${expense.frequency}${expense.interval > 1 ? "s" : ""}`;

  return {
    uid: expense.id,
    summary: `💰 ${summary}`,
    description,
    start: startDate,
    end: endDate,
    rrule: getRecurrenceRule(expense),
    categories: template?.category ? [template.category] : ["Expense"],
  };
}

/**
 * Export single recurring expense to ICS file
 */
export function exportRecurringExpenseToCalendar(expense: RecurringExpense): void {
  const event = recurringExpenseToICSEvent(expense);
  const icsContent = generateICSFile([event]);

  downloadICSFile(icsContent, `recurring-${expense.id}.ics`);
}

/**
 * Export all recurring expenses to ICS file
 */
export function exportAllRecurringExpensesToCalendar(expenses: RecurringExpense[]): void {
  const events = expenses
    .filter(e => e.is_active) // Only export active expenses
    .map(recurringExpenseToICSEvent);

  const icsContent = generateICSFile(events);

  downloadICSFile(icsContent, `fairpay-recurring-expenses-${format(new Date(), "yyyy-MM-dd")}.ics`);
}

/**
 * Download ICS file to user's device
 */
function downloadICSFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate calendar subscription URL (for future implementation)
 * This would require a backend endpoint to serve the ICS file
 */
export function getCalendarSubscriptionURL(userId: string): string {
  // In production, this would be:
  // return `https://api.fairpay.app/calendar/${userId}/recurring-expenses.ics`;

  // For now, return a placeholder
  return `webcal://api.fairpay.app/calendar/${userId}/recurring-expenses.ics`;
}

/**
 * Open calendar app with add event dialog
 * Works on mobile devices
 */
export function openInCalendarApp(expense: RecurringExpense): void {
  const event = recurringExpenseToICSEvent(expense);

  // For mobile, try to use the native calendar
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // Generate data URL
    const icsContent = generateICSFile([event]);
    const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    window.open(dataUrl);
  } else {
    // Desktop: download ICS file
    exportRecurringExpenseToCalendar(expense);
  }
}

/**
 * Add to Google Calendar (opens Google Calendar web interface)
 */
export function addToGoogleCalendar(expense: RecurringExpense): void {
  const template = expense.template_expense || expense.expenses;
  const summary = encodeURIComponent(template?.description || "Recurring Expense");
  const startDate = new Date(expense.next_occurrence);
  const dates = `${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(
    new Date(startDate.getTime() + 60 * 60 * 1000),
    "yyyyMMdd'T'HHmmss"
  )}`;

  const amount = template?.amount || 0;
  const currency = template?.currency || "VND";
  const description = encodeURIComponent(
    `Amount: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(amount)}\nFrequency: ${expense.frequency}`
  );

  const recurrence = getGoogleCalendarRecurrence(expense);

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${summary}&dates=${dates}&details=${description}&recur=${recurrence}`;

  window.open(url, "_blank");
}

/**
 * Convert recurring expense to Google Calendar recurrence format
 */
function getGoogleCalendarRecurrence(expense: RecurringExpense): string {
  let freq = "";

  switch (expense.frequency) {
    case "weekly":
      freq = "RRULE:FREQ=WEEKLY";
      break;
    case "bi_weekly":
      freq = "RRULE:FREQ=WEEKLY;INTERVAL=2";
      break;
    case "monthly":
      freq = "RRULE:FREQ=MONTHLY";
      break;
    case "quarterly":
      freq = "RRULE:FREQ=MONTHLY;INTERVAL=3";
      break;
    case "yearly":
      freq = "RRULE:FREQ=YEARLY";
      break;
    default:
      freq = "RRULE:FREQ=MONTHLY";
  }

  if (expense.interval && expense.interval > 1 && expense.frequency !== "bi_weekly" && expense.frequency !== "quarterly") {
    freq += `;INTERVAL=${expense.interval}`;
  }

  if (expense.end_date) {
    const endDate = new Date(expense.end_date);
    freq += `;UNTIL=${format(endDate, "yyyyMMdd")}`;
  }

  return encodeURIComponent(freq);
}
