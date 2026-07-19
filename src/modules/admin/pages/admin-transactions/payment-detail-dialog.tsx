import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PencilIcon } from "@/components/ui/icons";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import { DetailRow } from "./shared-ui";
import type { PaymentRow } from "./types";

export function PaymentDetailDialog({
  payment, open, onOpenChange, onEdit, onDelete, canDelete,
}: {
  payment: PaymentRow | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tAdmin("transactions.payments.detailTitle")}</DialogTitle>
          <DialogDescription>{formatDate(payment.payment_date)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <UserAvatar
              user={{
                full_name: payment.from_user_name,
                avatar_url: payment.from_user_avatar,
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{tAdmin("transactions.payments.fromUser")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-medium truncate">{payment.from_user_name}</p>
                <UserGroupStack userId={payment.from_user_id} size="xs" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <UserAvatar
              user={{
                full_name: payment.to_user_name,
                avatar_url: payment.to_user_avatar,
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{tAdmin("transactions.payments.toUser")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-medium truncate">{payment.to_user_name}</p>
                <UserGroupStack userId={payment.to_user_id} size="xs" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <DetailRow label={tAdmin("common.amount")} value={<span className="font-mono tabular-nums font-medium">{formatNumber(payment.amount)} {payment.currency}</span>} />
            <DetailRow label={tAdmin("transactions.expenses.context")} value={payment.group_name ?? payment.friendship_name ?? tAdmin("context.friends")} />
            <DetailRow label={tAdmin("transactions.payments.method")} value={
              <Badge className={payment.context_type === "group"
                ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
                : "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
              }>{payment.context_type === "group" ? tAdmin("context.group") : tAdmin("context.friends")}</Badge>
            } />
            <DetailRow label={tAdmin("transactions.payments.paymentDate")} value={formatDate(payment.payment_date)} />
            <DetailRow label={tAdmin("transactions.payments.currency")} value={payment.currency} />
            <DetailRow label={tAdmin("common.createdAt")} value={formatDate(payment.created_at)} />
            <DetailRow label="ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
            {payment.note && <DetailRow label={tAdmin("transactions.payments.note")} value={payment.note} />}
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
          {canDelete ? <Button size="sm" variant="destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
