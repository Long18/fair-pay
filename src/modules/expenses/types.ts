export interface Attachment {
    id: string;
    expense_id: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
    created_by: string;
}

export interface Expense {
    id: string;
    context_type: 'group' | 'friend';
    group_id: string | null;
    friendship_id: string | null;
    description: string;
    amount: number;
    currency: string;
    category: string | null;
    expense_date: string;
    paid_by_user_id: string;
    is_payment: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    attachments?: Attachment[];
}

export interface ExpenseSplit {
    id: string;
    expense_id: string;
    user_id: string;
    split_method: 'equal' | 'exact' | 'percentage';
    split_value: number | null;
    computed_amount: number;
    created_at: string;
}

export interface ExpenseWithSplits extends Expense {
    splits?: ExpenseSplit[];
    paid_by?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

export interface ExpenseFormValues {
    description: string;
    amount: number;
    currency: string;
    category?: string;
    expense_date: string;
    context_type: 'group' | 'friend';
    group_id?: string;
    friendship_id?: string;
    paid_by_user_id: string;
    split_method: 'equal' | 'exact' | 'percentage';
    splits: ParticipantSplit[];
}

export interface ParticipantSplit {
    user_id: string;
    split_value?: number;
    computed_amount: number;
}

export const EXPENSE_CATEGORIES = [
    'Food & Drink',
    'Transportation',
    'Accommodation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Education',
    'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
