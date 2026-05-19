import { useEffect, useState } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/utility";
import { Profile } from "@/modules/profile/types";

const DISMISS_KEY = "fairpay_debt_reminder_banner_dismissed";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore localStorage errors
  }
}

/**
 * DebtReminderBanner
 *
 * Shows a dismissible alert when the current user has unsettled expense splits
 * older than 7 days. Provides CTAs to navigate to /balances or trigger reminders.
 * Dismissed state persists in localStorage with a 24-hour TTL.
 */
export function DebtReminderBanner() {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const go = useGo();
  const [agingDebtCount, setAgingDebtCount] = useState<number>(0);
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!identity?.id || isDismissed()) return;

    let cancelled = false;

    async function fetchAgingDebts() {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Query expense_splits where the user is the debtor (not the payer)
      // and the split is unsettled and older than 7 days
      const { count, error } = await supabaseClient
        .from("expense_splits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", identity!.id)
        .eq("is_settled", false)
        .lt("created_at", sevenDaysAgo);

      if (error || !count || cancelled) return;

      setAgingDebtCount(count);
      setVisible(count > 0);
    }

    fetchAgingDebts();
    return () => {
      cancelled = true;
    };
  }, [identity?.id]);

  function handleDismiss() {
    dismiss();
    setVisible(false);
  }

  async function handleRemindThem() {
    if (!identity?.id) return;
    setSending(true);
    try {
      // Trigger send-email-notifications for the current user's notifications
      // This reuses the existing email worker pattern
      const session = await supabaseClient.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      await fetch(`${supabaseUrl}/functions/v1/send-email-notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
    } finally {
      setSending(false);
      handleDismiss();
    }
  }

  if (!visible || agingDebtCount === 0) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-amber-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <AlertDescription>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-amber-900">
            {t("notifications.debtAging.message", { count: agingDebtCount })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-300 bg-white text-amber-800 hover:bg-amber-50 text-xs"
              onClick={() => go({ to: "/balances" })}
            >
              {t("notifications.debtAging.viewDebts")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-300 bg-white text-amber-800 hover:bg-amber-50 text-xs"
              onClick={handleRemindThem}
              disabled={sending}
            >
              {sending ? "..." : t("notifications.debtAging.remindThem")}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="ml-1 text-amber-500 hover:text-amber-700 transition-colors"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
