import type {
    AuthEvent,
    ExpenseEvent,
    PaymentEvent,
    GroupEvent,
    FriendEvent,
    DashboardEvent,
    SettingsEvent,
    ReportEvent,
    ErrorEvent,
    FeatureEvent,
} from './types';
import { analyticsManager } from './instance';

export class AuthTracker {
    static login(method: 'email' | 'oauth' = 'email', provider?: 'google'): void {
        const event: AuthEvent = {
            category: 'Auth',
            action: 'login',
            method,
            provider,
        };
        analyticsManager.trackEvent(event);
    }

    static logout(): void {
        const event: AuthEvent = {
            category: 'Auth',
            action: 'logout',
        };
        analyticsManager.trackEvent(event);
    }

    static register(method: 'email' | 'oauth' = 'email'): void {
        const event: AuthEvent = {
            category: 'Auth',
            action: 'register',
            method,
        };
        analyticsManager.trackEvent(event);
    }
}

export class ExpenseTracker {
    static created(data: {
        amount: number;
        currency: string;
        splitMethod: 'equal' | 'percentage' | 'exact' | 'shares';
        participantCount: number;
        hasReceipt: boolean;
        context: 'group' | 'friend';
    }): void {
        const event: ExpenseEvent = {
            category: 'Expense',
            action: 'created',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static edited(data: {
        amount?: number;
        currency?: string;
        splitMethod?: 'equal' | 'percentage' | 'exact' | 'shares';
        participantCount?: number;
    }): void {
        const event: ExpenseEvent = {
            category: 'Expense',
            action: 'edited',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static deleted(): void {
        const event: ExpenseEvent = {
            category: 'Expense',
            action: 'deleted',
        };
        analyticsManager.trackEvent(event);
    }

    static settled(data: { amount: number; currency: string }): void {
        const event: ExpenseEvent = {
            category: 'Expense',
            action: 'settled',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }
}

export class PaymentTracker {
    static recorded(data: {
        amount: number;
        currency: string;
        paymentMethod: string;
        hasProof: boolean;
        context: 'group' | 'friend';
    }): void {
        const event: PaymentEvent = {
            category: 'Payment',
            action: 'recorded',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static edited(data: {
        amount?: number;
        currency?: string;
        paymentMethod?: string;
    }): void {
        const event: PaymentEvent = {
            category: 'Payment',
            action: 'edited',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static deleted(): void {
        const event: PaymentEvent = {
            category: 'Payment',
            action: 'deleted',
        };
        analyticsManager.trackEvent(event);
    }
}

export class GroupTracker {
    static created(data: {
        memberCount: number;
        hasDescription: boolean;
        hasImage: boolean;
    }): void {
        const event: GroupEvent = {
            category: 'Group',
            action: 'created',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static joined(data: { memberCount: number }): void {
        const event: GroupEvent = {
            category: 'Group',
            action: 'joined',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static left(): void {
        const event: GroupEvent = {
            category: 'Group',
            action: 'left',
        };
        analyticsManager.trackEvent(event);
    }

    static edited(): void {
        const event: GroupEvent = {
            category: 'Group',
            action: 'edited',
        };
        analyticsManager.trackEvent(event);
    }

    static deleted(): void {
        const event: GroupEvent = {
            category: 'Group',
            action: 'deleted',
        };
        analyticsManager.trackEvent(event);
    }
}

export class FriendTracker {
    static added(method: 'search' | 'invitation' | 'group' = 'search'): void {
        const event: FriendEvent = {
            category: 'Friend',
            action: 'added',
            method,
        };
        analyticsManager.trackEvent(event);
    }

    static removed(hadUnsettledDebts: boolean = false): void {
        const event: FriendEvent = {
            category: 'Friend',
            action: 'removed',
            hadUnsettledDebts,
        };
        analyticsManager.trackEvent(event);
    }
}

export class DashboardTracker {
    static featureUsed(feature: string): void {
        const event: DashboardEvent = {
            category: 'Dashboard',
            action: 'feature_used',
            feature,
        };
        analyticsManager.trackEvent(event);
    }

    static balanceChecked(data: { hasDebts: boolean; debtCount: number }): void {
        const event: DashboardEvent = {
            category: 'Dashboard',
            action: 'balance_checked',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static viewToggled(feature: string): void {
        const event: DashboardEvent = {
            category: 'Dashboard',
            action: 'view_toggled',
            feature,
        };
        analyticsManager.trackEvent(event);
    }
}

export class SettingsTracker {
    static changed(setting: string, value: any): void {
        const event: SettingsEvent = {
            category: 'Settings',
            action: 'changed',
            setting,
            value,
        };
        analyticsManager.trackEvent(event);
    }

    static featureEnabled(setting: string): void {
        const event: SettingsEvent = {
            category: 'Settings',
            action: 'feature_enabled',
            setting,
        };
        analyticsManager.trackEvent(event);
    }
}

export class ReportTracker {
    static generated(data: {
        reportType: 'monthly' | 'yearly' | 'group' | 'custom';
        dateRangeDays?: number;
    }): void {
        const event: ReportEvent = {
            category: 'Report',
            action: 'generated',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }

    static exported(data: {
        reportType?: 'monthly' | 'yearly' | 'group' | 'custom';
        exportFormat: 'pdf' | 'csv' | 'json';
    }): void {
        const event: ReportEvent = {
            category: 'Report',
            action: 'exported',
            ...data,
        };
        analyticsManager.trackEvent(event);
    }
}

export class ErrorTracker {
    static boundaryCaught(data: {
        errorName: string;
        errorMessage: string;
        componentStack?: string;
    }): void {
        const event: ErrorEvent = {
            category: 'Error',
            action: 'boundary_caught',
            errorName: data.errorName,
            errorMessage: data.errorMessage.substring(0, 100),
            componentStack: data.componentStack?.substring(0, 100),
        };
        analyticsManager.trackEvent(event);
    }

    static apiError(data: {
        endpoint: string;
        statusCode?: number;
        errorMessage?: string;
    }): void {
        const event: ErrorEvent = {
            category: 'Error',
            action: 'api_error',
            endpoint: data.endpoint,
            statusCode: data.statusCode,
            errorMessage: data.errorMessage?.substring(0, 100),
        };
        analyticsManager.trackEvent(event);
    }

    static validationError(data: { errorName: string; errorMessage: string }): void {
        const event: ErrorEvent = {
            category: 'Error',
            action: 'validation_error',
            errorName: data.errorName,
            errorMessage: data.errorMessage.substring(0, 100),
        };
        analyticsManager.trackEvent(event);
    }
}

export class FeatureTracker {
    static used(feature: string, value?: any): void {
        const event: FeatureEvent = {
            category: 'Feature',
            action: 'used',
            feature,
            value,
        };
        analyticsManager.trackEvent(event);
    }

    static discovered(feature: string): void {
        const event: FeatureEvent = {
            category: 'Feature',
            action: 'discovered',
            feature,
        };
        analyticsManager.trackEvent(event);
    }

    static enabled(feature: string, value?: any): void {
        const event: FeatureEvent = {
            category: 'Feature',
            action: 'enabled',
            feature,
            value,
        };
        analyticsManager.trackEvent(event);
    }
}
