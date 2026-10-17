import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, PencilIcon } from "@/components/ui/icons";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import { DetailRow } from "./shared-ui";
import type { PaymentRow } from "./types";

function PartyRow({ label, name, avatar, userId }: { label: string; name: string; avatar: string | null; userId: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <UserAvatar user={{ full_name: name, avatar_url: avatar }} size="md" />
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <UserGroupStack userId={userId} size="xs" />
        </div>
      </div>
    </div>
  );
}

export function PaymentDetailFooter({
  onEdit, onDelete, canDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <>
      {canDelete ? <Button size="sm" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={onDelete}>{tAdmin("common.delete")}</Button> : null}
      <Button size="sm" variant="outline" onClick={onEdit}><PencilIcon className="mr-2 h-4 w-4" />{tAdmin("common.edit")}</Button>
    </>
  );
}

export function PaymentDetailPanel({ payment }: { payment: PaymentRow }) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{tAdmin("common.amount")}</p>
        <p className="truncate font-mono text-lg font-semibold tabular-nums">
          {formatNumber(payment.amount)} <span className="text-sm font-normal text-muted-foreground">{payment.currency}</span>
        </p>
      </div>

      <section aria-label={tAdmin("layout.transactions.paymentFlow")} className="relative divide-y rounded-lg border">
        <PartyRow label={tAdmin("transactions.payments.fromUser")} name={payment.from_user_name} avatar={payment.from_user_avatar} userId={payment.from_user_id} />
        <span className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground" aria-hidden="true">
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </span>
        <PartyRow label={tAdmin("transactions.payments.toUser")} name={payment.to_user_name} avatar={payment.to_user_avatar} userId={payment.to_user_id} />
      </section>

      <div>
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
        <DetailRow label={tAdmin("layout.transactions.id")} value={<span className="font-mono text-xs">{payment.id}</span>} />
      </div>

      {payment.note ? (
        <div className="space-y-1.5">
          <h4 className="text-xs text-muted-foreground">{tAdmin("transactions.payments.note")}</h4>
          <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{payment.note}</p>
        </div>
      ) : null}
    </div>
  );
}
