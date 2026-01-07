export interface MomoTransactionHistory {
  success: boolean;
  data?: MomoTransaction[];
  error?: string;
}

export interface MomoTransaction {
  tranId: string;
  phone: string;
  amount: number;
  comment?: string;
  partnerId?: string;
  partnerName?: string;
  ackTime: string;
  currency?: string;
}

export interface MomoPaymentRequest {
  id: string;
  expense_split_id: string;
  user_id: string;
  receiver_phone: string;
  amount: number;
  currency: string;
  reference_code: string;
  qr_url?: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verified_at?: string;
  momo_tran_id?: string;
  raw_webhook_data?: any;
  created_at: string;
  updated_at: string;
}

export interface MomoCheckTransactionResponse {
  success: boolean;
  exists?: boolean;
  transaction?: MomoTransaction;
  error?: string;
}

export interface MomoSettings {
  id: string;
  receiver_phone: string;
  receiver_name?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MomoWebhookPayload {
  signature: string;
  phone: string;
  tranId: number | string;
  ackTime: string;
  partnerId?: string;
  partnerName?: string;
  amount: number;
  comment?: string;
}

export interface CreatePaymentRequestResponse {
  success: boolean;
  id?: string;
  reference_code?: string;
  qr_url?: string;
  amount?: number;
  status?: string;
  error?: string;
}
