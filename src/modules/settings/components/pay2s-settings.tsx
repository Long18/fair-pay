/**
 * Pay2S Settings Component
 *
 * Optional add-on: link a Pay2S account (OAuth) so FairPay can see incoming
 * bank transfers and SUGGEST matches. Confirming a payment still happens in the
 * normal FairPay settle flow — nothing here settles automatically.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircleIcon, CheckCircleIcon, LinkIcon, TrashIcon } from '@/components/ui/icons';
import { daysUntil, usePay2SConnection } from '@/hooks/payment/use-pay2s-connection';
import { Pay2SCallbackStatus } from '@/types/pay2s';

const KNOWN_STATUSES: Pay2SCallbackStatus[] = [
  'connected',
  'denied',
  'invalid_request',
  'invalid_state',
  'invalid_issuer',
  'no_bank',
  'app_not_approved',
  'personal_app_owner_only',
  'active_plan_required',
  'invalid_grant',
  'webhook_secret_missing',
  'error',
];

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const formatDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export function Pay2SSettings() {
  const { t } = useTranslation();
  const {
    connection,
    transactions,
    isLoading,
    isConnecting,
    isDisconnecting,
    error,
    isActive,
    needsReconnect,
    connect,
    disconnect,
    dismissTransaction,
    refresh,
  } = usePay2SConnection();

  // Surface the result of the OAuth round trip, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') as Pay2SCallbackStatus | null;
    if (!status) return;

    const key = KNOWN_STATUSES.includes(status) ? status : 'error';
    const message = t(`settings.pay2s.status.${key}`, key);
    if (key === 'connected') {
      toast.success(message);
      void refresh();
    } else {
      toast.error(message);
    }
    window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const expiresInDays = daysUntil(connection?.connection_expires_at ?? null);
  const linked = !!connection && connection.status !== 'revoked';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.pay2s.title', 'Pay2S bank sync')}</CardTitle>
          <CardDescription>
            {t(
              'settings.pay2s.description',
              'Optional. Link Pay2S so FairPay can see incoming transfers and suggest which debt they pay. You always confirm payments yourself.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{t(`settings.pay2s.errors.${error}`, 'Something went wrong. Please try again.')}</AlertDescription>
            </Alert>
          )}

          {linked && connection ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isActive ? 'default' : 'destructive'}>
                  {isActive ? <CheckCircleIcon className="mr-1 h-3 w-3" /> : <AlertCircleIcon className="mr-1 h-3 w-3" />}
                  {t(`settings.pay2s.connectionStatus.${connection.status}`, connection.status)}
                </Badge>
                {connection.bank_label && <span className="text-sm font-medium">{connection.bank_label}</span>}
              </div>
              <dl className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  {t('settings.pay2s.connectedAt', 'Connected')}: {formatDateTime(connection.connected_at)}
                </div>
                <div>
                  {t('settings.pay2s.lastEvent', 'Last transaction')}: {formatDateTime(connection.last_event_at)}
                </div>
              </dl>

              {needsReconnect && (
                <Alert>
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertDescription>
                    {isActive && expiresInDays !== null
                      ? t('settings.pay2s.expiringSoon', {
                          count: Math.max(expiresInDays, 0),
                          defaultValue: 'Your Pay2S connection expires in {{count}} day(s). Reconnect to keep syncing.',
                        })
                      : t('settings.pay2s.needsReconnect', 'This connection is no longer valid. Reconnect to resume syncing.')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                {needsReconnect && (
                  <Button onClick={() => void connect()} disabled={isConnecting}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {t('settings.pay2s.reconnect', 'Reconnect')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => void disconnect()} disabled={isDisconnecting}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  {t('settings.pay2s.disconnect', 'Disconnect')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t(
                  'settings.pay2s.scopeNote',
                  'FairPay only reads your selected bank account and its transactions. It cannot move money. You can disconnect anytime, here or at pay2s.vn.'
                )}
              </p>
              <Button onClick={() => void connect()} disabled={isConnecting}>
                <LinkIcon className="mr-2 h-4 w-4" />
                {isConnecting ? t('settings.pay2s.connecting', 'Redirecting…') : t('settings.pay2s.connect', 'Connect Pay2S')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {linked && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.pay2s.recentTitle', 'Recent transactions')}</CardTitle>
            <CardDescription>
              {t('settings.pay2s.recentDescription', 'Suggested matches must be confirmed in the debt/payment screens.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('settings.pay2s.noTransactions', 'No transactions yet.')}</p>
            ) : (
              <ul className="divide-y">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={tx.direction === 'IN' ? 'font-semibold text-emerald-600' : 'font-semibold'}>
                          {tx.direction === 'IN' ? '+' : '−'}
                          {formatVnd(tx.amount)}
                        </span>
                        {tx.match_status === 'suggested' && (
                          <Badge variant="secondary">{t('settings.pay2s.suggested', 'Matches a payment request')}</Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{tx.content || '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(tx.tx_time)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void dismissTransaction(tx.id)}>
                      {t('settings.pay2s.dismiss', 'Dismiss')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
