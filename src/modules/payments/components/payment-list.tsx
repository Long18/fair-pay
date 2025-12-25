import { useList } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";
import { Payment } from "../types";

interface PaymentListProps {
  groupId?: string;
  friendshipId?: string;
  currency?: string;
}

export const PaymentList = ({ groupId, friendshipId }: PaymentListProps) => {
  const filters = [];

  if (groupId) {
    filters.push({
      field: "group_id",
      operator: "eq" as const,
      value: groupId,
    });
  }

  if (friendshipId) {
    filters.push({
      field: "friendship_id",
      operator: "eq" as const,
      value: friendshipId,
    });
  }

  const { query } = useList<Payment>({
    resource: "payments",
    filters,
    meta: {
      select: "*, from_profile:from_user(id, full_name, avatar_url), to_profile:to_user(id, full_name, avatar_url)",
    },
    sorters: [
      {
        field: "payment_date",
        order: "desc",
      },
    ],
  });

  const payments: any[] = query.data?.data || [];

  if (query.isLoading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No payments recorded yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <Card key={payment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {payment.from_profile?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {payment.to_profile?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">
                    {payment.from_profile?.full_name} paid{" "}
                    {payment.to_profile?.full_name}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.payment_date).toLocaleDateString("vi-VN")}
                    {payment.note && ` • ${payment.note}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-600">
                  {payment.amount.toLocaleString("vi-VN")} {payment.currency}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
