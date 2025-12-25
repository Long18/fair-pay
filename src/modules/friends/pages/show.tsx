import { useOne, useList, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "../types";
import { ExpenseList, RecurringExpenseList } from "@/modules/expenses";
import { SimplifiedBalanceView, PaymentList, useBalanceCalculation } from "@/modules/payments";
import { useMemo } from "react";

export const FriendShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { query: friendshipQuery } = useOne<Friendship>({
    resource: "friendships",
    id: id!,
    meta: {
      select: "*, user_a_profile!user_a(id, full_name, avatar_url), user_b_profile!user_b(id, full_name, avatar_url)",
    },
  });

  // Fetch expenses for this friendship
  const { query: expensesQuery } = useList({
    resource: "expenses",
    filters: [{ field: "friendship_id", operator: "eq", value: id }],
    meta: {
      select: "*, expense_splits!expense_id(*)",
    },
    pagination: {
      mode: "off",
    },
  });

  // Fetch payments for this friendship
  const { query: paymentsQuery } = useList({
    resource: "payments",
    filters: [{ field: "friendship_id", operator: "eq", value: id }],
    pagination: {
      mode: "off",
    },
  });

  const { data: friendshipData, isLoading: isLoadingFriendship } = friendshipQuery;
  const friendship: any = friendshipData?.data;
  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  // Determine friend profile (the other person in the friendship)
  const friendProfile = useMemo(() => {
    if (!friendship || !identity?.id) return null;

    const isUserA = friendship.user_a_id === identity.id;
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
    <div className="container max-w-6xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: "/friends" })}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Friends
      </Button>

      <div className="space-y-6">
        {/* Friend Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-2xl">
                    {friendProfile.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl">
                    {friendProfile.full_name}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Friends since {new Date(friendship.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <Button onClick={handleAddExpense}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for Expenses and Balances */}
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseList friendshipId={friendship.id} members={members} />
          </TabsContent>

          <TabsContent value="balances" className="mt-6">
            <SimplifiedBalanceView
              balances={balances}
              currentUserId={identity?.id || ""}
              simplifyDebts={false}  // Friend expenses don't need simplification (only 2 people)
              onSettleUp={handleSettleUp}
              currency="VND"
            />

            {payments.length > 0 && (
              <div className="mt-6">
                <PaymentList
                  friendshipId={friendship.id}
                  currency="VND"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <RecurringExpenseList friendshipId={friendship.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
