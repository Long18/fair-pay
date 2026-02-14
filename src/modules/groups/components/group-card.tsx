import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/locale-utils';
import { dateUtils } from '@/lib/date-utils';
import { useGo } from '@refinedev/core';
import {
  PlusIcon,
  EyeIcon,
  UsersIcon,
  ArchiveIcon,
  LogInIcon,
  Clock3Icon,
  Loader2Icon,
} from '@/components/ui/icons';

export interface BalanceSummary {
  you_owe: number;
  owed_to_you: number;
  net_balance: number;
}

export interface GroupMemberPreview {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string | null;
    avatar_url?: string | null;
    created_at: string;
    member_count: number;
    members: GroupMemberPreview[];
    is_archived?: boolean;
  };
  balanceSummary?: BalanceSummary;
  isLoading?: boolean;
  canManage?: boolean;
  isMember?: boolean;
  joinRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  onRequestJoin?: (groupId: string) => void;
  isRequestingJoin?: boolean;
}

export function GroupCard({
  group,
  balanceSummary,
  isLoading,
  canManage,
  isMember = true,
  joinRequestStatus,
  onRequestJoin,
  isRequestingJoin,
}: GroupCardProps) {
  const go = useGo();

  const you_owe = balanceSummary?.you_owe ?? 0;
  const owed_to_you = balanceSummary?.owed_to_you ?? 0;
  const isSettled = you_owe === 0 && owed_to_you === 0;
  const isArchived = group.is_archived ?? false;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleCardClick = () => {
    if (isMember) {
      go({ to: `/groups/show/${group.id}` });
    }
  };

  // Status badge to render
  const statusBadge = isArchived ? (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] leading-tight px-1.5 py-0 shrink-0">
      Archived
    </Badge>
  ) : isMember && !isLoading && isSettled ? (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] leading-tight px-1.5 py-0 shrink-0">
      Settled
    </Badge>
  ) : !isMember ? (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] leading-tight px-1.5 py-0 shrink-0">
      Not joined
    </Badge>
  ) : null;

  return (
    <Card
      className={`group transition-all duration-200 hover:border-primary/30 ${
        isMember ? 'cursor-pointer hover:shadow-md' : 'hover:shadow-sm'
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Group Avatar — smaller on mobile */}
          <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${isArchived ? 'opacity-75' : ''}`}>
            <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
            <AvatarFallback className="text-xs sm:text-sm font-semibold bg-primary/10 text-primary">
              {isArchived ? (
                <ArchiveIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              ) : (
                getInitials(group.name)
              )}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Name row — name truncates, badge stays visible */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold text-sm sm:text-base truncate min-w-0">
                    {group.name}
                  </h3>
                </TooltipTrigger>
                {group.name.length > 20 && (
                  <TooltipContent side="top" maxWidth="280px">
                    {group.name}
                  </TooltipContent>
                )}
              </Tooltip>
              {statusBadge}
            </div>

            {/* Description — 2 lines on mobile, 1 on desktop, tooltip for full */}
            {group.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 mt-0.5 break-words">
                    {group.description}
                  </p>
                </TooltipTrigger>
                {group.description.length > 50 && (
                  <TooltipContent side="bottom" maxWidth="320px">
                    {group.description}
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Meta: members · date — wraps gracefully */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground mt-1 flex-wrap">
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <UsersIcon className="h-3 w-3" />
                <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
              </span>
              <span className="shrink-0">·</span>
              <span className="shrink-0">{dateUtils.formatRelative(group.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Member Avatars — only for members */}
        {isMember && group.members.length > 0 && (
          <div className="flex items-center mt-2.5 sm:mt-3">
            {group.members.slice(0, 5).map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background -ml-1.5 first:ml-0">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px] sm:text-[10px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom">{member.name}</TooltipContent>
              </Tooltip>
            ))}
            {group.member_count > 5 && (
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-muted border-2 border-background -ml-1.5 flex items-center justify-center">
                <span className="text-[9px] sm:text-[10px] font-medium">+{group.member_count - 5}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-2.5 sm:space-y-3">
        {/* Balance Summary — only for members */}
        {isMember && !isLoading && !isSettled && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-accent/50 space-y-1">
            {you_owe > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] sm:text-xs text-red-600 font-medium">You owe</span>
                <span className="text-xs sm:text-sm font-semibold text-red-600">
                  {formatNumber(you_owe)} ₫
                </span>
              </div>
            )}
            {owed_to_you > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] sm:text-xs text-green-600 font-medium">Owes you</span>
                <span className="text-xs sm:text-sm font-semibold text-green-600">
                  {formatNumber(owed_to_you)} ₫
                </span>
              </div>
            )}
          </div>
        )}

        {isMember && isLoading && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-accent/50">
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isMember ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex-1 text-xs sm:text-sm"
                onClick={() => go({ to: `/groups/show/${group.id}` })}
              >
                <EyeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                View
              </Button>
              {(!isArchived || canManage) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
                  title="Add Expense"
                >
                  <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              {joinRequestStatus === 'pending' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm text-amber-600 border-amber-300 hover:bg-amber-50"
                  disabled
                >
                  <Clock3Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="truncate">Request Pending</span>
                </Button>
              ) : joinRequestStatus === 'rejected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => onRequestJoin?.(group.id)}
                  disabled={isRequestingJoin}
                >
                  {isRequestingJoin ? (
                    <Loader2Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  ) : (
                    <LogInIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  )}
                  <span className="truncate">Request Again</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => onRequestJoin?.(group.id)}
                  disabled={isRequestingJoin}
                >
                  {isRequestingJoin ? (
                    <Loader2Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  ) : (
                    <LogInIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  )}
                  <span className="truncate">Request to Join</span>
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
