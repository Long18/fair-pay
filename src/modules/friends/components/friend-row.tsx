import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVerticalIcon, UserIcon, Trash2Icon } from "@/components/ui/icons";
import { motion } from "framer-motion";

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
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={onNavigate}
      >
        {/* Avatar */}
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
            {friend.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || <UserIcon size={20} />}
          </AvatarFallback>
        </Avatar>

        {/* Friend Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm sm:text-base truncate">
            {friend.full_name}
          </div>
          {friend.email && (
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              {friend.email}
            </div>
          )}
        </div>

        {/* Balance Badge (optional) */}
        {showBalance && balance !== undefined && balance !== 0 && (
          <Badge
            variant="secondary"
            className={cn("shrink-0 hidden sm:flex", getBalanceColor(balance))}
          >
            {formatBalance(balance)} {currency}
          </Badge>
        )}
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
