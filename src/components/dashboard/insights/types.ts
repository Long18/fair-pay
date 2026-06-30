export type DashboardBalanceSummary = {
  counterparty_name?: string;
  amount?: number;
  currency?: string;
  is_owed?: boolean;
  transaction_count?: number;
  last_transaction_date?: string;
};

export type DashboardActivitySummary = {
  type?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  groupName?: string;
  paymentState?: string;
};

export interface DashboardInsightContext {
  activeTab: string;
  balances: DashboardBalanceSummary[];
  recentActivities: DashboardActivitySummary[];
  historyActivities: DashboardActivitySummary[];
}
