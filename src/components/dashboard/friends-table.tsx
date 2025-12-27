import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, UserPlus, Users2, TrendingUp, TrendingDown } from "lucide-react";
import { useGo } from "@refinedev/core";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const getBalanceColor = (iOweThem: boolean) => {
    return iOweThem
      ? 'text-red-600 dark:text-red-400'
      : 'text-green-600 dark:text-green-400';
  };

  const getBalanceIcon = (iOweThem: boolean) => {
    return iOweThem ? TrendingDown : TrendingUp;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users2 className="h-5 w-5" />
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
            <Users2 className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <Users2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-foreground font-medium">No friends yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add friends to split expenses together
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => go({ to: "/friends" })}
                variant="default"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
              <Button
                onClick={() => go({ to: "/groups" })}
                variant="outline"
              >
                <Users2 className="h-4 w-4 mr-2" />
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Friends
            <Badge variant="secondary" className="ml-1">
              {friends.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go({ to: "/friends" })}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
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
                    onClick={() => go({ to: `/profile/${friend.counterparty_id}` })}
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
                          go({ to: `/profile/${friend.counterparty_id}` });
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
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
