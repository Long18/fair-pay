import { MoreHorizontal, Receipt, Banknote, Users, ChevronRight } from "lucide-react";
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
import { useState } from "react";
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
  
  // Pagination states
  const [balancesPage, setBalancesPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Always allow navigation for public demo users
  const isAuthenticated = !!identity?.id;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return t('dashboard.noRecentActivity');
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}${t('common.daysAgo', 'd ago')}`;
    if (diffHours > 0) return `${diffHours}${t('common.hoursAgo', 'h ago')}`;
    return t('common.justNow', 'Just now');
  };

  // Show all debts (real data for both authenticated and unauthenticated users)
  const debtItems = debts.map(d => {

    // For unauthenticated/public data: show actual names (e.g., "Hoàng Anh owes Long")
    // For authenticated data: show personalized (e.g., "You owe Hoàng Anh" or "Hoàng Anh owes you")
    const getDescription = () => {
      // If owed_to_name is present, it's public data - use actual names
      if ((d as any).owed_to_name) {
        const owedToName = (d as any).owed_to_name;
        return `${d.counterparty_name} ${t('dashboard.owes')} ${owedToName}`;
      } else {
        // Real authenticated data: personalized wording
        return d.i_owe_them
          ? `${t('dashboard.youOwe')} ${d.counterparty_name}`
          : `${d.counterparty_name} ${t('dashboard.userOwesYou')}`;
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
  
  // Pagination logic
  const totalBalances = debtItems.length;
  const totalActivities = activityItems.length;
  const displayedBalances = debtItems.slice(0, balancesPage * ITEMS_PER_PAGE);
  const displayedActivities = activityItems.slice(0, activitiesPage * ITEMS_PER_PAGE);
  const hasMoreBalances = totalBalances > displayedBalances.length;
  const hasMoreActivities = totalActivities > displayedActivities.length;

  if (isLoading || debtsLoading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (debtItems.length === 0 && activityItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t('dashboard.noRecentActivity')}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-2">
          {disabled
            ? t('dashboard.loginToAddExpense')
            : t('dashboard.recordNewExpense')
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
          <h3 className="text-lg font-semibold tracking-tight">{t('balances.title')}</h3>
          {debtItems.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {debtItems.length} {debtItems.length === 1 ? t('dashboard.balance') : t('balances.title').toLowerCase()}
            </Badge>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {debtItems.length > 0 ? (
            <>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>{t('profile.person')}</TableHead>
                    <TableHead>{t('profile.status')}</TableHead>
                    <TableHead className="text-right">{t('profile.amount')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={0}>
                    {displayedBalances.map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className="group cursor-pointer hover:bg-accent/50 transition-all duration-200"
                          onClick={() => {
                            go({ to: `/profile/${item.id}` });
                          }}
                        >
                          <TableCell>
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm ring-2 ring-offset-1 ring-offset-background transition-all duration-200 group-hover:ring-primary/50">
                              <AvatarFallback className={`text-sm font-semibold ${item.i_owe_them ? "bg-gradient-to-br from-green-50 to-green-100 text-green-700" : "bg-gradient-to-br from-red-50 to-red-100 text-red-700"}`}>
                                {item.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium max-w-[250px]">
                            <div className="flex flex-col gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                    {item.description}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">{item.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.i_owe_them ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {/* For demo data, show neutral "Owes" badge. For real data, show personalized "You owe"/"Owes you" */}
                              {!!(item as any).owed_to_name ||
                               (typeof item.id === 'string' && item.id.startsWith('00000000-0000-0000-0000-00000000'))
                                ? t('dashboard.owes')
                                : (item.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou'))
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
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => go({ to: `/profile/${item.id}` })}>
                                  {t('dashboard.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => go({ to: `/settle/${item.id}` })}>
                                  {t('dashboard.settleUp')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </TableBody>
            </Table>
            {hasMoreBalances && (
              <div className="p-3 border-t bg-muted/10">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs font-medium h-9 hover:bg-accent group"
                  onClick={() => setBalancesPage(prev => prev + 1)}
                >
                  {t('dashboard.viewMore', { count: Math.min(ITEMS_PER_PAGE, totalBalances - displayedBalances.length) })}
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard.allSettledUpNoDebts')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('balances.settleUp')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">{t('dashboard.recentActivity')}</h3>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t('expenses.description')}</TableHead>
                <TableHead>{t('groups.title')}</TableHead>
                <TableHead>{t('expenses.date')}</TableHead>
                <TableHead className="text-right">{t('expenses.amount')}</TableHead>
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
                        <p className="text-sm">{t('dashboard.noRecentActivity')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedActivities.map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className="group cursor-pointer hover:bg-accent/50 transition-all duration-200"
                          onClick={() => {
                            if ('type' in item) {
                              go({ to: item.type === "expense" ? `/expenses/show/${item.id}` : `/payments/show/${item.id}` });
                            }
                          }}
                        >
                          <TableCell>
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-110 ${'type' in item && item.type === "expense" ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 group-hover:shadow-blue-200" : "bg-gradient-to-br from-green-50 to-green-100 text-green-700 group-hover:shadow-green-200"}`}>
                              {'type' in item && item.type === "expense" ? <Receipt className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[280px]">
                            <div className="flex flex-col gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                    {item.description}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs font-medium">{item.description}</p>
                                </TooltipContent>
                              </Tooltip>
                              {'is_mine' in item && 'created_by_name' in item && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground line-clamp-2 leading-tight max-w-[250px] group-hover:text-foreground transition-colors">
                                      {t('dashboard.by')} {item.is_mine ? t('common.you') : item.created_by_name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs font-medium">{t('dashboard.by')} {item.is_mine ? t('common.you') : item.created_by_name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {'group_name' in item && item.group_name ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs max-w-[120px] truncate group-hover:scale-105 transition-transform">
                                    {item.group_name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs font-medium">{item.group_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t('dashboard.personal')}</span>
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
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  if ('type' in item) {
                                    go({ to: item.type === "expense" ? `/expenses/show/${item.id}` : `/payments/show/${item.id}` });
                                  }
                                }}>
                                  {t('dashboard.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if ('type' in item) {
                                    go({ to: item.type === "expense" ? `/expenses/edit/${item.id}` : `/payments/edit/${item.id}` });
                                  }
                                }}>
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                    </Tooltip>
                  ))
                )}
              </TooltipProvider>
            </TableBody>
          </Table>
          {hasMoreActivities && (
            <div className="p-3 border-t bg-muted/10">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs font-medium h-9 hover:bg-accent group"
                onClick={() => setActivitiesPage(prev => prev + 1)}
              >
                {t('dashboard.viewMore', { count: Math.min(ITEMS_PER_PAGE, totalActivities - displayedActivities.length) })}
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
