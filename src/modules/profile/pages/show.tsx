import { useOne, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Profile } from "../types";
import { supabaseClient } from "@/utility/supabaseClient";
import { useEffect, useState } from "react";
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  amount: number;
  i_owe_them: boolean;
}

interface ActivityItem {
  id: string;
  type: "expense" | "payment";
  description: string;
  amount: number;
  currency: string;
  date: string;
  group_name?: string;
}

export const ProfileShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const { query: profileQuery } = useOne<Profile>({
    resource: "profiles",
    id: id!,
  });

  const { data: profileData, isLoading: isLoadingProfile } = profileQuery;
  const profile = profileData?.data;

  useEffect(() => {
    if (!id) return;

    setIsLoadingDebts(true);
    Promise.resolve(
      supabaseClient
        .rpc("get_user_debts_aggregated", { p_user_id: id })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching debts:", error);
            setDebts([]);
          } else {
            setDebts(data || []);
          }
        })
    ).finally(() => setIsLoadingDebts(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;

    setIsLoadingActivities(true);

    Promise.all([
      supabaseClient
        .from("expenses")
        .select("id, description, amount, currency, date, group_id, groups(name)")
        .or(`created_by.eq.${id},expense_splits.user_id.eq.${id}`)
        .order("date", { ascending: false })
        .limit(10),
      supabaseClient
        .from("payments")
        .select("id, description, amount, currency, created_at")
        .or(`from_user.eq.${id},to_user.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(10),
    ])
      .then(([expensesRes, paymentsRes]) => {
        const expenses: ActivityItem[] = (expensesRes.data || []).map((e: any) => ({
          id: e.id,
          type: "expense" as const,
          description: e.description,
          amount: e.amount,
          currency: e.currency || "VND",
          date: e.date,
          group_name: e.groups?.name,
        }));

        const payments: ActivityItem[] = (paymentsRes.data || []).map((p: any) => ({
          id: p.id,
          type: "payment" as const,
          description: p.description || "Payment",
          amount: p.amount,
          currency: p.currency || "VND",
          date: p.created_at,
        }));

        const combined = [...expenses, ...payments].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setActivities(combined.slice(0, 10));
      })
      .catch((err) => {
        console.error("Error fetching activities:", err);
        setActivities([]);
      })
      .finally(() => setIsLoadingActivities(false));
  }, [id]);

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => go({ to: "/" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>
              {profile.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              Member since {formatDateShort(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debts Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDebts ? (
            <p className="text-muted-foreground text-center py-4">Loading debts...</p>
          ) : debts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No debts</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.counterparty_id}>
                    <TableCell className="font-medium">
                      {debt.counterparty_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={debt.i_owe_them ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {debt.i_owe_them ? "Owes" : "Is owed"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        debt.i_owe_them ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(debt.amount, "VND")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <p className="text-muted-foreground text-center py-4">Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => {
                      go({
                        to:
                          activity.type === "expense"
                            ? `/expenses/show/${activity.id}`
                            : `/payments/show/${activity.id}`,
                      });
                    }}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.description}</div>
                        {activity.group_name && (
                          <div className="text-xs text-muted-foreground">
                            {activity.group_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={activity.type === "expense" ? "default" : "secondary"}>
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateShort(activity.date)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(activity.amount, activity.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
