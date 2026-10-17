import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Undo2Icon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/user-display";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "@/modules/admin/components/AdminMobileCards";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { formatDate } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { AuditLogEntry } from "../../types";
import { ActionBadge } from "./action-badge";
import { PAGE_SIZE } from "./constants";
import { canRevertEntry, getDetailSummary } from "./helpers";

const headClass = "h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

function actorName(entry: AuditLogEntry, fallback: string) {
  return entry.actor_name || entry.actor_email || fallback;
}

function SourceTag({ entry }: { entry: AuditLogEntry }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <span className="font-mono text-[10px] uppercase text-muted-foreground">
      {entry.source === "audit_logs" ? tAdmin("layout.devtool.sourceDb") : tAdmin("layout.devtool.sourceTrail")}
    </span>
  );
}

interface AuditLogListProps {
  entries: AuditLogEntry[];
  selectedId: string | null;
  onSelect: (entry: AuditLogEntry) => void;
  onRevert: (entry: AuditLogEntry) => void;
}

/** Desktop table. `compact` drops the summary column while the detail pane is open. */
export function AuditLogTable({
  entries,
  selectedId,
  onSelect,
  onRevert,
  compact,
}: AuditLogListProps & { compact: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(entries);
  const system = tAdmin("common.system");

  return (
    <Table containerClassName="overflow-visible">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headClass, "w-[9.5rem] pl-3")}>{tAdmin("auditLogs.timestamp")}</TableHead>
          <TableHead className={headClass}>{tAdmin("auditLogs.actor")}</TableHead>
          <TableHead className={cn(headClass, "w-[6.5rem]")}>{tAdmin("auditLogs.actionType")}</TableHead>
          <TableHead className={headClass}>{tAdmin("auditLogs.tableEntity")}</TableHead>
          {!compact && <TableHead className={headClass}>{tAdmin("common.details")}</TableHead>}
          <TableHead className="w-10">
            <span className="sr-only">{tAdmin("auditLogs.revert")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <motion.tbody
        key={animationKey}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="[&_tr:last-child]:border-0"
      >
        {entries.map((entry, index) => {
          const selected = entry.id === selectedId;
          const name = actorName(entry, system);
          return (
            <motion.tr
              key={entry.id}
              custom={index}
              variants={rowVariants}
              data-slot="table-row"
              data-row-id={entry.id}
              data-state={selected ? "selected" : undefined}
              aria-selected={selected}
              className="group cursor-pointer border-b transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=selected]:bg-primary/[0.07]"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(entry)}
              onKeyDown={onButtonKeyDown(() => onSelect(entry))}
            >
              <TableCell
                className={cn(
                  "border-l-2 py-1.5 pl-3 transition-colors",
                  selected ? "border-primary" : "border-transparent group-hover:border-primary/40"
                )}
              >
                <span className="text-xs font-medium tabular-nums">{formatDate(entry.timestamp)}</span>
              </TableCell>
              <TableCell className="py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    size="sm"
                    user={{ full_name: entry.actor_name || entry.actor_email || "?", avatar_url: entry.actor_avatar_url ?? null }}
                    className="h-6 w-6"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="max-w-[10rem] truncate text-sm font-medium">{name}</span>
                    {!compact && entry.actor_name && entry.actor_email && (
                      <span className="max-w-[10rem] truncate text-[10px] text-muted-foreground">{entry.actor_email}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-1.5">
                <ActionBadge action={entry.action_type} />
              </TableCell>
              <TableCell className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="max-w-[9rem] truncate font-mono text-xs">
                    {entry.table_name ?? entry.entity_type ?? "—"}
                  </Badge>
                  <SourceTag entry={entry} />
                </div>
              </TableCell>
              {!compact && (
                <TableCell className="max-w-[16rem] truncate py-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                  {getDetailSummary(entry, tAdmin)}
                </TableCell>
              )}
              <TableCell className="py-1.5 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                {canRevertEntry(entry) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground opacity-60 hover:text-[var(--status-warning-foreground)] group-hover:opacity-100"
                    aria-label={tAdmin("auditLogs.revertAria")}
                    onClick={() => onRevert(entry)}
                  >
                    <Undo2Icon className="h-4 w-4" />
                  </Button>
                ) : null}
              </TableCell>
            </motion.tr>
          );
        })}
      </motion.tbody>
    </Table>
  );
}

