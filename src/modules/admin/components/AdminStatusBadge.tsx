import { CheckCircle2Icon, ClockIcon, Trash2Icon, PlusIcon, PencilIcon, InfoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type SettlementBadgeProps = {
  type: "settlement";
  settled: boolean;
  settledLabel: string;
  pendingLabel: string;
};

type AuditActionBadgeProps = {
  type: "audit-action";
  action: string;
};

type AdminStatusBadgeProps = SettlementBadgeProps | AuditActionBadgeProps;

export function AdminStatusBadge(props: AdminStatusBadgeProps) {
  if (props.type === "settlement") {
    const { settled, settledLabel, pendingLabel } = props;
    return settled ? (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border border-[var(--status-success-border)]"
      )}>
        <CheckCircle2Icon className="h-3 w-3" />
        {settledLabel}
      </span>
    ) : (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border border-[var(--status-warning-border)]"
      )}>
        <ClockIcon className="h-3 w-3" />
        {pendingLabel}
      </span>
    );
  }

  // audit-action
  const { action } = props;
  if (action === "DELETE") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--status-error-bg)] text-[var(--status-error-foreground)] border border-[var(--status-error-border)]"
      )}>
        <Trash2Icon className="h-3 w-3" />
        {action}
      </span>
    );
  }
  if (action === "INSERT") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border border-[var(--status-success-border)]"
      )}>
        <PlusIcon className="h-3 w-3" />
        {action}
      </span>
    );
  }
  if (action === "UPDATE") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border border-[var(--status-warning-border)]"
      )}>
        <PencilIcon className="h-3 w-3" />
        {action}
      </span>
    );
  }
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border border-[var(--status-info-border)]"
    )}>
      <InfoIcon className="h-3 w-3" />
      {action.replace(/_/g, " ")}
    </span>
  );
}
