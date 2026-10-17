import type { MouseEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/user-display";
import { formatCurrency, formatDate } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { AuditEntityMaps, AuditExpenseRef, AuditGroupRef, AuditUserRef } from "./use-audit-entities";
import { isAuditUuid } from "./audit-collect-entity-ids";
import {
  auditEntityLinkChipClass,
  auditEntityLinkRowClass,
  AuditEntityList,
  AuditLabelValueRow,
} from "./audit-detail-layout";
import { openAuditPreview, useOptionalAuditEntityPreview } from "./audit-entity-preview";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type EntityLayout = "chip" | "row";

function stopRowClick(e: MouseEvent) {
  e.stopPropagation();
}

function shortUuid(id: string) {
  if (id.length <= 13) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function AuditUserChip({
  userId,
  users,
  compact,
  layout = "chip",
  interactive = true,
}: {
  userId: string;
  users: Map<string, AuditUserRef>;
  compact?: boolean;
  layout?: EntityLayout;
  /** When false, rows are read-only (no preview popup). */
  interactive?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  const preview = interactive ? previewApi : null;
  const user = users.get(userId);
  const label = user?.full_name || tAdmin("auditLogs.unknownUser");
  const target = { kind: "user" as const, id: userId };

  const avatar = (
    <UserAvatar
      size={layout === "row" ? "sm" : "xs"}
      user={{
        full_name: label,
        avatar_url: user?.avatar_url ?? null,
      }}
    />
  );

  const body = (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={label}>{label}</span>
        {layout === "row" && !user?.full_name ? (
          <span className="block text-xs text-muted-foreground font-mono" title={userId}>
            {shortUuid(userId)}
          </span>
        ) : null}
      </span>
      {preview ? (
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (preview && layout === "row") {
    return (
      <button
        type="button"
        className={auditEntityLinkRowClass}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
        {body}
      </button>
    );
  }

  if (preview) {
    return (
      <button
        type="button"
        className={cn(auditEntityLinkChipClass, compact && "py-0.5")}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
        {avatar}
        <span className="truncate text-xs font-medium flex-1">{label}</span>
        <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border bg-muted/20 px-2.5 py-1",
        compact && "py-0.5",
        layout === "row" && "w-full rounded-lg px-3 py-2",
      )}
      title={userId}
    >
      {avatar}
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
  );
}

export function AuditGroupChip({
  groupId,
  groups,
  layout = "chip",
  interactive = true,
}: {
  groupId: string;
  groups: Map<string, AuditGroupRef>;
  layout?: EntityLayout;
  interactive?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  const preview = interactive ? previewApi : null;
  const group = groups.get(groupId);
  const name = group?.name || tAdmin("auditLogs.unknownGroup");
  const target = { kind: "group" as const, id: groupId };

  const avatar = (
    <Avatar className={layout === "row" ? "size-9" : "size-6"}>
      <AvatarImage src={group?.avatar_url ?? undefined} alt={name} />
      <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );

  if (preview && layout === "row") {
    return (
      <button
        type="button"
        className={auditEntityLinkRowClass}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
        {avatar}
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium" title={name}>{name}</span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  if (preview) {
    return (
      <button
        type="button"
        className={auditEntityLinkChipClass}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
        {avatar}
        <span className="truncate text-xs font-medium flex-1">{name}</span>
        <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border bg-muted/20 px-2.5 py-1",
        layout === "row" && "w-full rounded-lg px-3 py-2",
      )}
      title={groupId}
    >
      {avatar}
      <span className="truncate text-xs font-medium">{name}</span>
    </div>
  );
}

export function AuditExpenseInline({
  expenseId,
  expenses,
  layout = "row",
  interactive = true,
}: {
  expenseId: string;
  expenses: Map<string, AuditExpenseRef>;
  groups?: Map<string, AuditGroupRef>;
  layout?: EntityLayout;
  interactive?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  const preview = interactive ? previewApi : null;
  const expense = expenses.get(expenseId);
  const target = { kind: "expense" as const, id: expenseId };

  if (!expense) {
    if (preview) {
      return (
        <button
          type="button"
          className={layout === "row" ? auditEntityLinkRowClass : auditEntityLinkChipClass}
          onClick={(e) => {
            stopRowClick(e);
            openAuditPreview(preview, target);
          }}
        >
          <span className="text-xs font-mono text-muted-foreground text-left flex-1" title={expenseId}>
            {shortUuid(expenseId)}
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
        </button>
      );
    }
    return (
      <span className="text-xs text-muted-foreground font-mono" title={expenseId}>
        {expenseId.slice(0, 8)}…
      </span>
    );
  }

  const cat = getCategoryMeta(expense.category);
  const CatIcon = cat.icon;
  const icon = (
    <span className={cn("inline-flex shrink-0 size-8 items-center justify-center rounded-md", cat.bgColor)}>
      <CatIcon size={16} className={cat.color} aria-hidden />
    </span>
  );
  const text = (
    <div className="min-w-0 flex-1 text-left">
      <p className="truncate text-sm font-medium" title={expense.description}>{expense.description}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatCurrency(expense.amount, expense.currency)}
      </p>
    </div>
  );

  if (preview) {
    return (
      <button
        type="button"
        className={layout === "row" ? auditEntityLinkRowClass : cn(auditEntityLinkChipClass, "rounded-lg max-w-full w-full")}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
        {icon}
        {text}
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-transparent bg-muted/15 px-3 py-2">
      {icon}
      {text}
    </div>
  );
}

export function AuditExpenseChip({
  expenseId,
  expenses,
  groups,
}: {
  expenseId: string;
  expenses: Map<string, AuditExpenseRef>;
  groups: Map<string, AuditGroupRef>;
}) {
  const { tAdmin } = useAdminTranslation();
  const preview = useOptionalAuditEntityPreview();
  const expense = expenses.get(expenseId);
  if (!expense) {
    return <AuditExpenseInline expenseId={expenseId} expenses={expenses} layout="row" />;
  }

  const cat = getCategoryMeta(expense.category);
  const CatIcon = cat.icon;
  const groupName = expense.group_id ? groups.get(expense.group_id)?.name : null;
  const target = { kind: "expense" as const, id: expenseId };

  if (preview) {
    return (
      <button
        type="button"
        className={auditEntityLinkRowClass}
        title={tAdmin("auditLogs.previewClickHint")}
        onClick={(e) => {
          stopRowClick(e);
          openAuditPreview(preview, target);
        }}
      >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center size-9 rounded-lg",
          cat.bgColor,
        )}
      >
        <CatIcon size={18} className={cat.color} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{expense.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(expense.amount, expense.currency)}
          <span className="mx-1">·</span>
          {formatDate(expense.expense_date)}
          {groupName ? (
            <>
              <span className="mx-1">·</span>
              {groupName}
            </>
          ) : null}
        </p>
      </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-muted/15 px-3 py-2.5">
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center size-9 rounded-lg",
          cat.bgColor,
        )}
      >
        <CatIcon size={18} className={cat.color} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{expense.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(expense.amount, expense.currency)}
          <span className="mx-1">·</span>
          {formatDate(expense.expense_date)}
          {groupName ? (
            <>
              <span className="mx-1">·</span>
              {groupName}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

type SplitRow = {
  id?: string;
  user_id?: string;
  expense_id?: string;
  group_id?: string | null;
  amount?: number;
  computed_amount?: number;
  remaining_amount?: number | null;
  is_settled?: boolean;
};

function splitRowAmount(row: SplitRow): number | undefined {
  if (typeof row.amount === "number") return row.amount;
  if (typeof row.computed_amount === "number") return row.computed_amount;
  return undefined;
}

function isSplitRow(value: unknown): value is SplitRow {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function AuditSplitCompactList({
  rows,
  entities,
  currency,
  interactive = true,
}: {
  rows: SplitRow[];
  entities: AuditEntityMaps;
  currency?: string;
  interactive?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <li
          key={row.id ?? `split-${index}`}
          className="rounded-xl border bg-background p-4 sm:p-5 space-y-4 shadow-sm"
        >
          <AuditLabelValueRow label={tAdmin("common.user")}>
            {row.user_id ? (
              <AuditUserChip
                userId={row.user_id}
                users={entities.users}
                layout="row"
                interactive={interactive}
              />
            ) : (
              <span className="text-sm text-muted-foreground py-2">—</span>
            )}
          </AuditLabelValueRow>

          <AuditLabelValueRow label={tAdmin("auditLogs.relatedExpenses")}>
            {row.expense_id ? (
              <AuditExpenseInline
                expenseId={row.expense_id}
                expenses={entities.expenses}
                layout="row"
                interactive={interactive}
              />
            ) : (
              <span className="text-sm text-muted-foreground py-2">—</span>
            )}
          </AuditLabelValueRow>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <span className="text-xs font-medium text-muted-foreground">{tAdmin("common.amount")}</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {typeof splitRowAmount(row) === "number" ? (
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(splitRowAmount(row)!, currency)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
              {row.is_settled === true ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  {tAdmin("auditLogs.settledLabel")}
                </Badge>
              ) : row.is_settled === false ? (
                <Badge variant="outline" className="text-xs font-normal">
                  {tAdmin("auditLogs.unsettledLabel")}
                </Badge>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AuditSplitStateList({
  rows,
  entities,
  currency,
}: {
  rows: SplitRow[];
  entities: AuditEntityMaps;
  currency?: string;
}) {
  return <AuditSplitCompactList rows={rows} entities={entities} currency={currency} />;
}

function inferKindForKey(key: string): "user" | "group" | "expense" | null {
  const k = key.toLowerCase();
  if (/user|actor|counterparty|paid_by|from_user|to_user|profile|member/.test(k)) return "user";
  if (/group/.test(k)) return "group";
  if (/expense/.test(k)) return "expense";
  return null;
}

export function AuditResolvedValue({
  fieldKey,
  value,
  entities,
  currency,
  compact,
}: {
  fieldKey: string;
  value: unknown;
  entities: AuditEntityMaps;
  currency?: string;
  compact?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  if (value === undefined || value === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  if (fieldKey === "splits" && Array.isArray(value) && value.every(isSplitRow)) {
    return (
      <AuditSplitCompactList rows={value} entities={entities} currency={currency} />
    );
  }

  const kind = inferKindForKey(fieldKey);

  if (typeof value === "string" && isAuditUuid(value) && kind === "user") {
    return <AuditUserChip userId={value} users={entities.users} />;
  }
  if (typeof value === "string" && isAuditUuid(value) && kind === "group") {
    return <AuditGroupChip groupId={value} groups={entities.groups} />;
  }
  if (typeof value === "string" && isAuditUuid(value) && kind === "expense") {
    return (
      <AuditExpenseChip expenseId={value} expenses={entities.expenses} groups={entities.groups} />
    );
  }

  if (Array.isArray(value) && kind === "user" && value.every((v) => typeof v === "string")) {
    return (
      <AuditEntityList>
        {(value as string[]).map((id) => (
          <AuditUserChip key={id} userId={id} users={entities.users} layout="row" />
        ))}
      </AuditEntityList>
    );
  }

  if (
    fieldKey.toLowerCase() === "split_ids" &&
    Array.isArray(value) &&
    value.every((v) => typeof v === "string")
  ) {
    const splitRows = (value as string[])
      .map((id) => entities.splits.get(id))
      .filter(Boolean) as Array<{
      id: string;
      user_id: string;
      expense_id: string;
      group_id?: string | null;
      amount?: number;
      remaining_amount?: number | null;
      is_settled?: boolean;
    }>;
    if (splitRows.length > 0) {
      return <AuditSplitCompactList rows={splitRows} entities={entities} currency={currency} />;
    }
    if (compact) {
      return (
        <span className="text-xs text-muted-foreground">
          {tAdmin("auditLogs.splitIdCount", { count: value.length })}
        </span>
      );
    }
  }

  if (Array.isArray(value) && kind === "group" && value.every((v) => typeof v === "string")) {
    return (
      <AuditEntityList>
        {(value as string[]).map((id) => (
          <AuditGroupChip key={id} groupId={id} groups={entities.groups} layout="row" />
        ))}
      </AuditEntityList>
    );
  }

  if (typeof value === "boolean") {
    return <span className="text-sm">{value ? tAdmin("auditLogs.yes") : tAdmin("auditLogs.no")}</span>;
  }

  if (typeof value === "number") {
    if (/amount|total/.test(fieldKey.toLowerCase())) {
      return <span className="text-sm font-medium tabular-nums">{formatCurrency(value, currency)}</span>;
    }
    return <span className="text-sm tabular-nums">{value.toLocaleString()}</span>;
  }

  if (typeof value === "string") {
    return <span className="text-sm break-words">{value}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <span className="text-xs text-muted-foreground">
        {tAdmin("auditLogs.itemCount", { count: value.length })}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {tAdmin("auditLogs.objectFieldCount", { count: Object.keys(value as object).length })}
    </span>
  );
}
