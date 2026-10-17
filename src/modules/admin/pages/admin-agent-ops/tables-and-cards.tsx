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
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
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

const rowClass =
  "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=selected]:bg-primary/[0.07] data-[state=selected]:shadow-[inset_2px_0_0_var(--primary)]";
const headClass = "h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

interface TableSelectionProps {
  selectedId: string | null;
  /** Detail pane is open next to the table: drop secondary columns */
  compact: boolean;
}

function selectableRowProps(id: string, selectedId: string | null, onSelect: () => void) {
  const selected = id === selectedId;
  return {
    "data-row-id": id,
    "data-state": selected ? "selected" : undefined,
    "aria-selected": selected,
    tabIndex: 0,
    className: rowClass,
    onClick: onSelect,
    onKeyDown: onButtonKeyDown(onSelect),
  };
}

export function OperationsTable({
  rows,
  onRowClick,
  selectedId,
  compact,
}: {
  rows: AgentOperationRow[];
  onRowClick: (row: AgentOperationRow) => void;
} & TableSelectionProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Table containerClassName="overflow-visible">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.agent")}</TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.user")}</TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.status")}</TableHead>
          {!compact && <TableHead className={headClass}>{tAdmin("agentOperations.columns.group")}</TableHead>}
          <TableHead className={`${headClass} text-right`}>
            {tAdmin("agentOperations.columns.amount")}
          </TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.createdAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const amount = formatVndAmount(row.total_amount);
          return (
            <TableRow
              key={row.operation_id}
              {...selectableRowProps(row.operation_id, selectedId, () => onRowClick(row))}
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
                    <span className="max-w-48 truncate text-xs text-muted-foreground">{row.user_email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              {!compact && (
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
              )}
              <TableCell className="text-right tabular-nums">
                {amount ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(row.created_at, DATE_TIME_FORMAT)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ExternalSubmissionsTable({
  rows,
  onRowClick,
  selectedId,
  compact,
}: {
  rows: ExternalAgentSubmissionRow[];
  onRowClick: (row: ExternalAgentSubmissionRow) => void;
} & TableSelectionProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Table containerClassName="overflow-visible">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.agent")}</TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.target")}</TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.status")}</TableHead>
          {!compact && <TableHead className={headClass}>{tAdmin("agentOperations.columns.group")}</TableHead>}
          <TableHead className={`${headClass} text-right`}>
            {tAdmin("agentOperations.columns.amount")}
          </TableHead>
          <TableHead className={headClass}>{tAdmin("agentOperations.columns.createdAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const amount = formatVndAmount(row.total_amount);
          return (
            <TableRow
              key={row.submission_id}
              {...selectableRowProps(row.submission_id, selectedId, () => onRowClick(row))}
            >
              <TableCell>
                <AgentSourceBadge source={row.source} />
              </TableCell>
              <TableCell>
                <span className="block max-w-56 truncate font-medium">{row.target_email}</span>
              </TableCell>
              <TableCell>
                <ExternalStatusBadge status={row.status} />
              </TableCell>
              {!compact && (
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
              )}
              <TableCell className="text-right tabular-nums">
                {amount ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(row.created_at, DATE_TIME_FORMAT)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
