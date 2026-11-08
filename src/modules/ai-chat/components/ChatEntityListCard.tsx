import { memo, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BalanceStaticMobileRow } from "@/components/dashboard/balance/balance-static-rows";
import {
  BALANCE_TABLE_GLASS_DIVIDE,
  BALANCE_TABLE_GLASS_PANEL,
} from "@/components/dashboard/balance/balance-table-surface";
import { UserDisplay } from "@/components/user-display";
import { CategoryIcon } from "@/modules/expenses/components/category-icon";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import type { ChatEntitySurface } from "../utils/chat-entity-surface";
import type { ExpenseCommentRow } from "../utils/format-expense-comments";
import { useChatEntityNavigation } from "../hooks/use-chat-entity-navigation";

const PREVIEW = 8;

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

function NavRow({
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

function commentAuthor(row: ExpenseCommentRow): string {
  return (
    row.user?.full_name?.trim() ||
    row.profiles?.full_name?.trim() ||
    "Someone"
  );
}

function commentExpenseLabel(row: ExpenseCommentRow, t: (key: string, opts?: { defaultValue?: string }) => string): string {
  const fromExpense = row.expenses?.description?.trim();
  if (fromExpense) return fromExpense;
  if (row.expense_id) return row.expense_id.slice(0, 8);
  return t("expenses.expense", { defaultValue: "Expense" });
}

function formatCommentWhen(iso: string | null | undefined, language?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(language?.startsWith("vi") ? "vi-VN" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export interface ChatEntityListCardProps {
  surface: ChatEntitySurface;
  language?: string;
  className?: string;
}

export const ChatEntityListCard = memo(function ChatEntityListCard({
  surface,
  language,
  className,
}: ChatEntityListCardProps) {
  const lng = digestLng(language);
  const { t } = useTranslation(undefined, { lng });
  const nav = useChatEntityNavigation();

  const title = useMemo(() => {
    if (surface.kind === "groups") {
      return t("aiChat.entityList.groupsTitle", { defaultValue: "Your groups" });
    }
    if (surface.kind === "friends") {
      return t("aiChat.entityList.friendsTitle", { defaultValue: "Your friends" });
    }
    if (surface.kind === "expenses") {
      return t("aiChat.entityList.expensesTitle", { defaultValue: "Top spending" });
    }
    if (surface.kind === "comments") {
      return t("aiChat.entityList.commentsTitle", { defaultValue: "Recent expense comments" });
    }
    return t("aiChat.entityList.balancesTitle", { defaultValue: "Balances" });
  }, [surface.kind, t]);

  const count =
    surface.kind === "groups"
      ? surface.groups.length
      : surface.kind === "friends"
        ? surface.friends.length
        : surface.kind === "expenses"
          ? surface.expenses.length
          : surface.kind === "comments"
            ? surface.comments.length
            : surface.balances.length;

  return (
    <article
      className={cn(BALANCE_TABLE_GLASS_PANEL, className)}
      data-testid="chat-entity-list-card"
      data-entity-kind={surface.kind}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium tabular-nums">
          {count}
        </Badge>
      </header>

      <div className="p-2 sm:p-3">
        {surface.kind === "groups" ? (
          <ExpandableList
            items={surface.groups}
            previewCount={PREVIEW}
            showMoreLabel={(n) =>
              t("aiChat.digest.showMoreGroups", { defaultValue: "Show {{count}} more", count: n })
            }
            showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
          >
            {(g) => {
              const name = g.name?.trim() || g.id;
              const sub = g.description?.trim();
              return (
                <NavRow
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
        ) : null}

        {surface.kind === "friends" ? (
          <ExpandableList
            items={surface.friends}
            previewCount={PREVIEW}
            showMoreLabel={(n) =>
              t("aiChat.digest.showMoreFriends", { defaultValue: "Show {{count}} more", count: n })
            }
            showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
          >
            {(friend) => {
              const name =
                friend.full_name?.trim() || friend.email?.trim() || friend.id.slice(0, 8);
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
        ) : null}

        {surface.kind === "expenses" ? (
          <ExpandableList
            items={surface.expenses}
            previewCount={PREVIEW}
            showMoreLabel={(n) =>
              t("aiChat.digest.showMoreExpenses", { defaultValue: "Show {{count}} more", count: n })
            }
            showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
          >
            {(row, idx) => {
              const label = row.description?.trim() || t("expenses.expense", { defaultValue: "Expense" });
              const amt = Number(row.amount ?? 0);
              const expenseId = row.id;
              const currency = row.currency ?? surface.currency ?? "VND";
              const open = () => {
                if (expenseId) nav.openExpense(expenseId);
              };
              const interactive = Boolean(expenseId);
              return (
                <div
                  key={row.id ?? `exp-${idx}`}
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
                      {formatCurrency(amt, currency)}
                    </span>
                    {interactive ? (
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                    ) : null}
                  </div>
                </div>
              );
            }}
          </ExpandableList>
        ) : null}

        {surface.kind === "balances" ? (
          <ExpandableList
            items={surface.balances}
            previewCount={PREVIEW}
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
        ) : null}

        {surface.kind === "comments" ? (
          <ExpandableList
            items={surface.comments}
            previewCount={PREVIEW}
            showMoreLabel={(n) =>
              t("aiChat.entityList.showMoreComments", {
                defaultValue: "Show {{count}} more",
                count: n,
              })
            }
            showLessLabel={t("aiChat.digest.showLess", { defaultValue: "Show less" })}
          >
            {(row, idx) => {
              const expenseLabel = commentExpenseLabel(row, t);
              const author = commentAuthor(row);
              const body =
                row.content?.trim() ||
                t("aiChat.entityList.emptyComment", { defaultValue: "(empty)" });
              const when = formatCommentWhen(row.created_at, language);
              const expenseId = row.expense_id;
              const open = () => {
                if (expenseId) nav.openExpense(expenseId);
              };
              const whenBit = when ? ` · ${when}` : "";
              const sublabel = `${author}${whenBit}: ${body}`;
              return (
                <NavRow
                  key={row.id ?? `comment-${idx}`}
                  label={expenseLabel}
                  sublabel={sublabel}
                  ariaLabel={t("aiChat.entityList.openExpense", {
                    name: expenseLabel,
                    defaultValue: `Open expense ${expenseLabel}`,
                  })}
                  onActivate={open}
                />
              );
            }}
          </ExpandableList>
        ) : null}
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
        {t("aiChat.entityList.tapRowHint", { defaultValue: "Tap a row to open details in the app." })}
      </p>
    </article>
  );
});

export default ChatEntityListCard;
