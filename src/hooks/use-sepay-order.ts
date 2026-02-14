/**
 * SePay Order Hook
 *
 * Creates SePay checkout orders and polls for payment status.
 * Edge function returns signed form fields.
 * Frontend auto-submits hidden form to SePay (CSP allows via vercel.json).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createSepayOrder,
  fetchSepayOrderById,
  type CreateSepayOrderParams,
} from '@/lib/sepay';
import type { SepayPaymentOrder, SepayOrderStatus } from '@/types/user-settings';

const POLL_INTERVAL = 3000;
const MAX_POLL_DURATION = 15 * 60 * 1000;

interface UseSepayOrderReturn {
  order: SepayPaymentOrder | null;
  formAction: string | null;
  formFields: Record<string, string> | null;
  status: SepayOrderStatus | null;
  isCreating: boolean;
  isPolling: boolean;
  error: string | null;
  createOrder: (params: Omit<CreateSepayOrderParams, 'currency'> & { currency?: string }) => Promise<boolean>;
  stopPolling: () => void;
  reset: () => void;
}

export function useSepayOrder(): UseSepayOrderReturn {
  const [order, setOrder] = useState<SepayPaymentOrder | null>(null);
  const [formAction, setFormAction] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string> | null>(null);
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
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
        stopPolling();
        setStatus('EXPIRED');
        return;
      }

      try {
        const updated = await fetchSepayOrderById(orderId);
        if (!updated) return;

        setOrder(updated);
        setStatus(updated.status);

        if (['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(updated.status)) {
          stopPolling();
        }
      } catch {
        // Silently ignore poll errors to prevent log spam
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

      setFormAction(result.form_action || null);
      setFormFields(result.form_fields || null);
      setStatus(result.order.status);

      const fullOrder = await fetchSepayOrderById(result.order.id);
      if (fullOrder) {
        setOrder(fullOrder);
      }

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
    setFormAction(null);
    setFormFields(null);
    setStatus(null);
    setError(null);
    setIsCreating(false);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    order,
    formAction,
    formFields,
    status,
    isCreating,
    isPolling,
    error,
    createOrder,
    stopPolling,
    reset,
  };
}