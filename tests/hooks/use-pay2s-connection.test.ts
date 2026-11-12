import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const state = {
    connection: null as Record<string, unknown> | null,
    transactions: [] as Array<Record<string, unknown>>,
  };
  const invoke = vi.fn();
  const rpc = vi.fn();
  const from = vi.fn((table: string) => {
    const result = () =>
      table === 'pay2s_connections'
        ? { data: state.connection, error: null }
        : { data: state.transactions, error: null };
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'order', 'limit']) builder[m] = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => result());
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
    return builder;
  });
  return { state, invoke, rpc, from };
});

vi.mock('@refinedev/core', () => ({
  useGetIdentity: () => ({ data: { id: 'user-1' } }),
}));

vi.mock('@/utility/supabaseClient', () => ({
  supabaseClient: {
    from: mocks.from,
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
  },
}));

import { daysUntil, usePay2SConnection } from '@/hooks/payment/use-pay2s-connection';

const NOW = new Date('2026-11-12T00:00:00Z').getTime();
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString();

const conn = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  status: 'active',
  scope: '',
  bank_label: 'ACB •••6789',
  connected_at: inDays(-1),
  connection_expires_at: inDays(60),
  last_event_at: null,
  last_error: null,
  ...over,
});

describe('daysUntil', () => {
  it('rounds up to whole days and handles null/invalid', () => {
    expect(daysUntil(inDays(3), NOW)).toBe(3);
    expect(daysUntil(new Date(NOW + 3600_000).toISOString(), NOW)).toBe(1);
    expect(daysUntil(inDays(-2), NOW)).toBe(-2);
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil('garbage', NOW)).toBeNull();
  });
});

describe('usePay2SConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.connection = null;
    mocks.state.transactions = [];
  });

  it('reports not connected when there is no row', async () => {
    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connection).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.needsReconnect).toBe(false);
  });

  it('loads an active connection and its transactions', async () => {
    mocks.state.connection = conn();
    mocks.state.transactions = [{ id: 't1', amount: 1000, direction: 'IN', match_status: 'suggested' }];
    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isActive).toBe(true);
    expect(result.current.needsReconnect).toBe(false);
    expect(result.current.transactions).toHaveLength(1);
  });

  it('asks to reconnect when expired, errored, or expiring within 7 days', async () => {
    for (const over of [{ status: 'expired' }, { status: 'error' }, { connection_expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString() }]) {
      mocks.state.connection = conn(over);
      const { result, unmount } = renderHook(() => usePay2SConnection());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.needsReconnect).toBe(true);
      unmount();
    }
  });

  it('does not load transactions for a revoked connection', async () => {
    mocks.state.connection = conn({ status: 'revoked' });
    mocks.state.transactions = [{ id: 't1' }];
    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual([]);
    expect(result.current.needsReconnect).toBe(false);
  });

  it('connect() invokes pay2s-oauth-start and redirects the whole page to the authorize URL', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    mocks.invoke.mockResolvedValue({ data: { url: 'https://api.pay2s.vn/api/v1/oauth/authorize?x=1' }, error: null });

    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.connect();
    });

    expect(mocks.invoke).toHaveBeenCalledWith('pay2s-oauth-start', expect.objectContaining({ method: 'POST' }));
    expect(assign).toHaveBeenCalledWith('https://api.pay2s.vn/api/v1/oauth/authorize?x=1');
    vi.unstubAllGlobals();
  });

  it('connect() surfaces an error and does not redirect when the function fails', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('503') });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.connect();
    });

    expect(assign).not.toHaveBeenCalled();
    expect(result.current.error).toBe('connect_failed');
    expect(result.current.isConnecting).toBe(false);
    vi.unstubAllGlobals();
  });

  it('dismissTransaction() calls the RPC and removes the row locally', async () => {
    mocks.state.connection = conn();
    mocks.state.transactions = [{ id: 't1' }, { id: 't2' }];
    mocks.rpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => usePay2SConnection());
    await waitFor(() => expect(result.current.transactions).toHaveLength(2));
    await act(async () => {
      await result.current.dismissTransaction('t1');
    });
    expect(mocks.rpc).toHaveBeenCalledWith('dismiss_pay2s_transaction', { p_transaction_id: 't1' });
    expect(result.current.transactions.map((t) => t.id)).toEqual(['t2']);
  });
});
