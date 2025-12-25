import { useCreate, useGo, useGetIdentity, useList } from "@refinedev/core";
import { useParams, useSearchParams } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentForm } from "../components/payment-form";
import { PaymentFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { toast } from "sonner";

export const PaymentCreate = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const createMutation = useCreate();

  // Fetch group members
  const { query: membersQuery } = useList({
    resource: "group_members",
    filters: [{ field: "group_id", operator: "eq", value: groupId }],
    meta: {
      select: "*, profiles:user_id(*)",
    },
  });

  const members = (membersQuery.data?.data || []).map((m: any) => ({
    id: m.user_id,
    full_name: m.profiles?.full_name || "Unknown",
  }));

  const suggestedToUserId = searchParams.get("toUser") || undefined;
  const suggestedAmount = searchParams.get("amount") 
    ? parseFloat(searchParams.get("amount")!) 
    : undefined;

  const handleSubmit = (values: PaymentFormValues) => {
    if (!groupId) return;

    const paymentData = {
      ...values,
      group_id: groupId,
      created_by: identity?.id,
    };

    createMutation.mutate(
      {
        resource: "payments",
        values: paymentData,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded successfully");
          go({ to: `/groups/show/${groupId}` });
        },
        onError: (error) => {
          toast.error(`Failed to record payment: ${error.message}`);
        },
      }
    );
  };

  const handleClose = () => {
    go({ to: `/groups/show/${groupId}` });
  };

  if (!identity || !groupId || membersQuery.isLoading) {
    return null;
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <PaymentForm
          fromUserId={identity.id}
          fromUserName={identity.full_name}
          members={members}
          suggestedAmount={suggestedAmount}
          suggestedToUserId={suggestedToUserId}
          onSubmit={handleSubmit}
          isLoading={false}
        />
      </DialogContent>
    </Dialog>
  );
};

