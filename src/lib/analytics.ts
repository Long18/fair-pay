import { currentBuildInfo } from './build-info';
import { getAttributionEventProperties } from './utm';

/**
 * Analytics tracking utility
 * Supports multiple analytics providers (Google Analytics, Mixpanel, Amplitude, etc.)
 * Configured via environment variables
 */

export type AnalyticsProvider = 'ga4' | 'mixpanel' | 'amplitude' | 'none';

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

class Analytics {
  private provider: AnalyticsProvider = 'none';
  private isInitialized = false;

  constructor() {
    // Determine provider from environment
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      this.provider = 'ga4';
    } else if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      this.provider = 'mixpanel';
    } else if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
      this.provider = 'amplitude';
    }
  }

  private enrichProperties(properties?: Record<string, any>) {
    return {
      ...getAttributionEventProperties(),
      ...properties,
      app_version: currentBuildInfo.version,
      app_channel: currentBuildInfo.channel,
      commit_sha: currentBuildInfo.commitSha ?? undefined,
    };
  }

  /**
   * Initialize analytics provider
   * Call this once in your app entry point
   */
  init() {
    if (this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        this.initGoogleAnalytics();
        break;
      case 'mixpanel':
        this.initMixpanel();
        break;
      case 'amplitude':
        this.initAmplitude();
        break;
    }

    this.isInitialized = true;
  }

  private initGoogleAnalytics() {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    const gtag = (...args: any[]) => {
      (window as any).dataLayer.push(...args);
    };
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false, // We'll track page views manually
    });
  }

  private initMixpanel() {
    // Placeholder for Mixpanel initialization
  }

  private initAmplitude() {
    // Placeholder for Amplitude initialization
  }

  /**
   * Track a custom event
   */
  track(event: AnalyticsEvent) {
    if (!this.isInitialized || this.provider === 'none') {
      return;
    }

    switch (this.provider) {
      case 'ga4':
        this.trackGA4(event);
        break;
      case 'mixpanel':
        this.trackMixpanel(event);
        break;
      case 'amplitude':
        this.trackAmplitude(event);
        break;
    }
  }

  private trackGA4(event: AnalyticsEvent) {
    if (!(window as any).gtag) return;

    (window as any).gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...this.enrichProperties(event.properties),
    });
  }

  private trackMixpanel(_event: AnalyticsEvent) {
    // Placeholder for Mixpanel tracking
  }

  private trackAmplitude(_event: AnalyticsEvent) {
    // Placeholder for Amplitude tracking
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string) {
    if (!this.isInitialized || this.provider === 'none') {
      return;
    }

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('event', 'page_view', {
            page_path: path,
            page_title: title,
            ...this.enrichProperties(),
          });
        }
        break;
      case 'mixpanel':
        break;
      case 'amplitude':
        break;
    }
  }

  /**
   * Set user properties
   */
  setUser(userId: string, properties?: Record<string, any>) {
    if (!this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('set', 'user_properties', {
            user_id: userId,
            ...properties,
          });
        }
        break;
      case 'mixpanel':
        break;
      case 'amplitude':
        break;
    }
  }

  /**
   * Clear user data on logout
   */
  clearUser() {
    if (!this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('set', 'user_properties', {
            user_id: undefined,
          });
        }
        break;
      case 'mixpanel':
        break;
      case 'amplitude':
        break;
    }
  }
}

// Singleton instance
export const analytics = new Analytics();
