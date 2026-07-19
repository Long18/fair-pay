import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground col-span-1">{label}</span>
      <span className="col-span-2 break-all">{value}</span>
    </div>
  );
}

export function OperationDetailDialog({
  open,
  row,
  onOpenChange,
}: {
  open: boolean;
  row: AgentOperationRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const view = buildDetailViewModel(row);
  const amount = formatVndAmount(view.total_amount);
  const dash = (
    <span className="text-muted-foreground">
      {tAdmin("agentOperations.detail.na")}
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            {tAdmin("agentOperations.detail.title")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-2">
              <AgentSourceBadge source={view.source} />
              <StatusBadge status={view.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <DetailRow
            label={tAdmin("agentOperations.detail.agent")}
            value={sourceLabel(view.source)}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.operationId")}
            value={view.operation_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.previewId")}
            value={view.preview_id ?? dash}
          />
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
          <DetailRow
            label={tAdmin("agentOperations.detail.userId")}
            value={view.user_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.group")}
            value={view.group_name ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.description")}
            value={view.description || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.payer")}
            value={view.payer_full_name || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.amount")}
            value={amount ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splitMethod")}
            value={view.split_method || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splits")}
            value={view.splits_count ?? dash}
          />
          {view.status === "committed" && (
            <DetailRow
              label={tAdmin("agentOperations.detail.expense")}
              value={view.expense_id ?? dash}
            />
          )}
          {(view.status === "failed" || view.status === "expired") && (
            <>
              <DetailRow
                label={tAdmin("agentOperations.detail.errorCode")}
                value={view.error_code || dash}
              />
              <DetailRow
                label={tAdmin("agentOperations.detail.errorMessage")}
                value={view.error_message || dash}
              />
            </>
          )}
          <DetailRow
            label={tAdmin("agentOperations.detail.previewExpiry")}
            value={
              view.preview_expires_at
                ? formatDate(view.preview_expires_at, DATE_TIME_FORMAT)
                : dash
            }
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
          <DetailRow
            label={tAdmin("common.createdAt")}
            value={formatDate(view.created_at, DATE_TIME_FORMAT)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExternalDetailDialog({
  open,
  row,
  onOpenChange,
}: {
  open: boolean;
  row: ExternalAgentSubmissionRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const amount = formatVndAmount(row.total_amount);
  const dash = (
    <span className="text-muted-foreground">
      {tAdmin("agentOperations.detail.na")}
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            {tAdmin("agentOperations.detail.externalTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-2">
              <AgentSourceBadge source={row.source} />
              <ExternalStatusBadge status={row.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <DetailRow
            label={tAdmin("agentOperations.detail.agent")}
            value={sourceLabel(row.source)}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.submissionId")}
            value={row.submission_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.targetEmail")}
            value={row.target_email}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.group")}
            value={row.group_name ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.description")}
            value={row.description || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.amount")}
            value={amount ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splitMethod")}
            value={row.split_method || dash}
          />
          {row.status === "approved" && (
            <DetailRow
              label={tAdmin("agentOperations.detail.expense")}
              value={row.expense_id ?? dash}
            />
          )}
          {row.status === "rejected" && (
            <DetailRow
              label={tAdmin("agentOperations.detail.rejectReason")}
              value={row.reject_reason || dash}
            />
          )}
          {(row.status === "failed" || row.error_code) && (
            <>
              <DetailRow
                label={tAdmin("agentOperations.detail.errorCode")}
                value={row.error_code || dash}
              />
              <DetailRow
                label={tAdmin("agentOperations.detail.errorMessage")}
                value={row.error_message || dash}
              />
            </>
          )}
          <DetailRow
            label={tAdmin("common.createdAt")}
            value={formatDate(row.created_at, DATE_TIME_FORMAT)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
