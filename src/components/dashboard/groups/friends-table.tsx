import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGo } from "@refinedev/core";

import { EyeIcon, UserPlusIcon, Users2Icon, TrendingUpIcon, TrendingDownIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
/**
 * Friends Table Component
 *
 * Displays list of friends with their balance status
 *
 * Database Integration:
 * - Data comes from get_user_debts_aggregated() function
 * - Aggregates expenses and payments per counterparty
 * - Shows net balance per friend
 *
 * Auto-Friending:
 * - Users in same group automatically become friends
 * - Trigger: auto_create_friendships_from_group()
 * - See: supabase/migrations/006_auto_friend_group_members.sql
 *
 * @see supabase/migrations/001_initial_schema.sql - get_user_debts_aggregated function
 * @see supabase/migrations/006_auto_friend_group_members.sql - auto-friending trigger
 */

interface Friend {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string;
  amount: number;
  i_owe_them: boolean;
}

interface FriendsTableProps {
  friends: Friend[];
  isLoading?: boolean;
}

export const FriendsTable = ({ friends, isLoading }: FriendsTableProps) => {
  const go = useGo();
  const { tap } = useHaptics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const getBalanceColor = (iOweThem: boolean) => {
    return iOweThem
      ? 'text-red-600 dark:text-red-400'
      : 'text-green-600 dark:text-green-400';
  };

  const getBalanceIcon = (iOweThem: boolean) => {
    return iOweThem ? TrendingDownIcon : TrendingUpIcon;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users2Icon className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users2Icon className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <Users2Icon className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-foreground font-medium">No friends yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add friends to split expenses together
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => { tap(); go({ to: "/friends" }); }}
                variant="default"
                className="w-full sm:w-auto"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
              <Button
                onClick={() => { tap(); go({ to: "/groups" }); }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Users2Icon className="h-4 w-4 mr-2" />
                Join a Group
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">
              💡 Tip: Join a group to auto-friend members
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users2Icon className="h-5 w-5" />
            Friends
            <Badge variant="secondary" className="ml-1">
              {friends.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => { tap(); go({ to: "/friends" }); }}
          >
            <UserPlusIcon className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile: Card Layout */}
        <div className="block md:hidden space-y-3">
          {friends.map((friend) => {
            const BalanceIcon = getBalanceIcon(friend.i_owe_them);
            return (
              <Card
                key={friend.counterparty_id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { tap(); go({ to: `/friends/${friend.counterparty_id}` }); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 border-2 border-border shrink-0">
                        <AvatarImage src={friend.counterparty_avatar_url || undefined} alt={friend.counterparty_name} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {friend.counterparty_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {friend.counterparty_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={friend.i_owe_them ? "destructive" : "default"}
                            className={`text-xs ${friend.i_owe_them
                              ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            }`}
                          >
                            {friend.i_owe_them ? 'You owe' : 'Owes you'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <BalanceIcon className={`h-4 w-4 ${getBalanceColor(friend.i_owe_them)}`} />
                        <span className={`font-semibold text-sm ${getBalanceColor(friend.i_owe_them)}`}>
                          {friend.i_owe_them ? '-' : '+'}₫{formatCurrency(friend.amount)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          tap();
                          go({ to: `/friends/${friend.counterparty_id}` });
                        }}
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: Table Layout */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Friend</TableHead>
                <TableHead className="font-semibold text-right">Balance</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {friends.map((friend) => {
                const BalanceIcon = getBalanceIcon(friend.i_owe_them);
                return (
                  <TableRow
                    key={friend.counterparty_id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => { tap(); go({ to: `/friends/${friend.counterparty_id}` }); }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-border">
                          <AvatarImage src={friend.counterparty_avatar_url || undefined} alt={friend.counterparty_name} />
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {friend.counterparty_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {friend.counterparty_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            View details
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <BalanceIcon className={`h-4 w-4 ${getBalanceColor(friend.i_owe_them)}`} />
                        <span className={`font-semibold ${getBalanceColor(friend.i_owe_them)}`}>
                          {friend.i_owe_them ? '-' : '+'}₫{formatCurrency(friend.amount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={friend.i_owe_them ? "destructive" : "default"}
                        className={friend.i_owe_them
                          ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        }
                      >
                        {friend.i_owe_them ? 'You owe' : 'Owes you'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          tap();
                          go({ to: `/friends/${friend.counterparty_id}` });
                        }}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
