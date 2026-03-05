import { useHaptics } from "@/hooks/use-haptics";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MailIcon } from "@/components/ui/icons";

interface BalanceRowProps {
  counterpartyName: string;
  groupName?: string;
  amount: number;
  iOweThemFlag: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isPendingEmail?: boolean;
}

export function BalanceRow({
  counterpartyName,
  groupName,
  amount,
  iOweThemFlag,
  onClick,
  disabled = false,
  isPendingEmail = false,
}: BalanceRowProps) {
  const { tap } = useHaptics();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const displayAmount = `₫${formatCurrency(amount)}`;

  return (
    <div
      onClick={!disabled && !isPendingEmail ? () => { tap(); onClick?.(); } : undefined}
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border bg-card transition-colors",
        isPendingEmail && "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20",
        !disabled && !isPendingEmail && "cursor-pointer hover:bg-muted/50",
        (disabled || isPendingEmail) && !isPendingEmail && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isPendingEmail ? (
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border border-amber-300 dark:border-amber-700">
            <MailIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        ) : (
          <Avatar className="h-10 w-10 rounded-full border">
            <AvatarFallback className="text-sm bg-muted text-muted-foreground">
              {counterpartyName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold truncate",
              isPendingEmail && "text-amber-700 dark:text-amber-300"
            )}>
              {counterpartyName}
            </span>
            {isPendingEmail && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] flex-shrink-0 border-amber-400 text-amber-600 dark:text-amber-400">
                Pending
              </Badge>
            )}
          </div>
          {groupName && (
            <span className="text-xs text-muted-foreground truncate">{groupName}</span>
          )}
          {isPendingEmail && (
            <span className="text-[11px] text-amber-600/70 dark:text-amber-400/70 truncate">
              Not yet registered
            </span>
          )}
        </div>
      </div>

      <Badge
        className={cn(
          "ml-3 font-medium whitespace-nowrap",
          iOweThemFlag
            ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/30"
            : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30"
        )}
      >
        {displayAmount}
      </Badge>
    </div>
  );
}
