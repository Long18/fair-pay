/**
 * SePay Payment Gateway - Frontend Utilities
 *
 * Constants, helpers, and types for SePay QR payment integration.
 * All sensitive operations (order creation, signature) happen server-side
 * via Supabase edge functions.
 */

import { supabaseClient } from '@/utility/supabaseClient';
import type { SepayPaymentOrder, SepayOrderStatus } from '@/types/user-settings';

// Edge function names
const CREATE_ORDER_FUNCTION = 'sepay-create-order';

export interface CreateSepayOrderParams {
  source_type: 'DEBT' | 'EXPENSE';
  source_id: string;
  payee_user_id: string;
  amount: number;
  currency: string;
  description: string;
  success_url?: string;
  error_url?: string;
  cancel_url?: string;
}

export interface CreateSepayOrderResult {
  success: boolean;
  order?: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: SepayOrderStatus;
  };
  /** SePay checkout URL (captured server-side from redirect) */
  checkout_url?: string;
  /** SePay checkout form action URL (fallback) */
  form_action?: string;
  /** Signed form fields to POST to SePay (fallback) */
  form_fields?: Record<string, string>;
  error?: string;
  details?: unknown;
}

/**
 * Create a SePay checkout order via edge function.
 * Returns the order with form data for browser redirect to SePay.
 */
export async function createSepayOrder(
  params: CreateSepayOrderParams
): Promise<CreateSepayOrderResult> {
  const { data, error } = await supabaseClient.functions.invoke(CREATE_ORDER_FUNCTION, {
    body: params,
  });

  if (error) {
    console.error('SePay order creation error:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }

  return data as CreateSepayOrderResult;
}

/**
 * Fetch a SePay order by invoice number.
 */
export async function fetchSepayOrder(
  invoiceNumber: string
): Promise<SepayPaymentOrder | null> {
  const { data, error } = await supabaseClient
    .from('sepay_payment_orders')
    .select('*')
    .eq('order_invoice_number', invoiceNumber)
    .single();

  if (error) {
    console.error('Error fetching SePay order:', error);
    return null;
  }

  return data as SepayPaymentOrder;
}

/**
 * Fetch a SePay order by ID.
 */
export async function fetchSepayOrderById(
  orderId: string
): Promise<SepayPaymentOrder | null> {
  const { data, error } = await supabaseClient
    .from('sepay_payment_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching SePay order:', error);
    return null;
  }

  return data as SepayPaymentOrder;
}

/**
 * Check if a user has SePay configured (by checking their user_settings).
 */
export async function checkPayeeSepayConfigured(
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('user_settings')
    .select('sepay_config')
    .eq('user_id', userId)
    .single();

  if (error || !data?.sepay_config) return false;

  const config = data.sepay_config as { merchant_id?: string; secret_key?: string };
  return Boolean(config.merchant_id && config.secret_key);
}
