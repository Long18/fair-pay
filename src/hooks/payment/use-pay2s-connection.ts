/**
 * Pay2S connection hook.
 *
 * Reads connection status + recent transactions (RLS: owner only) and drives
 * the OAuth flow through the pay2s-oauth-start / pay2s-disconnect Edge
 * Functions. Tokens never reach the client.
 */

import { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { Pay2SBankTransaction, Pay2SConnection } from '@/types/pay2s';

const CONNECTION_COLUMNS =
  'id, status, scope, bank_label, connected_at, connection_expires_at, last_event_at, last_error';
const TRANSACTION_COLUMNS =
  'id, gateway, account_number, amount, content, direction, tx_time, payment_code, match_status, matched_source_type, matched_source_id';
const TRANSACTION_LIMIT = 20;

export const PAY2S_EXPIRY_WARNING_DAYS = 7;

export function daysUntil(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

interface UsePay2SConnectionReturn {
  connection: Pay2SConnection | null;
  transactions: Pay2SBankTransaction[];
  isLoading: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  error: string | null;
  isActive: boolean;
  needsReconnect: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  dismissTransaction: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePay2SConnection(): UsePay2SConnectionReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const userId = identity?.id;
  const [connection, setConnection] = useState<Pay2SConnection | null>(null);
  const [transactions, setTransactions] = useState<Pay2SBankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: conn, error: connError } = await supabaseClient
        .from('pay2s_connections')
        .select(CONNECTION_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();
      if (connError) throw connError;

      const current = (conn as Pay2SConnection | null) ?? null;
      setConnection(current);

      if (current && current.status !== 'revoked') {
        const { data: txs, error: txError } = await supabaseClient
          .from('pay2s_bank_transactions')
          .select(TRANSACTION_COLUMNS)
          .eq('user_id', userId)
          .neq('match_status', 'dismissed')
          .order('tx_time', { ascending: false, nullsFirst: false })
          .limit(TRANSACTION_LIMIT);
        if (txError) throw txError;
        setTransactions((txs as Pay2SBankTransaction[]) ?? []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading Pay2S connection:', err);
      setError('load_failed');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabaseClient.functions.invoke('pay2s-oauth-start', {
        method: 'POST',
        body: {},
      });
      if (invokeError) throw invokeError;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('missing_authorize_url');
      // Full-page redirect to Pay2S consent (never an AJAX call).
      window.location.assign(url);
    } catch (err) {
      console.error('Error starting Pay2S OAuth:', err);
      setError('connect_failed');
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(null);
    try {
      const { error: invokeError } = await supabaseClient.functions.invoke('pay2s-disconnect', {
        method: 'POST',
        body: {},
      });
      if (invokeError) throw invokeError;
      await refresh();
    } catch (err) {
      console.error('Error disconnecting Pay2S:', err);
      setError('disconnect_failed');
    } finally {
      setIsDisconnecting(false);
    }
  }, [refresh]);

  const dismissTransaction = useCallback(
    async (id: string) => {
      const { error: rpcError } = await supabaseClient.rpc('dismiss_pay2s_transaction', {
        p_transaction_id: id,
      });
      if (rpcError) {
        console.error('Error dismissing Pay2S transaction:', rpcError);
        setError('dismiss_failed');
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [],
  );

  const isActive = connection?.status === 'active';
  const expiresInDays = daysUntil(connection?.connection_expires_at ?? null);
  const needsReconnect =
    !!connection &&
    (connection.status === 'expired' ||
      connection.status === 'error' ||
      (isActive && expiresInDays !== null && expiresInDays <= PAY2S_EXPIRY_WARNING_DAYS));

  return {
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
  };
}
