/**
 * payOS Integration
 *
 * Frontend utility for creating payOS payment links via Supabase edge function.
 */

import { supabaseClient } from '@/utility/supabaseClient';

export interface PayOSPaymentLink {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode: string;
  orderCode: number;
  amount: number;
}

interface CreatePaymentLinkParams {
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
}

/**
 * Create a payOS payment link via edge function
 */
export async function createPayOSLink(params: CreatePaymentLinkParams): Promise<PayOSPaymentLink> {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabaseClient.functions.invoke('create-payos-link', {
    body: params,
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to create payment link');
  }

  return response.data as PayOSPaymentLink;
}
