import { useState, useMemo } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "@/components/ui/button";
import { IndicatorBadge } from "@/components/ui/indicator-badge";
import { BellIcon } from "@/components/ui/icons";
import { NotificationCenter } from "./notification-center";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { active } = useRecurringExpenses({});
  const { tap } = useHaptics();

  // Calculate notification count (overdue + upcoming in next 7 days)
  const notificationCount = useMemo(() => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return active.filter((r) => {
      const nextDate = new Date(r.next_occurrence);
      // Count overdue (< today) or upcoming within 7 days
      return nextDate <= sevenDaysLater;
    }).length;
  }, [active]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative overflow-visible"
        onClick={() => { tap(); setOpen(true); }}
      >
        <BellIcon className="h-5 w-5" />
        <IndicatorBadge count={notificationCount} max={9} outline color="danger" />
      </Button>

      <NotificationCenter open={open} onOpenChange={setOpen} />
    </>
  );
}
