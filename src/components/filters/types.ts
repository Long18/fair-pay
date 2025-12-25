export type DateFilterOption = 
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'custom';

export interface ExpenseFilters {
  dateRange?: {
    option: DateFilterOption;
    startDate?: string;
    endDate?: string;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
  categories?: string[];
  paidBy?: string[];
  contextId?: string; // group_id or friendship_id
  contextType?: 'group' | 'friend';
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

