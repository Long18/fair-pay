import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserDisplay } from "@/components/user-display";
import { cn } from "@/lib/utils";
import { MoreVerticalIcon, Trash2Icon } from "@/components/ui/icons";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";

interface FriendRowProps {
  friend: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    email?: string;
  };
  balance?: number;
  currency?: string;
  onNavigate: () => void;
  onRemove?: () => void;
  showBalance?: boolean;
  className?: string;
}

export const FriendRow = ({
  friend,
  balance,
  currency = "VND",
  onNavigate,
  onRemove,
  showBalance = false,
  className,
}: FriendRowProps) => {
  const { tap, warning } = useHaptics();

  const formatBalance = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat("vi-VN").format(absAmount);
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const getBalanceColor = (amount: number) => {
    if (amount > 0) return "text-green-600 dark:text-green-400";
    if (amount < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors",
        "min-h-[64px]", // Ensure minimum 64px height for touch targets
        className
      )}
    >
      {/* Primary click target - navigates to friend detail */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => { tap(); onNavigate(); }}
      >
        <UserDisplay
          user={{
            id: friend.id,
            full_name: friend.full_name,
            avatar_url: friend.avatar_url ?? null,
            email: friend.email,
          }}
          size="lg"
          showEmail={!!friend.email}
          groupStack="auto"
          trailing={
            showBalance && balance !== undefined && balance !== 0 ? (
              <Badge
                variant="secondary"
                className={cn("shrink-0 hidden sm:flex", getBalanceColor(balance))}
              >
                {formatBalance(balance)} {currency}
              </Badge>
            ) : undefined
          }
        />
      </div>

      {/* Actions Menu (3-dot) */}
      {onRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0" // 44px touch target
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVerticalIcon className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                warning();
                onRemove();
              }}
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              Remove Friend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
};
