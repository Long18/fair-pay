import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatNumber } from '@/lib/locale-utils';
import { dateUtils } from '@/lib/date-utils';
import { useGo } from '@refinedev/core';
import {
  Users2Icon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  UsersIcon,
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
    created_at: string;
    member_count: number;
    members: GroupMemberPreview[];
  };
  balanceSummary?: BalanceSummary;
  isLoading?: boolean;
}

export function GroupCard({ group, balanceSummary, isLoading }: GroupCardProps) {
  const go = useGo();

  const you_owe = balanceSummary?.you_owe ?? 0;
  const owed_to_you = balanceSummary?.owed_to_you ?? 0;
  const isSettled = you_owe === 0 && owed_to_you === 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        {/* Group Icon + Name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Users2Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {!isLoading && isSettled && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
              Settled
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{dateUtils.formatRelative(group.created_at)}</span>
          </div>
        </div>

        {/* Member Avatars */}
        {group.members.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {group.members.slice(0, 4).map((member) => (
              <Avatar key={member.id} className="h-8 w-8 border-2 border-background -ml-2 first:ml-0">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {group.member_count > 4 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background -ml-2 flex items-center justify-center">
                <span className="text-xs font-medium">+{group.member_count - 4}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Balance Summary */}
        {!isLoading && !isSettled && (
          <div className="p-3 rounded-lg bg-accent space-y-2">
            {you_owe > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-600 font-medium">YOU OWE</span>
                <span className="text-sm font-bold text-red-600">
                  {formatNumber(you_owe)} ₫
                </span>
              </div>
            )}
            {owed_to_you > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600 font-medium">OWES YOU</span>
                <span className="text-sm font-bold text-green-600">
                  {formatNumber(owed_to_you)} ₫
                </span>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-3 rounded-lg bg-accent">
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/groups/show/${group.id}` })}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
            title="Add Expense"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
