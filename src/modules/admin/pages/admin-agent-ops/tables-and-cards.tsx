import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminMobileCard,
  AdminMobileCards,
} from "@/modules/admin/components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import { formatDate } from "@/lib/locale-utils";
import type {
  AgentOperationRow,
  ExternalAgentSubmissionRow,
} from "../../types";
import { formatVndAmount } from "../admin-agent-operations.utils";
import { DATE_TIME_FORMAT } from "./constants";
import {
  AgentSourceBadge,
  StatusBadge,
  ExternalStatusBadge,
  useAgentSourceLabel,
} from "./badges";

export function OperationsTable({
  rows,
  onRowClick,
}: {
  rows: AgentOperationRow[];
  onRowClick: (row: AgentOperationRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAdmin("agentOperations.columns.agent")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.user")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.status")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.group")}</TableHead>
            <TableHead className="text-right">
              {tAdmin("agentOperations.columns.amount")}
            </TableHead>
            <TableHead>{tAdmin("agentOperations.columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const amount = formatVndAmount(row.total_amount);
            return (
              <TableRow
                key={row.operation_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(row)}
              >
                <TableCell>
                  <AgentSourceBadge source={row.source} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {row.user_full_name ?? tAdmin("common.unknown")}
                    </span>
                    {row.user_email && (
                      <span className="text-xs text-muted-foreground">{row.user_email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{row.group_name ?? "—"}</span>
                    {row.description && (
                      <span className="max-w-56 truncate text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {amount ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(row.created_at, DATE_TIME_FORMAT)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ExternalSubmissionsTable({
  rows,
  onRowClick,
}: {
  rows: ExternalAgentSubmissionRow[];
  onRowClick: (row: ExternalAgentSubmissionRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAdmin("agentOperations.columns.agent")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.target")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.status")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.group")}</TableHead>
            <TableHead className="text-right">
              {tAdmin("agentOperations.columns.amount")}
            </TableHead>
            <TableHead>{tAdmin("agentOperations.columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const amount = formatVndAmount(row.total_amount);
            return (
              <TableRow
                key={row.submission_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(row)}
              >
                <TableCell>
                  <AgentSourceBadge source={row.source} />
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.target_email}</span>
                </TableCell>
                <TableCell>
                  <ExternalStatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{row.group_name ?? "—"}</span>
                    {row.description && (
                      <span className="max-w-56 truncate text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {amount ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(row.created_at, DATE_TIME_FORMAT)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function OperationsCardsList({
  rows,
  onRowClick,
}: {
  rows: AgentOperationRow[];
  onRowClick: (row: AgentOperationRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  return (
    <AdminMobileCards
      items={rows}
      getKey={(row) => row.operation_id}
      renderItem={(row) => {
        const amount = formatVndAmount(row.total_amount);
        return (
          <AdminMobileCard
            title={row.user_full_name ?? tAdmin("common.unknown")}
            description={row.user_email ?? undefined}
            badges={
              <div className="flex flex-wrap gap-1">
                <AgentSourceBadge source={row.source} />
                <StatusBadge status={row.status} />
              </div>
            }
            meta={[
              {
                label: tAdmin("agentOperations.columns.agent"),
                value: sourceLabel(row.source),
              },
              {
                label: tAdmin("agentOperations.columns.group"),
                value: row.description
                  ? `${row.group_name ?? "—"} · ${row.description}`
                  : row.group_name ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.amount"),
                value: amount ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.createdAt"),
                value: formatDate(row.created_at, DATE_TIME_FORMAT),
              },
            ]}
            onClick={() => onRowClick(row)}
            ariaLabel={`Operation ${row.operation_id}`}
          />
        );
      }}
    />
  );
}

export function ExternalCardsList({
  rows,
  onRowClick,
}: {
  rows: ExternalAgentSubmissionRow[];
  onRowClick: (row: ExternalAgentSubmissionRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  return (
    <AdminMobileCards
      items={rows}
      getKey={(row) => row.submission_id}
      renderItem={(row) => {
        const amount = formatVndAmount(row.total_amount);
        return (
          <AdminMobileCard
            title={row.target_email}
            description={row.description ?? undefined}
            badges={
              <div className="flex flex-wrap gap-1">
                <AgentSourceBadge source={row.source} />
                <ExternalStatusBadge status={row.status} />
              </div>
            }
            meta={[
              {
                label: tAdmin("agentOperations.columns.agent"),
                value: sourceLabel(row.source),
              },
              {
                label: tAdmin("agentOperations.columns.group"),
                value: row.group_name ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.amount"),
                value: amount ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.createdAt"),
                value: formatDate(row.created_at, DATE_TIME_FORMAT),
              },
            ]}
            onClick={() => onRowClick(row)}
            ariaLabel={`Submission ${row.submission_id}`}
          />
        );
      }}
    />
  );
}
