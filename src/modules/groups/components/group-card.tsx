import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatNumber } from '@/lib/locale-utils';
import { dateUtils } from '@/lib/date-utils';
import { useGo } from '@refinedev/core';
import {
  PlusIcon,
  EyeIcon,
  UsersIcon,
  ArchiveIcon,
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
}

export function GroupCard({ group, balanceSummary, isLoading, canManage }: GroupCardProps) {
  const go = useGo();

  const you_owe = balanceSummary?.you_owe ?? 0;
  const owed_to_you = balanceSummary?.owed_to_you ?? 0;
  const isSettled = you_owe === 0 && owed_to_you === 0;
  const isArchived = group.is_archived ?? false;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
      onClick={() => go({ to: `/groups/show/${group.id}` })}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Group Avatar */}
          <Avatar className={`h-12 w-12 shrink-0 ${isArchived ? 'opacity-75' : ''}`}>
            <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
            <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
              {isArchived ? (
                <ArchiveIcon className="h-5 w-5 text-amber-600" />
              ) : (
                getInitials(group.name)
              )}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{group.name}</h3>
              {isArchived && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs shrink-0">
                  Archived
                </Badge>
              )}
              {!isLoading && !isArchived && isSettled && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                  Settled
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <UsersIcon className="h-3 w-3" />
              <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
              <span className="mx-1">·</span>
              <span>{dateUtils.formatRelative(group.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Member Avatars */}
        {group.members.length > 0 && (
          <div className="flex items-center mt-3">
            {group.members.slice(0, 5).map((member) => (
              <Avatar key={member.id} className="h-7 w-7 border-2 border-background -ml-1.5 first:ml-0">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {group.member_count > 5 && (
              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background -ml-1.5 flex items-center justify-center">
                <span className="text-[10px] font-medium">+{group.member_count - 5}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Balance Summary */}
        {!isLoading && !isSettled && (
          <div className="p-2.5 rounded-lg bg-accent/50 space-y-1.5">
            {you_owe > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-600 font-medium">You owe</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatNumber(you_owe)} ₫
                </span>
              </div>
            )}
            {owed_to_you > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600 font-medium">Owes you</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatNumber(owed_to_you)} ₫
                </span>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="p-2.5 rounded-lg bg-accent/50">
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/groups/show/${group.id}` })}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View
          </Button>
          {(!isArchived || canManage) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
              title="Add Expense"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
