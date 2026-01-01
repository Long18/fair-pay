import { track } from '@vercel/analytics';
import type { AnalyticsProvider, AnalyticsConfig } from '../types';

export class VercelAnalyticsProvider implements AnalyticsProvider {
    private initialized = false;
    private config: AnalyticsConfig;

    constructor(config: AnalyticsConfig) {
        this.config = config;
    }

    init(): void {
        if (this.initialized || !this.config.enabled) return;

        if (this.config.debug) {
            console.log('[VercelAnalytics] Initialized');
        }

        this.initialized = true;
    }

    track(eventName: string, properties?: Record<string, any>): void {
        if (!this.initialized || !this.config.enabled) {
            if (this.config.debug) {
                console.log('[VercelAnalytics] Track:', eventName, properties);
            }
            return;
        }

        try {
            track(eventName, this.sanitizeProperties(properties));
        } catch (error) {
            console.error('[VercelAnalytics] Track error:', error);
        }
    }

    pageView(path: string, title?: string): void {
        if (!this.initialized || !this.config.enabled) {
            if (this.config.debug) {
                console.log('[VercelAnalytics] Page view:', path, title);
            }
            return;
        }

        try {
            track('page_view', {
                path,
                title,
            });
        } catch (error) {
            console.error('[VercelAnalytics] Page view error:', error);
        }
    }

    setUser(userId: string, properties?: Record<string, any>): void {
        if (!this.initialized || !this.config.enabled) return;

        try {
            track('user_identified', {
                userId,
                ...this.sanitizeProperties(properties),
            });
        } catch (error) {
            console.error('[VercelAnalytics] Set user error:', error);
        }
    }

    clearUser(): void {
        if (!this.initialized || !this.config.enabled) return;

        try {
            track('user_cleared');
        } catch (error) {
            console.error('[VercelAnalytics] Clear user error:', error);
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
        if (!properties) return undefined;

        const sanitized: Record<string, any> = {};

        for (const [key, value] of Object.entries(properties)) {
            if (value === undefined || value === null) continue;

            if (typeof value === 'object' && !Array.isArray(value)) {
                sanitized[key] = JSON.stringify(value);
            } else if (typeof value === 'string' && value.length > 100) {
                sanitized[key] = value.substring(0, 100) + '...';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}
