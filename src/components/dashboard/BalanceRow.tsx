import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BalanceRowProps {
  counterpartyName: string;
  groupName?: string;
  amount: number;
  iOweThemFlag: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function BalanceRow({
  counterpartyName,
  groupName,
  amount,
  iOweThemFlag,
  onClick,
  disabled = false,
}: BalanceRowProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border bg-card transition-colors",
        !disabled && "cursor-pointer hover:bg-muted/50",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 rounded-full border">
          <AvatarFallback className="text-sm bg-muted text-muted-foreground">
            {counterpartyName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold truncate">{counterpartyName}</span>
          {groupName && (
            <span className="text-xs text-muted-foreground truncate">{groupName}</span>
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
        ₫{formatCurrency(amount)}
      </Badge>
    </div>
  );
}
