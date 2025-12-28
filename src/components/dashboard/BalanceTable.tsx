import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Balance {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: string | number;
  i_owe_them: boolean;
}

interface BalanceTableProps {
  balances: Balance[];
  disabled?: boolean;
}

export function BalanceTable({ balances, disabled = false }: BalanceTableProps) {
  const go = useGo();
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  if (balances.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {t('dashboard.allSettledUpNoDebts', 'All settled up!')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>{t('profile.person', 'Person')}</TableHead>
          <TableHead>{t('profile.status', 'Status')}</TableHead>
          <TableHead className="text-right">{t('profile.amount', 'Amount')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {balances.map((balance) => (
          <TableRow
            key={balance.counterparty_id}
            className={cn(
              "cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && go({ to: `/profile/${balance.counterparty_id}` })}
          >
            <TableCell>
              <Avatar className="h-8 w-8">
                <AvatarImage src={balance.counterparty_avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell className="font-medium">{balance.counterparty_name}</TableCell>
            <TableCell>
              <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
                {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              ₫{formatCurrency(Number(balance.amount))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
