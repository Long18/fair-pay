import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2Icon, XCircleIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';
import type { MemberPrepaidInfo } from '../types/prepaid';

interface MemberPrepaidBalanceListProps {
  recurringExpenseId: string;
}

export function MemberPrepaidBalanceList({
  recurringExpenseId,
}: MemberPrepaidBalanceListProps) {
  const { t } = useTranslation();
  const { data: members, isLoading, error } = useMemberPrepaidInfo(recurringExpenseId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {t('prepaid.loadError', 'Failed to load prepaid balances')}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {t('prepaid.noMembers', 'No members found')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberBalanceCard key={member.user_id} member={member} />
      ))}
    </div>
  );
}

function MemberBalanceCard({ member }: { member: MemberPrepaidInfo }) {
  const { t } = useTranslation();
  const hasPrepaid = member.balance_amount > 0;

  return (
    <div className="rounded-lg border p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.user_name}</span>
          {hasPrepaid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2Icon className="h-3 w-3" />
              {member.months_remaining} {t('prepaid.monthsLabel', 'month(s)')}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircleIcon className="h-3 w-3" />
              {t('prepaid.noPrepaid', 'No prepaid')}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">
            {t('prepaid.balance', 'Balance')}
          </p>
          <p className="font-semibold">
            {formatNumber(member.balance_amount)} {member.currency}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('prepaid.monthlyShare', 'Monthly share')}
          </p>
          <p className="font-semibold">
            {formatNumber(member.monthly_share)} {member.currency}
          </p>
        </div>
      </div>

      {member.payment_count > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('prepaid.totalPrepaidInfo', 'Total prepaid: {{amount}} {{currency}} ({{count}} payment(s))', {
            amount: formatNumber(member.total_prepaid),
            currency: member.currency,
            count: member.payment_count,
          })}
        </p>
      )}
    </div>
  );
}
