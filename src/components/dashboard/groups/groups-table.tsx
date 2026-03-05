import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useGo } from "@refinedev/core";

import { EyeIcon, UsersIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
interface GroupBalance {
  group_id: string;
  group_name: string;
  my_balance: number;
  member_count: number;
  last_activity?: string;
}

interface GroupsTableProps {
  groups: GroupBalance[];
  isLoading?: boolean;
}

export const GroupsTable = ({ groups, isLoading }: GroupsTableProps) => {
  const go = useGo();
  const { tap } = useHaptics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return 'No activity';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Groups
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

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-2">Create a group to start tracking shared expenses</p>
            <Button
              onClick={() => { tap(); go({ to: "/groups/create" }); }}
              className="mt-4"
            >
              Create Group
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
          <UsersIcon className="h-5 w-5" />
          Groups
          <span className="text-sm font-normal text-muted-foreground">({groups.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Group Name</TableHead>
              <TableHead className="font-semibold">Members</TableHead>
              <TableHead className="font-semibold text-right">Your Balance</TableHead>
              <TableHead className="font-semibold">Last Activity</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.group_id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">
                  {group.group_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {group.member_count} members
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  group.my_balance > 0 ? 'text-green-600' : group.my_balance < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {group.my_balance > 0 ? '+' : ''}₫{formatCurrency(group.my_balance)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatTimeAgo(group.last_activity)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { tap(); go({ to: `/groups/show/${group.group_id}` }); }}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
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
