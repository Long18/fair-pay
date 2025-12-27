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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

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
  total_amount: number;
  user_share: number;
  currency: string;
  date: string;
  group_name?: string;
  paid_by_name?: string;
  is_lender: boolean;
  is_borrower: boolean;
}

export const ProfileShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
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

    Promise.resolve(
      supabaseClient
        .rpc("get_user_activities", { p_user_id: id, p_limit: 10 })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching activities:", error);
            setActivities([]);
          } else {
            const activities: ActivityItem[] = (data || []).map((item: any) => ({
              id: item.id,
              type: "expense" as const,
              description: item.description,
              total_amount: item.total_amount,
              user_share: item.user_share,
              currency: item.currency || "VND",
              date: item.date,
              group_name: item.group_name,
              paid_by_name: item.paid_by_name,
              is_lender: item.is_lender,
              is_borrower: item.is_borrower,
            }));
            setActivities(activities);
          }
        })
    ).finally(() => setIsLoadingActivities(false));
  }, [id]);

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('profile.loadingProfile')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('profile.profileNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => go({ to: "/" })} className="hover:scale-110 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg ring-4 ring-primary/10">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
              {profile.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-3xl font-bold line-clamp-2 max-w-[400px] leading-tight">{profile.full_name}</h1>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm font-semibold">{profile.full_name}</p>
              </TooltipContent>
            </Tooltip>
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.memberSince', { date: formatDateShort(profile.created_at) })}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.debtsSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDebts ? (
            <p className="text-muted-foreground text-center py-4">{t('profile.loadingDebts')}</p>
          ) : debts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('profile.noDebts')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('profile.person')}</TableHead>
                  <TableHead>{t('profile.status')}</TableHead>
                  <TableHead className="text-right">{t('profile.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.counterparty_id} className="group hover:bg-accent/50 transition-all">
                    <TableCell className="font-medium max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {debt.counterparty_name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">{debt.counterparty_name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={debt.i_owe_them ? "destructive" : "default"}
                        className={`${debt.i_owe_them ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"} transition-all group-hover:scale-105`}
                      >
                        {debt.i_owe_them ? t('profile.owes') : t('profile.isOwed')}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-base transition-all group-hover:scale-105 ${
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
          <CardTitle>{t('profile.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <p className="text-muted-foreground text-center py-4">{t('profile.loadingActivities')}</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('profile.noRecentActivity')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('expenses.description')}</TableHead>
                  <TableHead>{t('expenses.paidBy')}</TableHead>
                  <TableHead>{t('profile.status')}</TableHead>
                  <TableHead>{t('expenses.date')}</TableHead>
                  <TableHead className="text-right">{t('profile.yourShare')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="group cursor-pointer hover:bg-accent/50 transition-all duration-200"
                    onClick={() => {
                      go({
                        to:
                          activity.type === "expense"
                            ? `/expenses/show/${activity.id}`
                            : `/payments/show/${activity.id}`,
                      });
                    }}
                  >
                    <TableCell className="max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <div className="font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                              {activity.description}
                            </div>
                            {activity.group_name && (
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {activity.group_name}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs font-medium">{activity.description}</p>
                          {activity.group_name && (
                            <p className="text-xs text-muted-foreground">{activity.group_name}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{activity.paid_by_name || t('profile.unknown')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('profile.total')}: {formatCurrency(activity.total_amount, activity.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={activity.is_borrower ? "destructive" : "default"}
                        className={`transition-all group-hover:scale-105 ${
                          activity.is_borrower
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {activity.is_borrower ? t('profile.owes') : t('profile.paid')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateShort(activity.date)}</TableCell>
                    <TableCell
                      className={`text-right font-bold text-base transition-transform group-hover:scale-105 ${
                        activity.is_borrower ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(activity.user_share, activity.currency)}
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
