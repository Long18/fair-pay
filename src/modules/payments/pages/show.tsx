import { useOne, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentWithProfiles } from "../types";
import { Profile } from "@/modules/profile/types";
import { Badge } from "@/components/ui/badge";
import { UserDisplay } from "@/components/user-display";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";

import { useHaptics } from '@/hooks/use-haptics';
import { ArrowLeftIcon, HandCoinsIcon } from "@/components/ui/icons";
interface PaymentExtended extends PaymentWithProfiles {
  groups?: { id: string; name: string };
  friendships?: { id: string };
}

export const PaymentShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { tap } = useHaptics();

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
      <PageContainer padding="none" variant="narrow">
        <PageContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (!payment) {
    return (
      <PageContainer padding="none" variant="narrow">
        <PageContent>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Payment not found</p>
            </CardContent>
          </Card>
        </PageContent>
      </PageContainer>
    );
  }

  const fromProfile = payment.from_profile;
  const toProfile = payment.to_profile;
  const group = payment.groups;

  return (
    <PageContainer padding="none" variant="narrow">
      <PageContent>
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 h-9 w-9 shrink-0"
          onClick={() => { tap(); go({ to: "/" }); }}
          aria-label={t("common.back", { defaultValue: "Back" })}
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <PageHeader
          className="flex-1"
          title={t("payments.showTitle", { defaultValue: "Payment Details" })}
          description={formatDate(payment.created_at)}
        />
      </div>

      {/* Payment Amount Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoinsIcon className="h-5 w-5 text-green-600" />
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
              {fromProfile ? (
                <UserDisplay
                  user={{
                    id: fromProfile.id,
                    full_name: fromProfile.full_name,
                    avatar_url: fromProfile.avatar_url ?? null,
                  }}
                  size="md"
                  excludeGroupIds={group?.id ? [group.id] : undefined}
                  badges={
                    identity?.id === payment.from_user ? (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    ) : undefined
                  }
                />
              ) : (
                <p className="font-medium">Unknown</p>
              )}
            </div>

            {/* To User */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">To</p>
              {toProfile ? (
                <UserDisplay
                  user={{
                    id: toProfile.id,
                    full_name: toProfile.full_name,
                    avatar_url: toProfile.avatar_url ?? null,
                  }}
                  size="md"
                  excludeGroupIds={group?.id ? [group.id] : undefined}
                  badges={
                    identity?.id === payment.to_user ? (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    ) : undefined
                  }
                />
              ) : (
                <p className="font-medium">Unknown</p>
              )}
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
      </PageContent>
    </PageContainer>
  );
};
