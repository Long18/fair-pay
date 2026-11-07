import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, UserGroupStack } from "@/components/user-display";
import { GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import {
  MoreVerticalIcon,
  Trash2Icon,
  StarIcon,
  UserIcon,
  ReceiptIcon,
  BanknoteIcon,
  CalendarIcon,
} from "@/components/ui/icons";

interface MemberStats {
  expense_count: number;
  total_paid: number;
}

interface MemberCardProps {
  member: GroupMember & { profile?: Profile };
  currentUserId: string;
  creatorId?: string;
  isAdmin: boolean;
  stats?: MemberStats;
  onRemoveMember?: (memberId: string) => void;
  onToggleRole?: (memberId: string, currentRole: string) => void;
  isLoading?: boolean;
  showStats?: boolean;
  /** Group context for the member's other-groups stack — excludes the current group from the affiliation popover. */
  currentGroupId?: string;
  dense?: boolean;
}

export function MemberCard({
  member,
  currentUserId,
  creatorId,
  isAdmin,
  stats,
  onRemoveMember,
  onToggleRole,
  isLoading,
  showStats = false,
  currentGroupId,
  dense = false,
}: MemberCardProps) {
  const { tap, warning } = useHaptics();
  const isCurrentUser = member.user_id === currentUserId;
  const isCreator = member.user_id === creatorId;
  const isAdminRole = member.role === "admin";

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 transition-colors",
        dense
          ? "px-1 py-2 sm:px-2 sm:py-1.5 hover:bg-muted/40"
          : "rounded-lg border-2 p-4 hover:bg-accent/50",
        !dense && isAdminRole && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        {/* Avatar with Role Ring */}
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              dense ? "h-9 w-9 sm:h-10 sm:w-10" : "h-12 w-12",
              isAdminRole && (dense ? "ring-2 ring-primary ring-offset-1" : "ring-2 ring-primary ring-offset-2")
            )}
          >
            <AvatarImage
              src={member.profile?.avatar_url || undefined}
              alt={member.profile?.full_name}
            />
            <AvatarFallback>
              {getInitials(member.profile?.full_name || "U")}
            </AvatarFallback>
          </Avatar>
          {isAdminRole && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary text-primary-foreground">
              <StarIcon className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Name + Role + Stats */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 gap-1.5",
              dense
                ? "flex-col sm:flex-row sm:flex-wrap sm:items-center"
                : "flex-wrap items-center gap-2"
            )}
          >
            <p className={cn("truncate font-semibold", dense && "text-sm")}>
              {member.profile?.full_name || "Unknown User"}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {isCurrentUser && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  You
                </Badge>
              )}
              <Badge
                variant={isAdminRole ? "default" : "outline"}
                className="text-[10px] sm:text-xs"
              >
                {isAdminRole ? "Admin" : "Member"}
              </Badge>
              {isCreator && (
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  Creator
                </Badge>
              )}
              <UserGroupStack
                userId={member.user_id}
                size="xs"
                excludeGroupIds={currentGroupId ? [currentGroupId] : undefined}
              />
            </div>
          </div>

          {/* Member Stats */}
          {showStats && stats && (
            <p
              className={cn(
                "text-muted-foreground",
                dense
                  ? "mt-0.5 line-clamp-1 text-[11px] sm:text-xs"
                  : "mt-2 flex flex-wrap items-center gap-3 text-xs"
              )}
            >
              {dense ? (
                <>
                  {stats.expense_count} expenses · {formatNumber(stats.total_paid)} ₫ paid · Joined{" "}
                  {formatRelativeDate(member.joined_at)}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1">
                    <ReceiptIcon className="h-3 w-3" />
                    {stats.expense_count} expenses
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BanknoteIcon className="h-3 w-3" />
                    {formatNumber(stats.total_paid)} ₫ paid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Joined {formatRelativeDate(member.joined_at)}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmin && !isCurrentUser && (onRemoveMember || onToggleRole) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isLoading}>
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Toggle Admin Role */}
            {onToggleRole && !isCreator && (
              <DropdownMenuItem
                onClick={() => { tap(); onToggleRole(member.id, member.role); }}
              >
                {isAdminRole ? (
                  <>
                    <UserIcon className="h-4 w-4 mr-2" />
                    Make Member
                  </>
                ) : (
                  <>
                    <StarIcon className="h-4 w-4 mr-2" />
                    Make Admin
                  </>
                )}
              </DropdownMenuItem>
            )}

            {/* Remove Member */}
            {onRemoveMember && !isCreator && (
              <DropdownMenuItem
                onClick={() => { warning(); onRemoveMember(member.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="h-4 w-4 mr-2" />
                Remove from Group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
