import type { ReactNode } from "react";
import { ZapIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatDate } from "@/lib/locale-utils";
import type {
  AgentOperationRow,
  ExternalAgentSubmissionRow,
} from "../../types";
import {
  formatVndAmount,
  buildDetailViewModel,
} from "../admin-agent-operations.utils";
import { DATE_TIME_FORMAT } from "./constants";
import {
  AgentSourceBadge,
  StatusBadge,
  ExternalStatusBadge,
  useAgentSourceLabel,
} from "./badges";

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all">{value}</dd>
    </div>
  );
}

function useDash() {
  const { tAdmin } = useAdminTranslation();
  return <span className="text-muted-foreground">{tAdmin("agentOperations.detail.na")}</span>;
}

export function AgentOpsDetailTitle({ external }: { external: boolean }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <span className="flex items-center gap-2">
      <ZapIcon className="h-4 w-4 shrink-0" />
      <span className="truncate">
        {external
          ? tAdmin("agentOperations.detail.externalTitle")
          : tAdmin("agentOperations.detail.title")}
      </span>
    </span>
  );
}

export function OperationDetailBadges({ row }: { row: AgentOperationRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <AgentSourceBadge source={row.source} />
      <StatusBadge status={row.status} />
    </span>
  );
}

export function ExternalDetailBadges({ row }: { row: ExternalAgentSubmissionRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <AgentSourceBadge source={row.source} />
      <ExternalStatusBadge status={row.status} />
    </span>
  );
}

export function OperationDetailBody({ row }: { row: AgentOperationRow }) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();
  const dash = useDash();
  const view = buildDetailViewModel(row);
  const amount = formatVndAmount(view.total_amount);

  return (
    <dl className="divide-y">
      <DetailRow label={tAdmin("agentOperations.detail.agent")} value={sourceLabel(view.source)} />
      <DetailRow label={tAdmin("agentOperations.detail.operationId")} value={view.operation_id} />
      <DetailRow label={tAdmin("agentOperations.detail.previewId")} value={view.preview_id ?? dash} />
      <DetailRow
        label={tAdmin("common.user")}
        value={
          <div className="flex flex-col">
            <span>{view.user_full_name ?? tAdmin("common.unknown")}</span>
            {view.user_email && (
              <span className="text-xs text-muted-foreground">{view.user_email}</span>
            )}
          </div>
        }
      />
      <DetailRow label={tAdmin("agentOperations.detail.userId")} value={view.user_id} />
      <DetailRow label={tAdmin("agentOperations.detail.group")} value={view.group_name ?? dash} />
      <DetailRow label={tAdmin("agentOperations.detail.description")} value={view.description || dash} />
      <DetailRow label={tAdmin("agentOperations.detail.payer")} value={view.payer_full_name || dash} />
      <DetailRow label={tAdmin("agentOperations.detail.amount")} value={amount ?? dash} />
      <DetailRow label={tAdmin("agentOperations.detail.splitMethod")} value={view.split_method || dash} />
      <DetailRow label={tAdmin("agentOperations.detail.splits")} value={view.splits_count ?? dash} />
      {view.status === "committed" && (
        <DetailRow label={tAdmin("agentOperations.detail.expense")} value={view.expense_id ?? dash} />
      )}
      {(view.status === "failed" || view.status === "expired") && (
        <>
          <DetailRow label={tAdmin("agentOperations.detail.errorCode")} value={view.error_code || dash} />
          <DetailRow label={tAdmin("agentOperations.detail.errorMessage")} value={view.error_message || dash} />
        </>
      )}
      <DetailRow
        label={tAdmin("agentOperations.detail.previewExpiry")}
        value={view.preview_expires_at ? formatDate(view.preview_expires_at, DATE_TIME_FORMAT) : dash}
      />
      <DetailRow
        label={tAdmin("agentOperations.detail.previewConsumed")}
        value={
          view.preview_is_consumed == null
            ? dash
            : view.preview_is_consumed
              ? tAdmin("agentOperations.detail.yes")
              : tAdmin("agentOperations.detail.no")
        }
      />
      <DetailRow
        label={tAdmin("agentOperations.detail.confirmation")}
        value={
          view.has_confirmation
            ? view.confirmation_used
              ? tAdmin("agentOperations.detail.used")
              : tAdmin("agentOperations.detail.created")
            : tAdmin("agentOperations.detail.none")
        }
      />
      <DetailRow label={tAdmin("common.createdAt")} value={formatDate(view.created_at, DATE_TIME_FORMAT)} />
    </dl>
  );
}

export function ExternalDetailBody({ row }: { row: ExternalAgentSubmissionRow }) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();
  const dash = useDash();
  const amount = formatVndAmount(row.total_amount);

  return (
    <dl className="divide-y">
      <DetailRow label={tAdmin("agentOperations.detail.agent")} value={sourceLabel(row.source)} />
      <DetailRow label={tAdmin("agentOperations.detail.submissionId")} value={row.submission_id} />
      <DetailRow label={tAdmin("agentOperations.detail.targetEmail")} value={row.target_email} />
      <DetailRow label={tAdmin("agentOperations.detail.group")} value={row.group_name ?? dash} />
      <DetailRow label={tAdmin("agentOperations.detail.description")} value={row.description || dash} />
      <DetailRow label={tAdmin("agentOperations.detail.amount")} value={amount ?? dash} />
      <DetailRow label={tAdmin("agentOperations.detail.splitMethod")} value={row.split_method || dash} />
      {row.status === "approved" && (
        <DetailRow label={tAdmin("agentOperations.detail.expense")} value={row.expense_id ?? dash} />
      )}
      {row.status === "rejected" && (
        <DetailRow label={tAdmin("agentOperations.detail.rejectReason")} value={row.reject_reason || dash} />
      )}
      {(row.status === "failed" || row.error_code) && (
        <>
          <DetailRow label={tAdmin("agentOperations.detail.errorCode")} value={row.error_code || dash} />
          <DetailRow label={tAdmin("agentOperations.detail.errorMessage")} value={row.error_message || dash} />
        </>
      )}
      <DetailRow label={tAdmin("common.createdAt")} value={formatDate(row.created_at, DATE_TIME_FORMAT)} />
    </dl>
  );
}
