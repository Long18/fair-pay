import { useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { momoAPI } from '@/lib/momo/api';
import { MomoPaymentRequest, CreatePaymentRequestResponse } from '@/lib/momo/types';

export function useMomoPayment(expenseSplitId: string) {
    const { data: identity } = useGetIdentity<Profile>();
    const [paymentRequest, setPaymentRequest] = useState<MomoPaymentRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'verified' | 'failed' | 'expired'>('pending');

    // Load existing payment request
    const loadPaymentRequest = useCallback(async () => {
        if (!expenseSplitId || !identity?.id) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabaseClient
                .from('momo_payment_requests')
                .select('*')
                .eq('expense_split_id', expenseSplitId)
                .eq('user_id', identity.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data) {
                setPaymentRequest(data);
                setStatus(data.status as any);
            }
        } catch (error) {
            console.error('Error loading payment request:', error);
        } finally {
            setIsLoading(false);
        }
    }, [expenseSplitId, identity?.id]);

    // Create new payment request
    const createPaymentRequest = useCallback(async (amount: number) => {
        if (!expenseSplitId || !identity?.id || !momoAPI.isConfigured()) {
            setError('Invalid configuration');
            return null;
        }

        // Prevent concurrent requests
        if (isCreating) {
            return null;
        }

        setIsCreating(true);
        setError(null);
        
        try {
            // Get MoMo settings
            const { data: settings, error: settingsError } = await supabaseClient
                .from('momo_settings')
                .select('receiver_phone')
                .eq('enabled', true)
                .single();

            if (settingsError || !settings) {
                const errorMsg = 'MoMo is not configured. Please contact the administrator.';
                setError(errorMsg);
                throw new Error(errorMsg);
            }

            // Call the database function to create payment request
            const { data, error } = await supabaseClient.rpc('create_momo_payment_request', {
                p_expense_split_id: expenseSplitId,
                p_user_id: identity.id,
                p_receiver_phone: settings.receiver_phone,
                p_amount: amount,
            });

            if (error) {
                const errorMsg = error.message || 'Failed to create payment request';
                setError(errorMsg);
                throw error;
            }

            const result = data as CreatePaymentRequestResponse;

            if (result.success && result.id) {
                // Load the full payment request
                const { data: newRequest } = await supabaseClient
                    .from('momo_payment_requests')
                    .select('*')
                    .eq('id', result.id)
                    .single();

                if (newRequest) {
                    setPaymentRequest(newRequest);
                    setStatus(newRequest.status as any);
                    setError(null);
                    return newRequest;
                }
            } else if (!result.success) {
                const errorMsg = (result as any).error || 'Failed to create payment request';
                setError(errorMsg);
            }

            return null;
        } catch (error: any) {
            console.error('Error creating payment request:', error);
            const errorMsg = error?.message || 'An unexpected error occurred';
            setError(errorMsg);
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [expenseSplitId, identity?.id, isCreating]);

    // Manual recheck payment
    const recheckPayment = useCallback(async () => {
        if (!paymentRequest?.reference_code) return false;

        try {
            // Check with MoMo API
            const result = await momoAPI.checkTransactionByContent(paymentRequest.reference_code);

            if (result.success && result.exists && result.transaction) {
                // Verify payment in database
                const { data, error } = await supabaseClient.rpc('verify_momo_payment', {
                    p_reference_code: paymentRequest.reference_code,
                    p_tran_id: result.transaction.tranId,
                    p_amount: result.transaction.amount,
                });

                if (!error && data?.success) {
                    setStatus('verified');
                    // Reload payment request
                    await loadPaymentRequest();
                    return true;
                }
            } else {
                // Try scanning recent transactions
                const scanResult = await momoAPI.scanForPayment(paymentRequest.reference_code);

                if (scanResult.success && scanResult.exists && scanResult.transaction) {
                    const { data, error } = await supabaseClient.rpc('verify_momo_payment', {
                        p_reference_code: paymentRequest.reference_code,
                        p_tran_id: scanResult.transaction.tranId,
                        p_amount: scanResult.transaction.amount,
                    });

                    if (!error && data?.success) {
                        setStatus('verified');
                        await loadPaymentRequest();
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Error rechecking payment:', error);
        }

        return false;
    }, [paymentRequest, loadPaymentRequest]);

    // Subscribe to real-time updates
    const subscribeToUpdates = useCallback((onVerified: () => void) => {
        if (!paymentRequest?.id) return null;

        const subscription = supabaseClient
            .channel(`momo_payment_${paymentRequest.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'momo_payment_requests',
                    filter: `id=eq.${paymentRequest.id}`,
                },
                (payload) => {
                    const newStatus = payload.new.status as any;
                    setStatus(newStatus);

                    if (newStatus === 'verified') {
                        onVerified();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [paymentRequest?.id]);

    // Initial load
    useEffect(() => {
        loadPaymentRequest();
    }, [loadPaymentRequest]);

    return {
        paymentRequest,
        isLoading,
        isCreating,
        error,
        status,
        createPaymentRequest,
        recheckPayment,
        subscribeToUpdates,
        loadPaymentRequest,
    };
}
