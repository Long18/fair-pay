import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useGo } from "@refinedev/core";

interface DebtStickyNavProps {
  visible: boolean;
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  netAmount: number;
  iOweThem: boolean;
  currency: string;
}

export function DebtStickyNav({
  visible,
  counterpartyName,
  counterpartyAvatarUrl,
  netAmount,
  iOweThem,
  currency,
}: DebtStickyNavProps) {
  const go = useGo();

  const initials = counterpartyName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "fixed top-0 left-1/2 z-[200] w-full max-w-4xl",
        "-translate-x-1/2 transition-all duration-250 ease-out",
        "bg-card border-b border-border",
        "px-3 py-2 flex items-center gap-2.5",
        visible
          ? "translate-y-0 shadow-md opacity-100"
          : "-translate-y-full shadow-none opacity-0 pointer-events-none"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full"
        onClick={() => go({ to: "/" })}
        aria-label="Back to Dashboard"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Button>

      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={counterpartyAvatarUrl || undefined} />
        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <span className="text-sm font-semibold truncate flex-1">
        {counterpartyName}
      </span>

      <span
        className={cn(
          "text-xs font-bold px-2.5 py-1 rounded-full shrink-0 tabular-nums",
          iOweThem
            ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
            : "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
        )}
      >
        {iOweThem ? "−" : "+"}
        {formatCurrency(netAmount, currency)}
      </span>
    </div>
  );
}
