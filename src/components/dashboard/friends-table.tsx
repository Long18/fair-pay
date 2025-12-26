import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, UserPlus, Users2 } from "lucide-react";
import { useGo } from "@refinedev/core";

interface Friend {
  counterparty_id: string;
  counterparty_name: string;
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
          <div className="text-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No friends yet</p>
            <p className="text-sm text-muted-foreground mt-2">Add friends to split expenses</p>
            <Button
              onClick={() => go({ to: "/friends" })}
              className="mt-4"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Friends
          <span className="text-sm font-normal text-muted-foreground">({friends.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            {friends.map((friend) => (
              <TableRow
                key={friend.counterparty_id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {friend.counterparty_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {friend.counterparty_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  friend.i_owe_them ? 'text-destructive' : 'text-green-600'
                }`}>
                  {friend.i_owe_them ? '-' : '+'}₫{formatCurrency(friend.amount)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    friend.i_owe_them
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {friend.i_owe_them ? 'You owe' : 'Owes you'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => go({ to: `/profile/${friend.counterparty_id}` })}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
