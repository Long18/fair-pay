/**
 * SePay Order Hook
 *
 * Creates SePay checkout orders and polls for payment status.
 * Uses edge functions for order creation, direct DB polling for status.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import {
  createSepayOrder,
  fetchSepayOrderById,
  type CreateSepayOrderParams,
} from '@/lib/sepay';
import type { SepayPaymentOrder, SepayOrderStatus } from '@/types/user-settings';

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_DURATION = 15 * 60 * 1000; // 15 minutes

interface UseSepayOrderReturn {
  order: SepayPaymentOrder | null;
  checkoutUrl: string | null;
  status: SepayOrderStatus | null;
  isCreating: boolean;
  isPolling: boolean;
  error: string | null;
  createOrder: (params: Omit<CreateSepayOrderParams, 'currency'> & { currency?: string }) => Promise<boolean>;
  stopPolling: () => void;
  reset: () => void;
}

export function useSepayOrder(): UseSepayOrderReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [order, setOrder] = useState<SepayPaymentOrder | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<SepayOrderStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback((orderId: string) => {
    stopPolling();
    setIsPolling(true);
    pollStartRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      // Stop after max duration
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
        stopPolling();
        setStatus('EXPIRED');
        return;
      }

      const updated = await fetchSepayOrderById(orderId);
      if (!updated) return;

      setOrder(updated);
      setStatus(updated.status);

      // Stop polling on terminal states
      if (['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(updated.status)) {
        stopPolling();
      }
    }, POLL_INTERVAL);
  }, [stopPolling]);

  const createOrder = useCallback(async (
    params: Omit<CreateSepayOrderParams, 'currency'> & { currency?: string }
  ): Promise<boolean> => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createSepayOrder({
        ...params,
        currency: params.currency || 'VND',
      });

      if (!result.success || !result.order) {
        setError(result.error || 'Failed to create order');
        return false;
      }

      setCheckoutUrl(result.order.checkout_url);
      setStatus(result.order.status);

      // Fetch full order from DB
      const fullOrder = await fetchSepayOrderById(result.order.id);
      if (fullOrder) {
        setOrder(fullOrder);
      }

      // Start polling
      startPolling(result.order.id);
      return true;
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setOrder(null);
    setCheckoutUrl(null);
    setStatus(null);
    setError(null);
    setIsCreating(false);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    order,
    checkoutUrl,
    status,
    isCreating,
    isPolling,
    error,
    createOrder,
    stopPolling,
    reset,
  };
}
