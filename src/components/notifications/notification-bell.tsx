import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellIcon } from "@/components/ui/icons";
import { NotificationCenter } from "./notification-center";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { active } = useRecurringExpenses({});

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
        className="relative"
        onClick={() => setOpen(true)}
      >
        <BellIcon className="h-5 w-5" />
        {notificationCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </Button>

      <NotificationCenter open={open} onOpenChange={setOpen} />
    </>
  );
}
