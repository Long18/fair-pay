import { MoreHorizontal, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
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
  const { data: debts = [], isLoading } = useAggregatedDebts();
  const go = useGo();
  const { t } = useTranslation();
  const [view, setView] = useState<"all" | "groups" | "friends">("all");

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

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
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
            variant={view === "groups" ? "outline" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setView("groups")}
          >
            Groups
          </Button>
          <Button
            variant={view === "friends" ? "outline" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setView("friends")}
          >
            Friends
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[250px]">Entity</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TooltipProvider delayDuration={0}>
              {debts.slice(0, 5).map((item, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <TableRow
                      className={`group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      onClick={() => !disabled && go({ to: `/profile/${item.counterparty_id}` })}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {item.counterparty_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{item.counterparty_name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Friend</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeAgo()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 font-medium ${item.i_owe_them ? 'text-destructive' : 'text-primary'}`}>
                          {item.i_owe_them ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {item.i_owe_them ? `You owe ₫${formatCurrency(item.amount)}` : `Owes you ₫${formatCurrency(item.amount)}`}
                        </div>
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
                            <DropdownMenuItem disabled={disabled}>Settle Up</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" disabled={disabled}>Hide</DropdownMenuItem>
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
