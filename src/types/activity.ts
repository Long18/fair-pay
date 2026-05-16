import type { SupportedCurrency } from "@/lib/format-utils";

// =============================================
// Payment Event Types
// =============================================

export interface PaymentEvent {
  id: string;
  event_type: "manual_settle" | "momo_payment" | "banking_payment" | "settle_all" | "settle_all_with_person" | "settle_all_user_splits" | "settle_batch" | "settle_all_group";
  from_user_id: string;
  from_user_name: string;
  from_user_avatar?: string;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar?: string;
  amount: number;
  currency: string;
  method: "manual" | "momo" | "banking";
  actor_user_id: string;
  actor_user_name: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PayingParticipant {
  id: string;
  name: string;
  avatar?: string;
}

// =============================================
// Enhanced Activity Item Types
// =============================================

export interface EnhancedActivityItem {
  // Parent row
  id: string;
  type: "expense" | "payment";
  description: string;
  amount: number;
  totalAmount: number;
  userAmount: number;
  currency: SupportedCurrency;
  date: string;
  activityDate: string;
  paymentState: "paid" | "unpaid" | "partial";
  partialPercentage?: number;
  settlementProgressPct: number;
  oweStatus: {
    direction: "owe" | "owed" | "neutral";
    amount: number;
  };
  participantCount: number;
  groupName?: string;
  payingParticipants: PayingParticipant[];
  
  // Child rows (payment events grouped by expenseId)
  paymentEvents: PaymentEvent[];
  
  // Original source data
  originalExpense?: any; // Full expense object from database
  originalPayment?: any; // Full payment object from database
  
  // Context for disambiguation
  needsContext?: boolean;
  contextLine?: string;
}
