import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "../types";
import { ExpenseList, RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { useMemo } from "react";
import { formatDateShort } from "@/lib/locale-utils";

import { ArrowLeftIcon, PlusIcon } from "@/components/ui/icons";
export const FriendShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

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

  if (isLoadingFriendship || !friendship || !friendProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading friend details...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: "/friends" })}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Back to Friends</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="space-y-6">
        {/* Friend Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                  <AvatarImage src={friendProfile.avatar_url || undefined} alt={friendProfile.full_name} />
                  <AvatarFallback className="text-lg sm:text-2xl">
                    {friendProfile.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">
                    {friendProfile.full_name}
                  </CardTitle>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Friends since {formatDateShort(friendship.created_at)}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAddExpense}
                className="w-full sm:w-auto"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for Expenses and Balances */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3">
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="balances" className="text-xs sm:text-sm">Balances</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs sm:text-sm">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-6 focus-visible:outline-none">
            <ExpenseList friendshipId={friendship.id} members={members} />
          </TabsContent>

          <TabsContent value="balances" className="mt-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <SimplifiedBalanceView
                  balances={balances}
                  currentUserId={identity?.id || ""}
                  simplifyDebts={false}  // Friend expenses don't need simplification (only 2 people)
                  onSettleUp={handleSettleUp}
                  currency="VND"
                />
              </div>
              {payments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                  <PaymentList
                    friendshipId={friendship.id}
                    currency="VND"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="mt-6 focus-visible:outline-none">
            <RecurringExpenseList friendshipId={friendship.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
