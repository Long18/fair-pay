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
        "flex items-center justify-between p-4 border-2 rounded-lg transition-colors",
        "hover:bg-accent/50",
        isAdminRole && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar with Role Ring */}
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              "h-12 w-12",
              isAdminRole && "ring-2 ring-primary ring-offset-2"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">
              {member.profile?.full_name || "Unknown User"}
            </p>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
            <UserGroupStack
              userId={member.user_id}
              size="xs"
              excludeGroupIds={currentGroupId ? [currentGroupId] : undefined}
            />
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              variant={isAdminRole ? "default" : "outline"}
              className="text-xs"
            >
              {isAdminRole ? "Admin" : "Member"}
            </Badge>
            {isCreator && (
              <Badge variant="outline" className="text-xs">
                Creator
              </Badge>
            )}
          </div>

          {/* Member Stats */}
          {showStats && stats && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <ReceiptIcon className="h-3 w-3" />
                <span>{stats.expense_count} expenses</span>
              </div>
              <div className="flex items-center gap-1">
                <BanknoteIcon className="h-3 w-3" />
                <span>{formatNumber(stats.total_paid)} ₫ paid</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>Joined {formatRelativeDate(member.joined_at)}</span>
              </div>
            </div>
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