export function AuditLogCards({ entries, onSelect, onRevert }: Omit<AuditLogListProps, "selectedId">) {
  const { tAdmin } = useAdminTranslation();
  const system = tAdmin("common.system");

  return (
    <AdminMobileCards
      items={entries}
      getKey={(entry) => entry.id}
      renderItem={(entry) => (
        <AdminMobileCard
          title={entry.table_name ?? entry.entity_type ?? "—"}
          description={`${actorName(entry, system)} · ${formatDate(entry.timestamp)}`}
          leading={
            <UserAvatar
              size="sm"
              user={{ full_name: entry.actor_name || entry.actor_email || "?", avatar_url: entry.actor_avatar_url ?? null }}
            />
          }
          badges={
            <>
              <ActionBadge action={entry.action_type} />
              <Badge variant={entry.source === "audit_logs" ? "secondary" : "outline"} className="font-mono text-xs">
                {entry.source === "audit_logs" ? tAdmin("layout.devtool.sourceDb") : tAdmin("layout.devtool.sourceTrail")}
              </Badge>
            </>
          }
          meta={[
            { label: tAdmin("auditLogs.entityId"), value: <span className="font-mono text-xs">{entry.entity_id?.slice(0, 8) || "—"}</span> },
            { label: tAdmin("common.details"), value: getDetailSummary(entry, tAdmin) },
          ]}
          actions={canRevertEntry(entry) ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-[var(--status-warning-foreground)]"
              aria-label={tAdmin("auditLogs.revertAria")}
              onClick={() => onRevert(entry)}
            >
              <Undo2Icon className="h-4 w-4" />
            </Button>
          ) : undefined}
          onClick={() => onSelect(entry)}
          ariaLabel={entry.table_name ?? entry.entity_type ?? entry.id}
        />
      )}
    />
  );
}

function PageInput({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={1}
        max={totalPages}
        value={page + 1}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= 1 && v <= totalPages) onPage(v - 1);
        }}
        className="h-8 w-14 text-center tabular-nums"
      />
      <span className="text-sm text-muted-foreground">/ {totalPages}</span>
    </div>
  );
}

export function AuditPagination({
  page,
  total,
  totalPages,
  onPage,
}: {
  page: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const summary = tAdmin("auditLogs.showingResults", {
    from: page * PAGE_SIZE + 1,
    to: Math.min((page + 1) * PAGE_SIZE, total),
    total: total.toLocaleString(),
  });

  return (
    <>
      <div className="hidden shrink-0 items-center justify-between gap-3 lg:flex">
        <span className="text-xs text-muted-foreground">{summary}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" disabled={page === 0} onClick={() => onPage(page - 1)}>
            {tAdmin("common.previous")}
          </Button>
          <PageInput page={page} totalPages={totalPages} onPage={onPage} />
          <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
            {tAdmin("common.next")}
          </Button>
        </div>
      </div>
      <div className="lg:hidden">
        <AdminMobilePagination
          summary={summary}
          previousLabel={tAdmin("common.previous")}
          nextLabel={tAdmin("common.next")}
          canPrevious={page > 0}
          canNext={page < totalPages - 1}
          onPrevious={() => onPage(page - 1)}
          onNext={() => onPage(page + 1)}
        >
          <PageInput page={page} totalPages={totalPages} onPage={onPage} />
        </AdminMobilePagination>
      </div>
    </>
  );
}
