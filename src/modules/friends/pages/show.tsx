import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useParams, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserGroupStack } from "@/components/user-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "../types";
import { RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { useMemo, useState, useCallback } from "react";
import { formatDateShort } from "@/lib/locale-utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  ReceiptIcon,
  BanknoteIcon,
  RepeatIcon,
  Loader2Icon,
  ShareIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { SwipeableTabs, PullToRefresh, EmptyBalances } from "@/modules/profile";
import { Breadcrumb, createBreadcrumbs } from "@/components/refine-ui/layout/breadcrumb";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity-list";
import { useHaptics } from "@/hooks/use-haptics";

export const FriendShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { tap } = useHaptics();

  // Get tab from URL, default to 'activity'
  const activeTab = searchParams.get('tab') || 'activity';

  // Set tab in URL (only when user changes it, not on initial load)
  const handleTabChange = (tab: string) => {
    tap();
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  // First, try to fetch as friendship ID
  const { query: friendshipQuery } = useOne<Friendship>({
    resource: "friendships",
    id: id!,
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    queryOptions: {
      retry: false, // Don't retry if it fails (might be a user ID)
    },
  });

  // If friendship query fails (might be a user ID), find friendship by user ID
  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: identity?.id ? [
      {
        field: "user_a",
        operator: "eq",
        value: identity.id < id! ? identity.id : id!,
      },
      {
        field: "user_b",
        operator: "eq",
        value: identity.id < id! ? id! : identity.id,
      },
    ] : [],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    queryOptions: {
      enabled: !friendshipQuery.data?.data && !!identity?.id, // Only run if friendship query didn't find anything
    },
  });

  const { data: friendshipData, isLoading: isLoadingFriendshipDirect } = friendshipQuery;
  const { data: friendshipsData, isLoading: isLoadingFriendshipList } = friendshipsQuery;

  // Get friendship from either direct query or list query
  const friendship: any = useMemo(() => {
    if (friendshipData?.data) {
      return friendshipData.data;
    }
    // If direct query didn't work, try to find in list (user ID case)
    if (friendshipsData?.data && friendshipsData.data.length > 0) {
      return friendshipsData.data[0];
    }
    return null;
  }, [friendshipData, friendshipsData]);

  const isLoadingFriendship = isLoadingFriendshipDirect || isLoadingFriendshipList;

  // Fetch expenses for this friendship
  const { query: expensesQuery } = useList({
    resource: "expenses",
    filters: friendship?.id ? [{ field: "friendship_id", operator: "eq", value: friendship.id }] : [],
    meta: {
      select: "*, expense_splits!expense_id(*)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!friendship?.id,
    },
  });

  // Fetch payments for this friendship
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: friendship?.id ? [{ field: "friendship_id", operator: "eq", value: friendship.id }] : [],
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!friendship?.id,
    },
  });

  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  // Determine friend profile (the other person in the friendship)
  const friendProfile = useMemo(() => {
    if (!friendship || !identity?.id) return null;

    const isUserA = friendship.user_a === identity.id;
    return isUserA ? friendship.user_b_profile : friendship.user_a_profile;
  }, [friendship, identity]);

  // Calculate balances between the two users
  const members = useMemo(() => {
    if (!identity?.id || !friendProfile) return [];

    return [
      {
        id: identity.id,
        full_name: "You",
        avatar_url: null,
      },
      {
        id: friendProfile.id,
        full_name: friendProfile.full_name,
        avatar_url: friendProfile.avatar_url,
      },
    ];
  }, [identity, friendProfile]);

  const balances = useBalanceCalculation({
    expenses,
    payments,
    currentUserId: identity?.id || "",
    members,
  });

  // Use enhanced activity hook for transaction-centric activity list
  const {
    activities: enhancedActivities,
    isLoading: isLoadingActivities,
  } = useEnhancedActivity({ friendshipId: friendship?.id });

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        friendshipQuery.refetch(),
        expensesQuery.refetch(),
        paymentsQuery.refetch(),
      ]);
      toast.success(t('common.refreshed', 'Data refreshed'));
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error(t('common.refreshError', 'Failed to refresh'));
    } finally {
      setIsRefreshing(false);
    }
  }, [friendshipQuery, expensesQuery, paymentsQuery, t]);

  const handleAddExpense = () => {
    if (!friendship?.id) return;
    tap();
    go({ to: `/friends/${friendship.id}/expenses/create` });
  };

  const handleSettleUp = (toUserId: string, amount: number) => {
    if (!friendship?.id) return;
    tap();
    go({
      to: `/friends/${friendship.id}/payments/create`,
      query: {
        to_user: toUserId,
        amount: amount.toString(),
      },
    });
  };

  const handleShare = async () => {
    tap();
    const friendUrl = `${window.location.origin}/friends/${id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: friendProfile?.full_name || 'Friend',
          text: t('friends.shareText', `Check out expenses with ${friendProfile?.full_name} on FairPay`),
          url: friendUrl,
        });
      } else {
        await navigator.clipboard.writeText(friendUrl);
        toast.success(t('common.linkCopied', 'Link copied to clipboard'));
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoadingFriendship) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2Icon size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!friendship || !friendProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('friends.friendNotFound', 'Friend not found')}</p>
            <Button
              onClick={() => go({ to: "/friends" })}
              className="mt-4 rounded-lg"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.backToFriends', 'Back to Friends')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = ["activity", "balances", "recurring"];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl pb-20 sm:pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Breadcrumb Navigation (Desktop only) */}
          <Breadcrumb
            items={[
              createBreadcrumbs.home(),
              createBreadcrumbs.friends(),
              createBreadcrumbs.friendDetail(friendProfile.full_name),
            ]}
          />

          {/* Desktop Back Button & Mobile Back Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => { tap(); go({ to: "/connections?tab=friends" }); }}
              className="rounded-lg md:hidden"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.back', 'Back')}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="rounded-lg ml-auto"
            >
              <ShareIcon size={16} className="mr-2 sm:mr-0" />
              <span className="sm:sr-only">{t('common.share', 'Share')}</span>
            </Button>
          </div>

          {/* Friend Header */}
          <Card className="rounded-xl overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl" />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-6">
                {/* Avatar */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl">
                    <AvatarImage src={friendProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                      {friendProfile.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Friend Info */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold truncate max-w-full">{friendProfile.full_name}</h1>
                    <Badge variant="secondary" className="rounded-full">
                      {t('friends.friendsSince', {
                        date: formatDateShort(friendship.created_at),
                        defaultValue: `Friends since ${formatDateShort(friendship.created_at)}`
                      })}
                    </Badge>
                    <UserGroupStack userId={friendProfile.id} size="sm" />
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                    {t('friends.since', 'Since')} {formatDateShort(friendship.created_at)}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <Button
                      onClick={handleAddExpense}
                      variant="default"
                      size="sm"
                      className="rounded-lg"
                    >
                      <PlusIcon size={16} className="mr-2" />
                      {t('expenses.addExpense', 'Add Expense')}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </Card>

          {/* Tabs for Activity, Balances, and Recurring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="w-full"
          >
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full rounded-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                <TabsTrigger value="activity" className="rounded-lg">
                  <ReceiptIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('expenses.title', 'Expenses')}</span>
                </TabsTrigger>
                <TabsTrigger value="balances" className="rounded-lg">
                  <BanknoteIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('balances.title', 'Balances')}</span>
                </TabsTrigger>
                <TabsTrigger value="recurring" className="rounded-lg">
                  <RepeatIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">{t('expenses.recurring', 'Recurring')}</span>
                </TabsTrigger>
              </TabsList>

              <SwipeableTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mt-4"
              >
                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t('expenses.title', 'Expenses')}</CardTitle>
                        {expenses.length > 0 && (
                          <Badge variant="secondary">
                            {expenses.length} {t('common.items', 'items')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {expenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="text-5xl mb-4">🎉</div>
                          <p className="font-semibold text-lg">{t('friends.readyToTrack', 'Ready to track expenses!')}</p>
                          <p className="text-muted-foreground mt-2 max-w-sm">
                            {t('friends.addFirstExpense', 'Add your first expense to start splitting costs.')}
                          </p>
                          <Button
                            className="mt-4 rounded-lg"
                            onClick={handleAddExpense}
                          >
                            <PlusIcon size={16} className="mr-2" />
                            {t('expenses.addExpense', 'Add Expense')}
                          </Button>
                        </div>
                      ) : (
                        <EnhancedActivityList
                          activities={enhancedActivities}
                          currentUserId={identity?.id || ""}
                          currency="VND"
                          isLoading={isLoadingActivities}
                          showSummary={true}
                          showFilters={true}
                          showSort={true}
                          showTimeGrouping={true}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Balances Tab */}
                <TabsContent value="balances" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t('balances.title', 'Balances')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {balances.length === 0 ? (
                        <EmptyBalances onAction={handleAddExpense} />
                      ) : (
                        <div className="space-y-6">
                          <SimplifiedBalanceView
                            balances={balances}
                            currentUserId={identity?.id || ""}
                            simplifyDebts={false}
                            onSettleUp={handleSettleUp}
                            currency="VND"
                          />
                          {payments.length > 0 && (
                            <div>
                              <h3 className="text-base font-semibold mb-3">{t('payments.history', 'Payment History')}</h3>
                              <PaymentList
                                friendshipId={friendship.id}
                                currency="VND"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Recurring Tab */}
                <TabsContent value="recurring" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t('expenses.recurring', 'Recurring Expenses')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RecurringExpenseList friendshipId={friendship.id} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </SwipeableTabs>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </PullToRefresh>
  );
};
