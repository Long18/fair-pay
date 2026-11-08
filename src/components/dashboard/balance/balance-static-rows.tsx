import { useTranslation } from "react-i18next";
import { motion, type Variants } from "framer-motion";
import {
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { CheckIcon } from "@/components/ui/icons";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { getOweStatusColors, getPaymentStateColors } from "@/lib/status-colors";
import { formatCurrency } from "@/lib/locale-utils";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { cn } from "@/lib/utils";
import {
  BALANCE_TABLE_ROW_BASE,
  BALANCE_TABLE_ROW_HOVER,
  BALANCE_TABLE_ROW_ZEBRA_EVEN,
} from "./balance-table-surface";
import type { Balance } from "./balance-types";

interface BalanceStaticRowProps {
  balance: Balance;
  index: number;
  disabled: boolean;
  showHistory: boolean;
  fullySettled: boolean;
  lastDateLabel: string;
  onOpenProfile: () => void;
}

export function BalanceStaticMobileRow({
  balance,
  index,
  disabled,
  showHistory,
  fullySettled,
  lastDateLabel,
  onOpenProfile,
}: BalanceStaticRowProps) {
  const { t } = useTranslation();
  const amountValue = Number(
    balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount
  );
  const statusColors = balance.i_owe_them
    ? getOweStatusColors("owe")
    : getOweStatusColors("owed");

  const rowClassName = cn(
    "flex items-center justify-between gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5",
    !disabled && BALANCE_TABLE_ROW_HOVER,
    index % 2 === 0 && BALANCE_TABLE_ROW_ZEBRA_EVEN,
    !disabled && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    fullySettled && `opacity-60 ${getPaymentStateColors("paid").bg}`,
  );

  if (disabled) {
    return (
      <div className={rowClassName} aria-label={balance.counterparty_name}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <UserAvatar
              user={{
                full_name: balance.counterparty_name,
                avatar_url: balance.counterparty_avatar_url ?? null,
              }}
              size="lg"
              className="border-2 border-border"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="typography-row-title truncate">{balance.counterparty_name}</p>
            {showHistory && lastDateLabel ? (
              <p className="text-xs text-muted-foreground">{lastDateLabel}</p>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            statusColors.text,
          )}
        >
          {formatCurrency(amountValue, balance.currency ?? "VND")}
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("dashboard.openBalanceProfile", "Open profile for {{name}}", {
        name: balance.counterparty_name,
      })}
      onClick={onOpenProfile}
      onKeyDown={onButtonKeyDown(onOpenProfile)}
      className={rowClassName}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <UserAvatar
            user={{
              full_name: balance.counterparty_name,
              avatar_url: balance.counterparty_avatar_url ?? null,
            }}
            size="lg"
            className="border-2 border-border"
          />
          {fullySettled ? (
            <div
              className={cn(
                "absolute -bottom-1 -right-1 rounded-full p-0.5",
                getPaymentStateColors("paid").bg
              )}
            >
              <CheckIcon className={cn("size-3", getPaymentStateColors("paid").icon)} />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className={cn(
                "typography-row-title truncate",
                fullySettled && "text-muted-foreground line-through"
              )}
            >
              {balance.counterparty_name}
            </p>
            {balance.counterparty_id ? (
              <UserGroupStack userId={balance.counterparty_id} size="xs" />
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {fullySettled ? (
              <PaymentStateBadge state="paid" size="sm" />
            ) : (
              <Badge
                variant={balance.i_owe_them ? "default" : "secondary"}
                className="text-xs"
              >
                {balance.i_owe_them ? t("dashboard.youOwe") : t("dashboard.userOwesYou")}
              </Badge>
            )}
            {showHistory && lastDateLabel ? (
              <span className="typography-metadata">
                {t("dashboard.lastTransaction", "Last: ")}
                {lastDateLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {fullySettled ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 typography-amount",
              getPaymentStateColors("paid").text
            )}
          >
            <CheckIcon className="size-4" />
            {formatCurrency(0, balance.currency || "VND")}
          </span>
        ) : (
          <span className={cn("typography-amount-prominent tabular-nums", statusColors.text)}>
            {balance.i_owe_them ? "-" : "+"}
            {formatCurrency(Math.abs(amountValue), balance.currency || "VND")}
          </span>
        )}
      </div>
    </div>
  );
}

interface BalanceStaticDesktopRowProps extends BalanceStaticRowProps {
  index: number;
  rowVariants?: Variants;
}

export function BalanceStaticDesktopRow({
  balance,
  disabled,
  showHistory,
  fullySettled,
  lastDateLabel,
  onOpenProfile,
  index,
  rowVariants,
}: BalanceStaticDesktopRowProps) {
  const { t } = useTranslation();
  const amountValue = Number(
    balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount
  );
  const statusColors = balance.i_owe_them
    ? getOweStatusColors("owe")
    : getOweStatusColors("owed");

  return (
    <motion.tr
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={t("dashboard.openBalanceProfile", "Open profile for {{name}}", {
        name: balance.counterparty_name,
      })}
      variants={rowVariants}
      custom={index}
      className={cn(
        "cursor-pointer [&_td]:py-1.5",
        BALANCE_TABLE_ROW_BASE,
        index % 2 === 0 && BALANCE_TABLE_ROW_ZEBRA_EVEN,
        disabled && "cursor-not-allowed opacity-50",
        fullySettled && `opacity-60 ${getPaymentStateColors("paid").bg}`
      )}
      onClick={onOpenProfile}
      onKeyDown={onButtonKeyDown(onOpenProfile)}
    >
      <TableCell>
        <div className="relative">
          <UserAvatar
            user={{
              full_name: balance.counterparty_name,
              avatar_url: balance.counterparty_avatar_url ?? null,
            }}
            size="md"
          />
          {fullySettled ? (
            <div
              className={cn(
                "absolute -bottom-1 -right-1 rounded-full p-0.5",
                getPaymentStateColors("paid").bg
              )}
            >
              <CheckIcon className={cn("size-3", getPaymentStateColors("paid").icon)} />
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "typography-row-title",
                fullySettled && "text-muted-foreground line-through"
              )}
            >
              {balance.counterparty_name}
            </span>
            {balance.counterparty_id ? (
              <UserGroupStack userId={balance.counterparty_id} size="xs" />
            ) : null}
          </div>
          {showHistory && lastDateLabel ? (
            <span className="typography-metadata">
              {t("dashboard.lastTransaction", "Last: ")}
              {lastDateLabel}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {fullySettled ? (
          <PaymentStateBadge state="paid" size="md" />
        ) : (
          <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
            {balance.i_owe_them ? t("dashboard.youOwe") : t("dashboard.userOwesYou")}
          </Badge>
        )}
      </TableCell>
      {showHistory ? (
        <>
          <TableCell className="text-right">
            <span className="typography-amount text-muted-foreground">
              {formatCurrency(
                Number(balance.total_amount || balance.amount),
                balance.currency || "VND"
              )}
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className="typography-amount text-muted-foreground">
              {formatCurrency(Number(balance.settled_amount || 0), balance.currency || "VND")}
            </span>
          </TableCell>
          <TableCell className="text-center">
            <Badge variant="outline" className="text-xs">
              {balance.transaction_count || 0}
            </Badge>
          </TableCell>
        </>
      ) : null}
      <TableCell className="text-right">
        {fullySettled ? (
          <span
            className={cn(
              "inline-flex items-center justify-end gap-1 typography-amount",
              getPaymentStateColors("paid").text
            )}
          >
            <CheckIcon className="size-4" />
            {formatCurrency(0, balance.currency || "VND")}
          </span>
        ) : (
          <span className={cn("typography-amount-prominent tabular-nums", statusColors.text)}>
            {balance.i_owe_them ? "-" : "+"}
            {formatCurrency(Math.abs(amountValue), balance.currency || "VND")}
          </span>
        )}
      </TableCell>
    </motion.tr>
  );
}
