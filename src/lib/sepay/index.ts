/**
 * SePay QR Payment - Frontend Utilities
 *
 * QR Bank Transfer flow via SePay:
 * 1. Edge function creates order + generates QR URL from qr.sepay.vn
 * 2. User scans QR with banking app → transfers money
 * 3. SePay detects transaction → sends webhook → settles splits
 *
 * All sensitive operations happen server-side via Supabase edge functions.
 */

import { supabaseClient } from '@/utility/supabaseClient';
import type { SepayPaymentOrder, SepayOrderStatus } from '@/types/user-settings';

const CREATE_ORDER_FUNCTION = 'sepay-create-order';

export interface CreateSepayOrderParams {
  source_type: 'DEBT' | 'EXPENSE';
  source_id: string;
  payee_user_id: string;
  amount: number;
  currency: string;
  description: string;
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
  /** QR code image URL from qr.sepay.vn */
  qr_url?: string;
  /** Payment code to include in transfer description */
  payment_code?: string;
  error?: string;
}

/**
 * Create a SePay QR payment order via edge function.
 * Returns QR URL for user to scan.
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

  if (error) return null;
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

  if (error) return null;
  return data as SepayPaymentOrder;
}

/**
 * Check if a user has SePay configured (bank account linked to SePay).
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

  const config = data.sepay_config as { bank_account_number?: string; bank_name?: string };
  return Boolean(config.bank_account_number && config.bank_name);
}
