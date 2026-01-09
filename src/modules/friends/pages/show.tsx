import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "../types";
import { ExpenseList, RecurringExpenseList } from "@/modules/expenses";
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
} from "@/components/ui/icons";
import { SwipeableTabs, PullToRefresh, EmptyBalances } from "@/modules/profile";

export const FriendShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [activeTab, setActiveTab] = useState("expenses");
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    go({ to: `/friends/${friendship.id}/expenses/create` });
  };

  const handleSettleUp = (toUserId: string, amount: number) => {
    if (!friendship?.id) return;
    go({
      to: `/friends/${friendship.id}/payments/create`,
      query: {
        to_user: toUserId,
        amount: amount.toString(),
      },
    });
  };

  const handleShare = async () => {
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

  const tabs = ["expenses", "balances", "recurring"];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl pb-20 sm:pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Desktop Back Button */}
          <div className="hidden sm:flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => go({ to: "/friends" })}
              className="rounded-lg"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.back', 'Back')}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="rounded-lg"
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
              {/* Background gradient */}
              <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl" />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-6">
                {/* Avatar */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={friendProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl sm:text-3xl bg-gradient-to-br from-primary/20 to-primary/10">
                      {friendProfile.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Friend Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">{friendProfile.full_name}</h1>
                    <Badge variant="secondary" className="rounded-full">
                      {t('friends.friendsSince', {
                        date: formatDateShort(friendship.created_at),
                        defaultValue: `Friends since ${formatDateShort(friendship.created_at)}`
                      })}
                    </Badge>
                  </div>

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

                    <Button
                      onClick={handleShare}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      <ShareIcon size={16} className="mr-2 sm:mr-0" />
                      <span className="sm:sr-only">{t('common.share', 'Share')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </Card>

          {/* Tabs for Expenses, Balances, and Recurring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="w-full"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full rounded-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                <TabsTrigger value="expenses" className="rounded-lg">
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
                onTabChange={setActiveTab}
                className="mt-4"
              >
                {/* Expenses Tab */}
                <TabsContent value="expenses" className="mt-0">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t('expenses.title', 'Expenses')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseList friendshipId={friendship.id} members={members} />
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                          <div>
                            <SimplifiedBalanceView
                              balances={balances}
                              currentUserId={identity?.id || ""}
                              simplifyDebts={false}
                              onSettleUp={handleSettleUp}
                              currency="VND"
                            />
                          </div>
                          {payments.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-4">{t('payments.history', 'Payment History')}</h3>
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
