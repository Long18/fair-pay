import { memo, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ScaleIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { useChatEntityNavigation } from "../hooks/use-chat-entity-navigation";
import { DashboardMetricsIsland, type DashboardMetricItem } from "@/components/dashboard/shared/dashboard-metrics-island";
import { BalanceStaticMobileRow } from "@/components/dashboard/balance/balance-static-rows";
import {
  BALANCE_EXPAND_INSET_CARD,
  BALANCE_TABLE_GLASS_PANEL,
  BALANCE_TABLE_GLASS_DIVIDE,
} from "@/components/dashboard/balance/balance-table-surface";
import { UserDisplay } from "@/components/user-display";
import { CategoryIcon } from "@/modules/expenses/components/category-icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/locale-utils";
import type { ReadDigestBag } from "../utils/format-read-digest";
import { buildReadDigestViewModel } from "../utils/read-digest-view-model";

const BALANCE_PREVIEW = 5;
const GROUP_PREVIEW = 6;
const FRIEND_PREVIEW = 10;

interface ReadDigestCardProps {
  bag: ReadDigestBag;
  language?: string;
  viewerUserId?: string;
  className?: string;
}

function DigestBlock({
  title,
  count,
  children,
  empty,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  empty?: string;
}) {
  const isEmpty = empty != null;
  return (
    <section className="px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        {count != null ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium tabular-nums">
            {count}
          </Badge>
        ) : null}
      </div>
      {isEmpty ? (
        <p className={cn(BALANCE_EXPAND_INSET_CARD, "border-dashed px-3 py-4 text-sm text-muted-foreground")}>
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function ExpandableList<T>({
  items,
  previewCount,
  showMoreLabel,
  showLessLabel,
  children,
}: {
  items: readonly T[];
  previewCount: number;
  showMoreLabel: (n: number) => string;
  showLessLabel: string;
  children: (item: T, index: number) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasMore = items.length > previewCount;
  const visible = open ? items : items.slice(0, previewCount);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/60", BALANCE_TABLE_GLASS_DIVIDE)}>
      {visible.map((item, index) => children(item, index))}
      {hasMore ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-full rounded-none text-xs text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? showLessLabel : showMoreLabel(items.length - previewCount)}
        </Button>
      ) : null}
    </div>
  );
}

function DigestNavRow({
  label,
  sublabel,
  onActivate,
  ariaLabel,
}: {
  label: string;
  sublabel?: string;
  onActivate: () => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onActivate}
      onKeyDown={onButtonKeyDown(onActivate)}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="typography-row-title truncate">{label}</p>
        {sublabel ? <p className="truncate text-[11px] text-muted-foreground">{sublabel}</p> : null}
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  );
}

function digestLng(language?: string): "vi" | "en" | undefined {
  if (!language) return undefined;
  if (language.startsWith("vi")) return "vi";
  if (language.startsWith("en")) return "en";
  return undefined;
}

