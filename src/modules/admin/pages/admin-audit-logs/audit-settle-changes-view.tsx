import { useMemo, type ReactNode } from "react";
import { Loader2Icon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import { auditDetailCardClass } from "./audit-detail-layout";
import { AuditRawPayloadToggle } from "./audit-raw-payload";
import {
  AuditSettleExpensesList,
  AuditSettleGroupsList,
  AuditSettlePeopleList,
  AuditSettlePriorSplitsList,
} from "./audit-settle-entity-rows";
import type { AuditEntityMaps } from "./use-audit-entities";

type SplitRow = {
  id?: string;
  user_id?: string;
  expense_id?: string;
  group_id?: string | null;
  amount?: number;
  computed_amount?: number;
  is_settled?: boolean;
};

function isSplitRow(value: unknown): value is SplitRow {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function SettleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t px-4 py-3.5 first:border-t-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function AuditSettleChangesView({
  oldData,
  newData,
  entities,
  isLoadingEntities,
  actorId,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  entities: AuditEntityMaps;
  isLoadingEntities: boolean;
  actorId?: string | null;
}) {
  const { tAdmin } = useAdminTranslation();

  const currency = (newData?.currency as string | undefined) ?? undefined;
  const totalAmount = newData?.total_amount as number | undefined;
  const splitsUpdated = newData?.splits_updated as number | undefined;

  const counterpartyIds = useMemo(
    () => (newData?.counterparty_ids as string[] | undefined) ?? [],
    [newData?.counterparty_ids],
  );
  const groupIds = useMemo(
    () => (newData?.group_ids as string[] | undefined) ?? [],
    [newData?.group_ids],
  );
  const splitIds = useMemo(
    () => (newData?.split_ids as string[] | undefined) ?? [],
    [newData?.split_ids],
  );

  const priorSplits = useMemo(() => {
    const raw = oldData?.splits;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isSplitRow);
  }, [oldData]);

  const peopleIds = useMemo(() => {
    const ids = new Set<string>();
    if (actorId) ids.add(actorId);
    const newActor = newData?.actor_id;
    if (typeof newActor === "string") ids.add(newActor);
    for (const id of counterpartyIds) ids.add(id);
    for (const row of priorSplits) {
      if (row.user_id) ids.add(row.user_id);
    }
    for (const split of splitIds.map((id) => entities.splits.get(id)).filter(Boolean)) {
      if (split?.user_id) ids.add(split.user_id);
    }
    return [...ids];
  }, [actorId, counterpartyIds, newData?.actor_id, priorSplits, splitIds, entities]);

  const expenseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of priorSplits) {
      if (row.expense_id) ids.add(row.expense_id);
    }
    for (const split of splitIds.map((id) => entities.splits.get(id)).filter(Boolean)) {
      if (split?.expense_id) ids.add(split.expense_id);
    }
    return [...ids];
  }, [priorSplits, splitIds, entities]);

  const splitCount = splitsUpdated ?? splitIds.length ?? priorSplits.length;

  const hasSections =
    peopleIds.length > 0 ||
    groupIds.length > 0 ||
    expenseIds.length > 0 ||
    priorSplits.length > 0;

  return (
    <div className="space-y-4">
      <div className={auditDetailCardClass}>
        <header className="flex flex-wrap items-baseline justify-between gap-3 border-b bg-muted/25 px-4 py-3">
          <div className="space-y-0.5 min-w-0">
            {typeof totalAmount === "number" ? (
              <p className="text-xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(totalAmount, currency)}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {tAdmin("auditLogs.settleHeadline", { count: splitCount })}
            </p>
          </div>
          {isLoadingEntities ? (
            <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </header>

        {hasSections ? (
          <div>
            {peopleIds.length > 0 ? (
              <SettleSection title={`${tAdmin("auditLogs.navPeople")} (${peopleIds.length})`}>
                <AuditSettlePeopleList userIds={peopleIds} users={entities.users} />
              </SettleSection>
            ) : null}

            {groupIds.length > 0 ? (
              <SettleSection title={`${tAdmin("auditLogs.navGroups")} (${groupIds.length})`}>
                <AuditSettleGroupsList groupIds={groupIds} groups={entities.groups} />
              </SettleSection>
            ) : null}

            {expenseIds.length > 0 ? (
              <SettleSection title={`${tAdmin("auditLogs.navExpenses")} (${expenseIds.length})`}>
                <AuditSettleExpensesList
                  expenseIds={expenseIds}
                  expenses={entities.expenses}
                  groups={entities.groups}
                />
              </SettleSection>
            ) : null}

            {priorSplits.length > 0 ? (
              <SettleSection title={`${tAdmin("auditLogs.navPrior")} (${priorSplits.length})`}>
                <AuditSettlePriorSplitsList
                  rows={priorSplits}
                  entities={entities}
                  currency={currency}
                />
              </SettleSection>
            ) : null}
          </div>
        ) : null}
      </div>

      <AuditRawPayloadToggle data={{ old_data: oldData, new_data: newData }} />
    </div>
  );
}
