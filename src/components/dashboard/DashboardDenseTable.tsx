import { MoreHorizontal, Receipt, Banknote } from "lucide-react";
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
import { useGo } from "@refinedev/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const go = useGo();
  const { t } = useTranslation();
  const [view, setView] = useState<"all" | "expenses" | "payments">("all");

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

  const filteredActivities = activities.filter(activity => {
    if (view === "all") return true;
    return activity.type === view.slice(0, -1); // "expenses" -> "expense", "payments" -> "payment"
  });

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (filteredActivities.length === 0) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
        <div className="flex gap-2">
          <Button
            variant={view === "all" ? "outline" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setView("all")}
          >
            All
          </Button>
          <Button
            variant={view === "expenses" ? "outline" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setView("expenses")}
          >
            Expenses
          </Button>
          <Button
            variant={view === "payments" ? "outline" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setView("payments")}
          >
            Payments
          </Button>
        </div>
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
              {filteredActivities.slice(0, 10).map((activity) => (
                <Tooltip key={activity.id}>
                  <TooltipTrigger asChild>
                    <TableRow
                      className={`group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      onClick={() => !disabled && go({ to: activity.type === "expense" ? `/expenses/show/${activity.id}` : `/payments/show/${activity.id}` })}
                    >
                      <TableCell>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${activity.type === "expense" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {activity.type === "expense" ? <Receipt className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[300px]">{activity.description}</span>
                          <span className="text-xs text-muted-foreground">
                            by {activity.is_mine ? "You" : activity.created_by_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.group_name ? (
                          <Badge variant="outline" className="text-xs">
                            {activity.group_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Personal</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">
                          ₫{formatCurrency(activity.amount)}
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
              ))}
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
  );
}
