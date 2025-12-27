import { MoreHorizontal, Receipt, Banknote, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGo, useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Profile } from "@/modules/profile/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardDenseTableProps {
  disabled?: boolean;
}

export function DashboardDenseTable({ disabled = false }: DashboardDenseTableProps) {
  const { items: activities = [], isLoading } = useRecentActivity(10);
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const { t } = useTranslation();

  // Check if user is authenticated (not just disabled prop)
  const isAuthenticated = !!identity?.id;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return "No activity";
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  // Show all debts (including demo data from database for unauthenticated users)
  // The hook queries database for both authenticated and unauthenticated cases
  const debtItems = debts.map(d => {
    // Check if this is demo data: has owed_to_name field (only demo data has this)
    // Demo UUIDs are in range: 00000000-0000-0000-0000-000000000001 to 00000000-0000-0000-0000-000000000003
    const isDemoData = !!(d as any).owed_to_name ||
                       (typeof d.counterparty_id === 'string' && d.counterparty_id.startsWith('00000000-0000-0000-0000-00000000'));

    // For demo data, show neutral relationship: "John owes Sarah"
    // For real data (authenticated), show personalized: "You owe John" or "John owes you"
    const getDescription = () => {
      // If it's demo data, construct neutral format using owed_to_name field
      if (isDemoData) {
        const owedToName = (d as any).owed_to_name || 'someone';
        // Demo data structure:
        // i_owe_them = false means: "owed_to_name owes counterparty_name"
        // Example: owed_to_name="John", counterparty_name="Sarah" → "John owes Sarah"
        return `${owedToName} owes ${d.counterparty_name}`;
      } else {
        // Real data: personalized wording
        return d.i_owe_them
          ? `You owe ${d.counterparty_name}`
          : `${d.counterparty_name} owes you`;
      }
    };

    return {
      ...d,
      itemType: 'debt' as const,
      id: d.counterparty_id,
      description: getDescription(),
      amount: d.amount,
      type: d.i_owe_them ? 'payment' : 'expense',
      date: new Date().toISOString(),
    };
  });

  const activityItems = activities.map(a => ({ ...a, itemType: 'activity' as const }));

  if (isLoading || debtsLoading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (debtItems.length === 0 && activityItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No recent activity</h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-2">
          {disabled
            ? "Login to add expenses and track your shared costs with friends."
            : "Start by adding your first expense or payment."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balances / Debts Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Balances</h3>
          {debtItems.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {debtItems.length} {debtItems.length === 1 ? 'balance' : 'balances'}
            </Badge>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {debtItems.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TooltipProvider delayDuration={0}>
                  {debtItems.map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className={`group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (disabled) return;
                            go({ to: `/profile/${item.id}` });
                          }}
                        >
                          <TableCell>
                            <Avatar className="h-8 w-8 border">
                              <AvatarFallback className={`text-xs ${item.i_owe_them ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {item.counterparty_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="text-sm font-medium">{item.description}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.i_owe_them ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {/* For demo data, show neutral "Owes" badge. For real data, show personalized "You owe"/"Owes you" */}
                              {!!(item as any).owed_to_name ||
                               (typeof item.id === 'string' && item.id.startsWith('00000000-0000-0000-0000-00000000'))
                                ? "Owes"
                                : (item.i_owe_them ? "You owe" : "Owes you")
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-semibold ${item.i_owe_them ? 'text-green-600' : 'text-red-600'}`}>
                              ₫{formatCurrency(Number(item.amount))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={disabled}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled={disabled}>View Profile</DropdownMenuItem>
                                <DropdownMenuItem disabled={disabled}>Settle Up</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      {disabled && (
                        <TooltipContent>
                          <p className="text-xs">Login to view details</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All settled up! 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">No outstanding balances</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider delayDuration={0}>
                {activityItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No recent activity</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activityItems.slice(0, 10).map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className={`group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (disabled) return;
                            if ('type' in item) {
                              go({ to: item.type === "expense" ? `/expenses/show/${item.id}` : `/payments/show/${item.id}` });
                            }
                          }}
                        >
                          <TableCell>
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${'type' in item && item.type === "expense" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                              {'type' in item && item.type === "expense" ? <Receipt className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate max-w-[300px]">{item.description}</span>
                              {'is_mine' in item && 'created_by_name' in item && (
                                <span className="text-xs text-muted-foreground">
                                  by {item.is_mine ? "You" : item.created_by_name}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {'group_name' in item && item.group_name ? (
                              <Badge variant="outline" className="text-xs">
                                {item.group_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Personal</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatTimeAgo('date' in item ? item.date : undefined)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-medium">
                              ₫{formatCurrency(Number(item.amount))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={disabled}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled={disabled}>View Details</DropdownMenuItem>
                                <DropdownMenuItem disabled={disabled}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" disabled={disabled}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      {disabled && (
                        <TooltipContent>
                          <p className="text-xs">Login to view details</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))
                )}
              </TooltipProvider>
            </TableBody>
          </Table>
          <div className="p-2 border-t bg-muted/10">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8">
              View all transactions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
