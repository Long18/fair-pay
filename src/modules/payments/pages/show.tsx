import { useOne, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HandCoins } from "lucide-react";
import { PaymentWithProfiles } from "../types";
import { Profile } from "@/modules/profile/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";

interface PaymentExtended extends PaymentWithProfiles {
  groups?: { id: string; name: string };
  friendships?: { id: string };
}

export const PaymentShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();

  const { query: paymentQuery } = useOne<PaymentExtended>({
    resource: "payments",
    id: id!,
    meta: {
      select: "*, from_profile:profiles!from_user(id, full_name, avatar_url), to_profile:profiles!to_user(id, full_name, avatar_url), groups!group_id(id, name), friendships!friendship_id(id)",
    },
  });

  const payment = paymentQuery.data?.data;
  const isLoading = paymentQuery.isLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Payment not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fromProfile = payment.from_profile;
  const toProfile = payment.to_profile;
  const group = payment.groups;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go({ to: "/" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Payment Details</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(payment.created_at)}
          </p>
        </div>
      </div>

      {/* Payment Amount Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-green-600" />
            Payment Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatNumber(payment.amount)} {payment.currency || "VND"}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* From/To Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From User */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">From</p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={fromProfile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {fromProfile?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fromProfile?.full_name || "Unknown"}</p>
                  {identity?.id === payment.from_user && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* To User */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">To</p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={toProfile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {toProfile?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{toProfile?.full_name || "Unknown"}</p>
                  {identity?.id === payment.to_user && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Context (Group or Friend) */}
          {group && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Group</p>
              <Badge variant="outline">{group.name}</Badge>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Payment Date</p>
            <p className="font-medium">{formatDate(payment.payment_date)}</p>
          </div>

          {/* Note */}
          {payment.note && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="text-sm bg-muted p-3 rounded-lg">{payment.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

