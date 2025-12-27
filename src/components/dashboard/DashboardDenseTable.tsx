import { MoreHorizontal, Receipt, Banknote, Users, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePaginatedActivities } from "@/hooks/use-paginated-activities";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";

interface DashboardDenseTableProps {
  disabled?: boolean;
}

export function DashboardDenseTable({ disabled = false }: DashboardDenseTableProps) {
  const {
    items: activities,
    metadata,
    isLoading: activitiesLoading,
    setPage,
    currentPage,
    refetch: refetchActivities,
  } = usePaginatedActivities({ pageSize: 10 });

  const { data: debts = [], isLoading: debtsLoading, refetch: refetchDebts } = useAggregatedDebts();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const { t } = useTranslation();

  // State for settle dialog
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<typeof debtItems[0] | null>(null);
  const [isSettling, setIsSettling] = useState(false);

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

  const getAvatarGradient = (owe: boolean) => {
    return owe
      ? "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100"
      : "bg-gradient-to-br from-rose-100 via-red-50 to-pink-100";
  };

  const getAvatarTextColor = (owe: boolean) => {
    return owe ? "text-teal-700" : "text-red-700";
  };

  const getAmountColor = (owe: boolean) => {
    return owe ? "text-teal-600" : "text-red-600";
  };

  // Handle settle all debts
  const handleSettleAll = async (counterpartyId: string, counterpartyName: string, amount: number) => {
    setIsSettling(true);
    try {
      const { data, error } = await supabaseClient.rpc('settle_all_debts_with_person', {
        p_counterparty_id: counterpartyId,
      });

      if (error) throw error;

      toast.success(t('dashboard.settleSuccess', {
        name: counterpartyName,
        amount: formatCurrency(amount),
        defaultValue: `Successfully settled ₫${formatCurrency(amount)} with ${counterpartyName}`,
      }));

      // Refetch debts and activities
      refetchDebts();
      refetchActivities();
      setSettleDialogOpen(false);
    } catch (error: any) {
      console.error('Error settling debt:', error);
      toast.error(t('dashboard.settleError', {
        defaultValue: `Failed to settle debt: ${error.message}`,
      }));
    } finally {
      setIsSettling(false);
    }
  };

  // Process debts for display
  const debtItems = debts.map(d => {
    const getDescription = () => {
      if ((d as any).owed_to_name) {
        const owedToName = (d as any).owed_to_name;
        return `${d.counterparty_name} ${t('dashboard.owes')} ${owedToName}`;
      } else {
        return d.i_owe_them
          ? `${t('dashboard.youOwe')} ${d.counterparty_name}`
          : `${d.counterparty_name} ${t('dashboard.userOwesYou')}`;
      }
    };

    return {
      ...d,
      description: getDescription(),
    };
  });

  if (debtsLoading && activitiesLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (debtItems.length === 0 && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-2xl bg-gradient-to-br from-muted/30 via-muted/10 to-muted/30">
        <div className="relative">
          <div className="h-20 w-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Receipt className="h-10 w-10 text-primary/60" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 bg-primary/20 rounded-full animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          {t('dashboard.noRecentActivity')}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {disabled
            ? t('dashboard.loginToAddExpense')
            : t('dashboard.recordNewExpense')
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ============================================== */}
      {/* BALANCES / DEBTS SECTION - IMPROVED UI/UX */}
      {/* ============================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-100 to-purple-100 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {t('balances.title')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {debtItems.length} {debtItems.length === 1 ? t('dashboard.balance') : t('balances.title').toLowerCase()}
              </p>
            </div>
          </div>
          {debtItems.length > 0 && (
            <Badge variant="outline" className="text-sm font-semibold px-4 py-1.5 border-2">
              {debtItems.length}
            </Badge>
          )}
        </div>

        <div className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
          {debtItems.length > 0 ? (
            <Table>
              <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b-2">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px] font-bold"></TableHead>
                  <TableHead className="font-bold text-foreground">{t('profile.person')}</TableHead>
                  <TableHead className="font-bold text-foreground">{t('profile.status')}</TableHead>
                  <TableHead className="text-right font-bold text-foreground">{t('profile.amount')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TooltipProvider delayDuration={100}>
                  {debtItems.map((item, index) => (
                    <Tooltip key={item.counterparty_id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className={`group cursor-pointer transition-all duration-300 hover:bg-gradient-to-r ${
                            item.i_owe_them
                              ? "hover:from-emerald-50/50 hover:to-teal-50/30"
                              : "hover:from-rose-50/50 hover:to-red-50/30"
                          } ${index % 2 === 0 ? "bg-muted/20" : ""}`}
                          onClick={() => go({ to: `/profile/${item.counterparty_id}` })}
                        >
                          <TableCell>
                            <Avatar className={`h-12 w-12 border-3 shadow-lg ring-4 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl ${
                              item.i_owe_them
                                ? "ring-teal-200 group-hover:ring-teal-300"
                                : "ring-red-200 group-hover:ring-red-300"
                            }`}>
                              <AvatarImage src={item.counterparty_avatar_url || undefined} alt={item.counterparty_name} />
                              <AvatarFallback className={`text-base font-bold ${getAvatarGradient(item.i_owe_them)} ${getAvatarTextColor(item.i_owe_them)}`}>
                                {item.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium max-w-[280px]">
                            <div className="flex flex-col gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                                    {item.description}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  <p className="text-sm font-medium">{item.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.i_owe_them ? "default" : "destructive"}
                              className="text-sm font-semibold px-3 py-1 shadow-sm"
                            >
                              {!!(item as any).owed_to_name ||
                               (typeof item.counterparty_id === 'string' && item.counterparty_id.startsWith('00000000-0000-0000-0000-00000000'))
                                ? t('dashboard.owes')
                                : (item.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou'))
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-lg font-bold ${getAmountColor(item.i_owe_them)} group-hover:scale-105 transition-transform duration-200`}>
                                ₫{formatCurrency(Number(item.amount))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAuthenticated ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10"
                                  >
                                    <MoreHorizontal className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem onClick={() => go({ to: `/profile/${item.counterparty_id}` })}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    {t('dashboard.viewDetails')}
                                  </DropdownMenuItem>
                                  {!item.i_owe_them && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedDebt(item);
                                          setSettleDialogOpen(true);
                                        }}
                                        className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        {t('dashboard.settleAll')} (₫{formatCurrency(Number(item.amount))})
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                onClick={() => go({ to: `/profile/${item.counterparty_id}` })}
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-lg font-bold text-foreground mb-1">{t('dashboard.allSettledUpNoDebts')}</p>
              <p className="text-sm text-muted-foreground">{t('balances.settleUp')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================== */}
      {/* RECENT ACTIVITY SECTION - IMPROVED UI/UX + PAGINATION */}
      {/* ============================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shadow-sm">
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {t('dashboard.recentActivity')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {metadata.totalItems} {t('dashboard.transactions', 'transactions')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b-2">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] font-bold"></TableHead>
                <TableHead className="font-bold text-foreground">{t('expenses.description')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('groups.title')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('expenses.date')}</TableHead>
                <TableHead className="text-right font-bold text-foreground">{t('expenses.amount')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider delayDuration={100}>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-16 w-16 bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl flex items-center justify-center mb-4">
                          <Receipt className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-base font-semibold text-muted-foreground">{t('dashboard.noRecentActivity')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((item, index) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className={`group cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/30 ${
                            index % 2 === 0 ? "bg-muted/20" : ""
                          }`}
                          onClick={() => {
                            if ('type' in item) {
                              go({ to: item.type === "expense" ? `/expenses/show/${item.id}` : `/payments/show/${item.id}` });
                            }
                          }}
                        >
                          <TableCell>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                              {item.type === "expense" ? (
                                <Receipt className="h-6 w-6 text-purple-600" />
                              ) : (
                                <Banknote className="h-6 w-6 text-pink-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[300px]">
                            <div className="flex flex-col gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                                    {item.description}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  <p className="text-sm font-medium">{item.description}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground font-medium line-clamp-1">
                                    {t('dashboard.by')} {item.created_by_name}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">{t('dashboard.by')} {item.created_by_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm font-semibold text-muted-foreground line-clamp-1 max-w-[120px] block group-hover:text-primary transition-colors duration-200">
                                  {item.group_name || t('dashboard.personal')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-sm">{item.group_name || t('dashboard.personal')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatTimeAgo(item.date)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-lg font-bold text-primary group-hover:scale-105 transition-transform duration-200 inline-block">
                              ₫{formatCurrency(Number(item.amount))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10"
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => go({ to: item.type === "expense" ? `/expenses/show/${item.id}` : `/payments/show/${item.id}` })}
                                >
                                  {t('dashboard.viewDetails')}
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

          {/* Pagination Controls */}
          {activities.length > 0 && metadata.totalPages > 1 && (
            <div className="border-t-2 bg-gradient-to-r from-muted/30 to-muted/10 px-6 py-4">
              <PaginationControls
                metadata={metadata}
                onPageChange={setPage}
                showFirstLast={true}
                maxVisiblePages={5}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settle Confirmation Dialog */}
      <AlertDialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard.settleAllTitle', 'Settle All Debts')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDebt && (
                <>
                  {t('dashboard.settleAllDescription', {
                    name: selectedDebt.counterparty_name,
                    amount: formatCurrency(Number(selectedDebt.amount)),
                    defaultValue: `Are you sure you want to mark all debts with ${selectedDebt.counterparty_name} (₫${formatCurrency(Number(selectedDebt.amount))}) as paid? This action cannot be undone.`,
                  })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettling}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedDebt) {
                  handleSettleAll(
                    selectedDebt.counterparty_id,
                    selectedDebt.counterparty_name,
                    Number(selectedDebt.amount)
                  );
                }
              }}
              disabled={isSettling}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSettling ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('dashboard.settling', 'Settling...')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('dashboard.confirmSettle', 'Confirm Settle')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
