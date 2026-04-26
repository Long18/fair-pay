import { useList } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Payment } from "../types";
import { formatDateShort, formatNumber } from "@/lib/locale-utils";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { useState } from "react";

import { ArrowRightIcon } from "@/components/ui/icons";
interface PaymentListProps {
  groupId?: string;
  friendshipId?: string;
  currency?: string;
}

export const PaymentList = ({ groupId, friendshipId }: PaymentListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    pagination: {
      mode: "off",
    },
    meta: {
      select: "*, from_profile:profiles!from_user(id, full_name, avatar_url), to_profile:profiles!to_user(id, full_name, avatar_url)",
    },
    sorters: [
      {
        field: "payment_date",
        order: "desc",
      },
    ],
  });

  const allPayments: any[] = query.data?.data || [];

  // Client-side pagination
  const totalPayments = allPayments.length;
  const paginationMetadata: PaginationMetadata = {
    totalItems: totalPayments,
    totalPages: Math.ceil(totalPayments / pageSize),
    currentPage: currentPage,
    pageSize: pageSize,
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const payments = allPayments.slice(startIndex, endIndex);

  if (query.isLoading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  if (payments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4">
            <picture className="block w-52 sm:w-60">
              <source
                srcSet="/assets/generated/empty-state-payments.webp"
                type="image/webp"
              />
              <img
                src="/assets/generated/empty-state-payments.png"
                alt=""
                width={1254}
                height={1254}
                className="h-auto w-full"
                decoding="async"
                loading="lazy"
              />
            </picture>
            <p className="text-muted-foreground">No payments recorded yet</p>
          </div>
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
                  <AvatarImage
                    src={payment.from_profile?.avatar_url || undefined}
                    alt={payment.from_profile?.full_name}
                  />
                  <AvatarFallback>
                    {payment.from_profile?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={payment.to_profile?.avatar_url || undefined}
                    alt={payment.to_profile?.full_name}
                  />
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
                    {formatDateShort(payment.payment_date)}
                    {payment.note && ` • ${payment.note}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-600">
                  {formatNumber(payment.amount)} {payment.currency}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pagination Controls */}
      {!query.isLoading && allPayments.length > 0 && paginationMetadata.totalPages > 1 && (
        <div className="mt-4">
          <PaginationControls
            metadata={paginationMetadata}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
