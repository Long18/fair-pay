import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
import { formatCurrency, formatDate } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import { AuditEntityDetailActions } from "./audit-entity-detail-actions";
import { openAuditPreview, useOptionalAuditEntityPreview } from "./audit-entity-preview";
import type { AuditEntityMaps, AuditExpenseRef, AuditGroupRef, AuditUserRef } from "./use-audit-entities";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function shortUuid(id: string) {
  if (id.length <= 13) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

const itemClass = "border-0";
const triggerClass =
  "rounded-lg border border-border/80 bg-background px-3 py-2.5 hover:no-underline hover:bg-accent/30 [&>svg]:text-muted-foreground";

function SettleEntityAccordion({ children }: { children: ReactNode }) {
  return (
    <Accordion type="single" collapsible className="flex flex-col gap-2">
      {children}
    </Accordion>
  );
}

function DetailMeta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3 sm:items-baseline">
      <span className="text-xs font-medium text-muted-foreground shrink-0 sm:w-24">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

export function AuditSettlePeopleList({
  userIds,
  users,
}: {
  userIds: string[];
  users: Map<string, AuditUserRef>;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  if (userIds.length === 0) return null;

  return (
    <SettleEntityAccordion>
      {userIds.map((id) => {
        const user = users.get(id);
        const label = user?.full_name?.trim() || tAdmin("auditLogs.unknownUser");
        return (
          <AccordionItem key={id} value={id} className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                <UserAvatar
                  size="sm"
                  user={{ full_name: label, avatar_url: user?.avatar_url ?? null }}
                />
                <span className="truncate text-sm font-medium">{label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-2 pt-1">
              <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-2.5">
                <DetailMeta label={tAdmin("people.fullName")}>
                  <span className="font-medium">{label}</span>
                </DetailMeta>
                <DetailMeta label="ID">
                  <span className="font-mono text-xs text-muted-foreground break-all">{id}</span>
                </DetailMeta>
                <AuditEntityDetailActions
                  target={{ kind: "user", id }}
                  onPreview={
                    previewApi ? () => openAuditPreview(previewApi, { kind: "user", id }) : undefined
                  }
                  className="border-t border-border/60"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </SettleEntityAccordion>
  );
}

export function AuditSettleGroupsList({
  groupIds,
  groups,
}: {
  groupIds: string[];
  groups: Map<string, AuditGroupRef>;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  if (groupIds.length === 0) return null;

  return (
    <SettleEntityAccordion>
      {groupIds.map((id) => {
        const group = groups.get(id);
        const name = group?.name?.trim() || tAdmin("auditLogs.unknownGroup");
        return (
          <AccordionItem key={id} value={id} className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                <Avatar className="size-9">
                  <AvatarImage src={group?.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-2 pt-1">
              <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-2.5">
                <DetailMeta label={tAdmin("common.group")}>
                  <span className="font-medium">{name}</span>
                </DetailMeta>
                <DetailMeta label="ID">
                  <span className="font-mono text-xs text-muted-foreground break-all">{id}</span>
                </DetailMeta>
                <AuditEntityDetailActions
                  target={{ kind: "group", id }}
                  onPreview={
                    previewApi ? () => openAuditPreview(previewApi, { kind: "group", id }) : undefined
                  }
                  className="border-t border-border/60"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </SettleEntityAccordion>
  );
}

export function AuditSettleExpensesList({
  expenseIds,
  expenses,
  groups,
}: {
  expenseIds: string[];
  expenses: Map<string, AuditExpenseRef>;
  groups: Map<string, AuditGroupRef>;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  if (expenseIds.length === 0) return null;

  return (
    <SettleEntityAccordion>
      {expenseIds.map((id) => {
        const expense = expenses.get(id);
        const label = expense?.description?.trim() || tAdmin("auditLogs.unknownExpense");
        const cat = getCategoryMeta(expense?.category ?? null);
        const CatIcon = cat.icon;
        const groupName = expense?.group_id ? groups.get(expense.group_id)?.name : null;

        return (
          <AccordionItem key={id} value={id} className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                    cat.bgColor,
                  )}
                >
                  <CatIcon size={16} className={cat.color} aria-hidden />
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{label}</p>
                  {expense ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground">{shortUuid(id)}</p>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-2 pt-1">
              <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-2.5">
                {expense ? (
                  <>
                    <DetailMeta label={tAdmin("auditLogs.previewExpense")}>
                      <span className="font-medium">{expense.description}</span>
                    </DetailMeta>
                    <DetailMeta label={tAdmin("common.amount")}>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                    </DetailMeta>
                    <DetailMeta label={tAdmin("common.date")}>
                      {formatDate(expense.expense_date)}
                    </DetailMeta>
                    {groupName ? (
                      <DetailMeta label={tAdmin("common.group")}>{groupName}</DetailMeta>
                    ) : null}
                  </>
                ) : (
                  <DetailMeta label="ID">
                    <span className="font-mono text-xs break-all">{id}</span>
                  </DetailMeta>
                )}
                <AuditEntityDetailActions
                  target={{ kind: "expense", id }}
                  onPreview={
                    previewApi
                      ? () => openAuditPreview(previewApi, { kind: "expense", id })
                      : undefined
                  }
                  className="border-t border-border/60"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </SettleEntityAccordion>
  );
}

type SplitRow = {
  id?: string;
  user_id?: string;
  expense_id?: string;
  amount?: number;
  computed_amount?: number;
  is_settled?: boolean;
};

function splitAmount(row: SplitRow): number | undefined {
  if (typeof row.amount === "number") return row.amount;
  if (typeof row.computed_amount === "number") return row.computed_amount;
  return undefined;
}

export function AuditSettlePriorSplitsList({
  rows,
  entities,
  currency,
}: {
  rows: SplitRow[];
  entities: AuditEntityMaps;
  currency?: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const previewApi = useOptionalAuditEntityPreview();
  if (rows.length === 0) return null;

  return (
    <SettleEntityAccordion>
      {rows.map((row, index) => {
        const key = row.id ?? `prior-${index}`;
        const user = row.user_id ? entities.users.get(row.user_id) : undefined;
        const expense = row.expense_id ? entities.expenses.get(row.expense_id) : undefined;
        const userLabel = user?.full_name?.trim() || tAdmin("auditLogs.unknownUser");
        const expenseLabel = expense?.description?.trim() || shortUuid(row.expense_id ?? "—");
        const amount = splitAmount(row);

        return (
          <AccordionItem key={key} value={key} className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{userLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">{expenseLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof amount === "number" ? (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(amount, currency)}
                    </span>
                  ) : null}
                  {row.is_settled === true ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {tAdmin("auditLogs.settledLabel")}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-2 pt-1">
              <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-2.5">
                <DetailMeta label={tAdmin("common.user")}>{userLabel}</DetailMeta>
                <DetailMeta label={tAdmin("auditLogs.relatedExpenses")}>{expenseLabel}</DetailMeta>
                {typeof amount === "number" ? (
                  <DetailMeta label={tAdmin("common.amount")}>
                    {formatCurrency(amount, currency)}
                  </DetailMeta>
                ) : null}
                {row.id ? (
                  <DetailMeta label="Split">
                    <span className="font-mono text-xs break-all">{row.id}</span>
                  </DetailMeta>
                ) : null}
                <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                  {row.user_id ? (
                    <AuditEntityDetailActions
                      target={{ kind: "user", id: row.user_id }}
                      onPreview={
                        previewApi
                          ? () =>
                              openAuditPreview(previewApi, { kind: "user", id: row.user_id! })
                          : undefined
                      }
                    />
                  ) : null}
                  {row.expense_id ? (
                    <AuditEntityDetailActions
                      target={{ kind: "expense", id: row.expense_id }}
                      onPreview={
                        previewApi
                          ? () =>
                              openAuditPreview(previewApi, {
                                kind: "expense",
                                id: row.expense_id!,
                              })
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </SettleEntityAccordion>
  );
}
