export interface AnalyticsProvider {
    init(): void;
    track(eventName: string, properties?: Record<string, any>): void;
    pageView(path: string, title?: string): void;
    setUser(userId: string, properties?: Record<string, any>): void;
    clearUser(): void;
    isInitialized(): boolean;
}

export interface AnalyticsConfig {
    enabled: boolean;
    environment: 'development' | 'production' | 'test';
    debug?: boolean;
}

export type EventCategory =
    | 'Auth'
    | 'Expense'
    | 'Payment'
    | 'Group'
    | 'Friend'
    | 'Dashboard'
    | 'Settings'
    | 'Report'
    | 'Error'
    | 'Feature';

export interface BaseEventProperties {
    category: EventCategory;
    timestamp?: number;
    userId?: string;
    sessionId?: string;
}

export interface AuthEvent extends BaseEventProperties {
    category: 'Auth';
    action: 'login' | 'logout' | 'register';
    method?: 'email' | 'oauth';
    provider?: 'google';
}

export interface ExpenseEvent extends BaseEventProperties {
    category: 'Expense';
    action: 'created' | 'edited' | 'deleted' | 'settled';
    amount?: number;
    currency?: string;
    splitMethod?: 'equal' | 'percentage' | 'exact' | 'shares';
    participantCount?: number;
    hasReceipt?: boolean;
    context?: 'group' | 'friend';
}

export interface PaymentEvent extends BaseEventProperties {
    category: 'Payment';
    action: 'recorded' | 'edited' | 'deleted';
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    hasProof?: boolean;
    context?: 'group' | 'friend';
}

export interface GroupEvent extends BaseEventProperties {
    category: 'Group';
    action: 'created' | 'joined' | 'left' | 'edited' | 'deleted';
    memberCount?: number;
    hasDescription?: boolean;
    hasImage?: boolean;
}

export interface FriendEvent extends BaseEventProperties {
    category: 'Friend';
    action: 'added' | 'removed';
    method?: 'search' | 'invitation' | 'group';
    hadUnsettledDebts?: boolean;
}

export interface DashboardEvent extends BaseEventProperties {
    category: 'Dashboard';
    action: 'feature_used' | 'balance_checked' | 'view_toggled';
    feature?: string;
    hasDebts?: boolean;
    debtCount?: number;
}

export interface SettingsEvent extends BaseEventProperties {
    category: 'Settings';
    action: 'changed' | 'feature_enabled';
    setting?: string;
    value?: any;
}

export interface ReportEvent extends BaseEventProperties {
    category: 'Report';
    action: 'generated' | 'exported';
    reportType?: 'monthly' | 'yearly' | 'group' | 'custom';
    dateRangeDays?: number;
    exportFormat?: 'pdf' | 'csv' | 'json';
}

export interface ErrorEvent extends BaseEventProperties {
    category: 'Error';
    action: 'boundary_caught' | 'api_error' | 'validation_error';
    errorName?: string;
    errorMessage?: string;
    componentStack?: string;
    endpoint?: string;
    statusCode?: number;
}

export interface FeatureEvent extends BaseEventProperties {
    category: 'Feature';
    action: 'used' | 'discovered' | 'enabled';
    feature: string;
    value?: any;
}

export type AnalyticsEvent =
    | AuthEvent
    | ExpenseEvent
    | PaymentEvent
    | GroupEvent
    | FriendEvent
    | DashboardEvent
    | SettingsEvent
    | ReportEvent
    | ErrorEvent
    | FeatureEvent;