export const ReadDigestCard = memo(function ReadDigestCard({
  bag,
  language,
  viewerUserId = "",
  className,
}: ReadDigestCardProps) {
  const lng = digestLng(language);
  const { t } = useTranslation(undefined, { lng });
  const nav = useChatEntityNavigation();
  const model = useMemo(() => buildReadDigestViewModel(bag, viewerUserId), [bag, viewerUserId]);

  const metrics: DashboardMetricItem[] = useMemo(
    () => [
      {
        key: "owed",
        label: t("aiChat.digest.youAreOwed", { defaultValue: "You are owed" }),
        value: formatCurrency(model.owedToYouTotal, model.currency),
        icon: ArrowUpIcon,
        tone: "text-semantic-positive",
      },
      {
        key: "owe",
        label: t("aiChat.digest.youOwe", { defaultValue: "You owe" }),
        value: formatCurrency(model.youOweTotal, model.currency),
        icon: ArrowDownIcon,
        tone: "text-semantic-negative",
        anchor: true,
      },
      {
        key: "net",
        label: t("aiChat.digest.net", { defaultValue: "Net" }),
        value: `${model.net >= 0 ? "+" : ""}${formatCurrency(model.net, model.currency)}`,
        icon: ScaleIcon,
        tone:
          model.net > 0
            ? "text-semantic-positive"
            : model.net < 0
              ? "text-semantic-negative"
              : "text-muted-foreground",
      },
    ],
    [model, t],
  );

  return (
    <article
      className={cn(BALANCE_TABLE_GLASS_PANEL, className)}
      data-testid="read-digest-card"
      aria-label={t("aiChat.digest.title", { defaultValue: "FairPay summary" })}
    >
      <header className="border-b border-border/60 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            {t("aiChat.digest.title", { defaultValue: "FairPay summary" })}
          </h2>
          <Badge variant="outline" className="text-[10px] font-normal">
            {t("aiChat.digest.liveData", { defaultValue: "Live data" })}
          </Badge>
        </div>
        <div className="mt-3 flex justify-center">
          <DashboardMetricsIsland items={metrics} variant="pill" className="w-full max-w-md" />
        </div>
      </header>

      <div className="divide-y divide-border/60">
        {model.balances.length > 0 ? (
          <DigestBlock title={t("aiChat.digest.balances", { defaultValue: "Balances" })} count={model.balances.length}>
            <ExpandableList
              items={model.balances}
              previewCount={BALANCE_PREVIEW}
              showMoreLabel={(n) =>
                t("aiChat.digest.showMorePeople", { defaultValue: "Show {{count}} more", count: n })
              }
              showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
            >
              {(balance, index) => (
                <BalanceStaticMobileRow
                  key={`${balance.counterparty_id ?? balance.counterparty_name}-${index}`}
                  balance={balance}
                  index={index}
                  disabled={!balance.counterparty_id}
                  showHistory={false}
                  fullySettled={false}
                  lastDateLabel=""
                  onOpenProfile={() => {
                    if (balance.counterparty_id) nav.openProfile(balance.counterparty_id);
                  }}
                />
              )}
            </ExpandableList>
          </DigestBlock>
        ) : null}

        {model.groups.length > 0 ? (
          <DigestBlock title={t("aiChat.digest.groups", { defaultValue: "Groups" })} count={model.groups.length}>
            <ExpandableList
              items={model.groups}
              previewCount={GROUP_PREVIEW}
              showMoreLabel={(n) =>
                t("aiChat.digest.showMoreGroups", { defaultValue: "Show {{count}} more", count: n })
              }
              showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
            >
              {(g) => {
                const name = g.name?.trim() || g.id;
                const sub = g.description?.trim();
                return (
                  <DigestNavRow
                    key={g.id}
                    label={name}
                    sublabel={sub}
                    ariaLabel={t("aiChat.entityList.openGroup", {
                      name,
                      defaultValue: `Open group ${name}`,
                    })}
                    onActivate={() => nav.openGroup(g.id)}
                  />
                );
              }}
            </ExpandableList>
          </DigestBlock>
        ) : null}

        {model.friends.length > 0 ? (
          <DigestBlock title={t("aiChat.digest.friends", { defaultValue: "Friends" })} count={model.friends.length}>
            <ExpandableList
              items={model.friends}
              previewCount={FRIEND_PREVIEW}
              showMoreLabel={(n) =>
                t("aiChat.digest.showMoreFriends", { defaultValue: "Show {{count}} more", count: n })
              }
              showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
            >
              {(friend) => {
                const name = friend.full_name?.trim() || friend.email?.trim() || friend.id.slice(0, 8);
                return (
                  <div
                    key={friend.id}
                    role="button"
                    tabIndex={0}
                    aria-label={t("aiChat.entityList.openProfile", {
                      name,
                      defaultValue: `Open profile for ${name}`,
                    })}
                    onClick={() => nav.openProfile(friend.id)}
                    onKeyDown={onButtonKeyDown(() => nav.openProfile(friend.id))}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <UserDisplay
                      user={{
                        id: friend.id,
                        full_name: name,
                        avatar_url: null,
                        email: friend.email,
                      }}
                      size="sm"
                      layout="row"
                      groupStack="hidden"
                      className="min-w-0 flex-1"
                    />
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </div>
                );
              }}
            </ExpandableList>
          </DigestBlock>
        ) : null}

        {model.expenses.length > 0 ? (
          <DigestBlock
            title={t("aiChat.digest.topExpenses", { defaultValue: "Top spending" })}
            count={model.expenses.length}
          >
            <div className={cn("overflow-hidden rounded-lg border border-border/60", BALANCE_TABLE_GLASS_DIVIDE)}>
              {model.expenses.map((row, idx) => {
                const label = row.description?.trim() || t("expenses.expense", { defaultValue: "Expense" });
                const amt = Number(row.amount ?? 0);
                const expenseId = row.id;
                const open = () => {
                  if (expenseId) nav.openExpense(expenseId);
                };
                const interactive = Boolean(expenseId);
                return (
                  <div
                    key={row.id ?? `${label}-${idx}`}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    aria-label={
                      interactive
                        ? t("aiChat.entityList.openExpense", {
                            name: label,
                            defaultValue: `Open expense ${label}`,
                          })
                        : undefined
                    }
                    onClick={interactive ? open : undefined}
                    onKeyDown={interactive ? onButtonKeyDown(open) : undefined}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5",
                      interactive &&
                        "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                  >
                    <CategoryIcon category={row.category ?? undefined} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="typography-row-title truncate">{label}</p>
                      {row.expense_date ? (
                        <p className="text-[11px] text-muted-foreground">{row.expense_date}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(amt, row.currency ?? model.currency)}
                      </span>
                      {interactive ? (
                        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </DigestBlock>
        ) : null}

        {model.comments.length > 0 ? (
          <DigestBlock
            title={t("aiChat.digest.comments", { defaultValue: "Recent comments" })}
            count={model.comments.length}
          >
            <ul className="space-y-2">
              {model.comments.slice(0, 5).map((row, idx) => {
                const expenseLabel =
                  row.expenses?.description?.trim() ||
                  row.expense_id?.slice(0, 8) ||
                  t("expenses.expense", { defaultValue: "Expense" });
                const body = row.content?.trim() || "—";
                const who =
                  row.user?.full_name?.trim() ||
                  row.profiles?.full_name?.trim() ||
                  t("aiChat.digest.someone", { defaultValue: "Someone" });
                const expenseId = row.expense_id;
                const openExpense = () => {
                  if (expenseId) nav.openExpense(expenseId);
                };
                return (
                  <li key={row.id ?? `c-${idx}`}>
                    <div
                      role={expenseId ? "button" : undefined}
                      tabIndex={expenseId ? 0 : undefined}
                      onClick={expenseId ? openExpense : undefined}
                      onKeyDown={expenseId ? onButtonKeyDown(openExpense) : undefined}
                      className={cn(
                        BALANCE_EXPAND_INSET_CARD,
                        "px-3 py-2 text-sm",
                        expenseId &&
                          "cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] text-muted-foreground">{expenseLabel}</p>
                        {expenseId ? (
                          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2">
                        <span className="font-medium">{who}</span>
                        <span className="text-muted-foreground"> — </span>
                        {body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </DigestBlock>
        ) : null}

        {model.balances.length === 0 &&
        model.groups.length === 0 &&
        model.friends.length === 0 &&
        model.expenses.length === 0 &&
        model.comments.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-4">
            {t("aiChat.digest.allEmpty", {
              defaultValue: "No balances, groups, or recent activity to show yet.",
            })}
          </p>
        ) : null}
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
        {t("aiChat.entityList.tapRowHint", { defaultValue: "Tap a row to open details in the app." })}
      </p>
    </article>
  );
});

export default ReadDigestCard;
