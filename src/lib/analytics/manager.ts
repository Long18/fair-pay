import { currentBuildInfo } from "../build-info";
import type { AnalyticsProvider, AnalyticsConfig, AnalyticsEvent } from './types';

export class AnalyticsManager {
    private providers: Map<string, AnalyticsProvider> = new Map();
    private config: AnalyticsConfig;
    private userId?: string;
    private sessionId: string;

    constructor(config: AnalyticsConfig) {
        this.config = config;
        this.sessionId = this.generateSessionId();
    }

    registerProvider(name: string, provider: AnalyticsProvider): void {
        if (this.providers.has(name)) {
            console.warn(`[AnalyticsManager] Provider '${name}' already registered`);
            return;
        }

        this.providers.set(name, provider);

        if (this.config.debug) {
            console.log(`[AnalyticsManager] Registered provider: ${name}`);
        }
    }

    unregisterProvider(name: string): void {
        this.providers.delete(name);

        if (this.config.debug) {
            console.log(`[AnalyticsManager] Unregistered provider: ${name}`);
        }
    }

    init(): void {
        if (!this.config.enabled) {
            if (this.config.debug) {
                console.log('[AnalyticsManager] Analytics disabled');
            }
            return;
        }

        for (const [name, provider] of this.providers.entries()) {
            try {
                provider.init();
                if (this.config.debug) {
                    console.log(`[AnalyticsManager] Initialized provider: ${name}`);
                }
            } catch (error) {
                console.error(`[AnalyticsManager] Failed to initialize provider '${name}':`, error);
            }
        }
    }

    trackEvent(event: AnalyticsEvent): void {
        if (!this.config.enabled) {
            if (this.config.debug) {
                console.log('[AnalyticsManager] Event:', event);
            }
            return;
        }

        const enrichedEvent = this.enrichEvent(event);
        const eventName = this.formatEventName(event);

        for (const [name, provider] of this.providers.entries()) {
            try {
                if (!provider.isInitialized()) {
                    if (this.config.debug) {
                        console.warn(`[AnalyticsManager] Provider '${name}' not initialized, skipping event`);
                    }
                    continue;
                }

                provider.track(eventName, enrichedEvent);
            } catch (error) {
                console.error(`[AnalyticsManager] Failed to track event with provider '${name}':`, error);
            }
        }
    }

    pageView(path: string, title?: string): void {
        if (!this.config.enabled) return;

        for (const [name, provider] of this.providers.entries()) {
            try {
                if (!provider.isInitialized()) continue;
                provider.pageView(path, title);
            } catch (error) {
                console.error(`[AnalyticsManager] Failed to track page view with provider '${name}':`, error);
            }
        }
    }

    setUser(userId: string, properties?: Record<string, any>): void {
        this.userId = userId;

        if (!this.config.enabled) return;

        for (const [name, provider] of this.providers.entries()) {
            try {
                if (!provider.isInitialized()) continue;
                provider.setUser(userId, properties);
            } catch (error) {
                console.error(`[AnalyticsManager] Failed to set user with provider '${name}':`, error);
            }
        }
    }

    clearUser(): void {
        this.userId = undefined;

        if (!this.config.enabled) return;

        for (const [name, provider] of this.providers.entries()) {
            try {
                if (!provider.isInitialized()) continue;
                provider.clearUser();
            } catch (error) {
                console.error(`[AnalyticsManager] Failed to clear user with provider '${name}':`, error);
            }
        }
    }

    getProvidersStatus(): Record<string, boolean> {
        const status: Record<string, boolean> = {};

        for (const [name, provider] of this.providers.entries()) {
            status[name] = provider.isInitialized();
        }

        return status;
    }

    private enrichEvent(event: AnalyticsEvent): Record<string, any> {
        return {
            ...event,
            timestamp: event.timestamp || Date.now(),
            userId: this.userId,
            sessionId: this.sessionId,
            environment: this.config.environment,
            app_version: currentBuildInfo.version,
            app_channel: currentBuildInfo.channel,
            commit_sha: currentBuildInfo.commitSha,
        };
    }

    private formatEventName(event: AnalyticsEvent): string {
        return `${event.category.toLowerCase()}_${event.action}`;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
